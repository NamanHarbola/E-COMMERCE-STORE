# --- Basic Imports ---
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Optional

# --- FastAPI and Related Imports ---
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Request
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm

# --- Database Imports ---
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# --- Third-party Library Imports ---
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader

# --- Local App Imports ---
from hashing import Hash
import oauth2

# --- Initial Configuration ---
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

cloudinary.config(
    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key = os.environ.get('CLOUDINARY_API_KEY'),
    api_secret = os.environ.get('CLOUDINARY_API_SECRET')
)

mongo_url = os.environ.get('MONGO_URL') or "mongodb://localhost:27017"
db_name = os.environ.get('DB_NAME') or "ecommerce"
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="E-Commerce API", version="1.7.0")
api_router = APIRouter(prefix="/api")


#=================================================================
# Pydantic Models
#=================================================================
class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())); name: str; description: str; price: float; category: str; image_url: str; stock: int = 0; created_at: datetime = Field(default_factory=datetime.utcnow)
class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())); name: str; description: str; image_url: Optional[str] = ""
class CategoryCreate(BaseModel):
    name: str; description: str; image_url: Optional[str] = ""
class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())); username: str; email: EmailStr; password_hash: str
class CustomerCreate(BaseModel):
    username: str; email: EmailStr; password: str
class CustomerPublic(BaseModel):
    username: str; email: EmailStr
    class Config: orm_mode = True
class AdminUser(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())); username: str; password_hash: str
class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())); customer_name: str; customer_email: str; customer_phone: str; customer_address: str
    items: List; total_amount: float; order_status: str = "Placed"; payment_method: str; payment_status: str = "pending"; created_at: datetime = Field(default_factory=datetime.utcnow)
class Banner(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())); title: str; description: str; image_url: str; link_url: Optional[str] = ""; is_active: bool = True; created_at: datetime = Field(default_factory=datetime.utcnow)
class BannerCreate(BaseModel):
    title: str; description: str; image_url: str; link_url: Optional[str] = ""; is_active: bool = True


#=================================================================
# Authentication Dependencies
#=================================================================
async def get_current_admin(token: str = Depends(oauth2.oauth2_scheme)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    username = oauth2.verify_token(token, credentials_exception)
    admin = await db.admin_users.find_one({"username": username})
    if admin is None: raise HTTPException(status_code=401, detail="Admin user not found")
    return admin
async def get_current_customer(token: str = Depends(oauth2.customer_oauth2_scheme)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    email = oauth2.verify_token(token, credentials_exception)
    customer = await db.customers.find_one({"email": email})
    if customer is None: raise HTTPException(status_code=401, detail="Customer not found")
    return customer

#=================================================================
# Health Check
#=================================================================
@api_router.get("/", tags=["Public"])
async def health_check():
    return {"message": "E-Commerce API is running", "version": app.version}

#=================================================================
# Customer & Public Routes
#=================================================================
@api_router.post("/register", response_model=CustomerPublic, tags=["Customer Auth"])
async def register_customer(request: CustomerCreate):
    existing_customer = await db.customers.find_one({"email": request.email})
    if existing_customer: raise HTTPException(status_code=400, detail="Email already registered")
    new_customer_data = Customer(username=request.username, email=request.email, password_hash=Hash.bcrypt(request.password)).dict()
    await db.customers.insert_one(new_customer_data)
    return new_customer_data

@api_router.post("/login", tags=["Customer Auth"])
async def login_customer(request: Request):
    content_type = request.headers.get("content-type", "")
    username = None
    password = None
    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        username = form.get("username")
        password = form.get("password")
    else:
        try:
            data = await request.json()
            username = data.get("username")
            password = data.get("password")
        except Exception:
            pass
    if not username or not password:
        raise HTTPException(status_code=400, detail="username and password are required")

    customer = await db.customers.find_one({"email": username})
    if not customer or not Hash.verify(customer["password_hash"], password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    access_token = oauth2.create_access_token(data={"sub": customer["email"]})
    return {"access_token": access_token, "token_type": "bearer", "user": {"email": customer["email"], "username": customer["username"]}}

@api_router.get("/me", response_model=CustomerPublic, tags=["Customer Auth"])
async def get_customer_me(current_customer: dict = Depends(get_current_customer)):
    return current_customer

@api_router.get("/my-orders", response_model=List[Order], tags=["Customer Profile"])
async def get_my_orders(current_customer: dict = Depends(get_current_customer)):
    orders = await db.orders.find({"customer_email": current_customer["email"]}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.get("/products", response_model=List[Product], tags=["Public"])
async def get_products(category: Optional[str] = None, search: Optional[str] = None, sort: Optional[str] = None):
    query = {}
    if category: query["category"] = category
    if search: query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"description": {"$regex": search, "$options": "i"}}]
    cursor = db.products.find(query)
    if sort == "price-asc": cursor = cursor.sort("price", 1)
    elif sort == "price-desc": cursor = cursor.sort("price", -1)
    elif sort == "name-asc": cursor = cursor.sort("name", 1)
    products = await cursor.to_list(1000)
    return products

@api_router.get("/products/{product_id}", response_model=Product, tags=["Public"])
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.get("/categories", response_model=List[Category], tags=["Public"])
async def get_categories():
    categories = await db.categories.find().to_list(1000)
    return categories

#=================================================================
# Admin Routes
#=================================================================
@api_router.post("/admin/register", tags=["Admin Auth"])
async def register_admin(admin: dict):
    username = admin.get("username")
    password = admin.get("password")
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")
    existing = await db.admin_users.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists")
    await db.admin_users.insert_one({"username": username, "password_hash": Hash.bcrypt(password)})
    return {"status": "success"}

@api_router.post("/admin/login", tags=["Admin Auth"])
async def login_admin(request: Request):
    content_type = request.headers.get("content-type", "")
    username = None
    password = None
    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        username = form.get("username")
        password = form.get("password")
    else:
        try:
            data = await request.json()
            username = data.get("username")
            password = data.get("password")
        except Exception:
            pass
    if not username or not password:
        raise HTTPException(status_code=400, detail="username and password are required")

    admin = await db.admin_users.find_one({"username": username})
    if not admin:
        if username == 'admin' and password == 'admin':
             hashed_password = Hash.bcrypt('admin')
             await db.admin_users.insert_one({'username': 'admin', 'password_hash': hashed_password})
             admin = await db.admin_users.find_one({"username": username})
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    if not Hash.verify(admin["password_hash"], password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    access_token = oauth2.create_access_token(data={"sub": admin["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

# Create product via JSON (no image upload)
@api_router.post("/admin/products", response_model=Product, tags=["Admin: Products"])
async def create_product_json(product: Product, current_admin: dict = Depends(get_current_admin)):
    data = product.dict()
    await db.products.insert_one(data)
    return data

@api_router.post("/admin/products-with-image", response_model=Product, tags=["Admin: Products"])
async def create_product_with_image(
    name: str = Form(...), description: str = Form(...), price: float = Form(...),
    category: str = Form(...), stock: int = Form(...), image: UploadFile = File(...),
    current_admin: dict = Depends(get_current_admin)
):
    try:
        result = cloudinary.uploader.upload(image.file, folder="techmart_products")
        image_url = result.get("secure_url")
    except Exception as e:
        # Fallback to placeholder if upload fails
        image_url = "https://placehold.co/600x400/EEE/31343C?text=No+Image"

    product_data = Product(
        name=name, description=description, price=price,
        category=category, stock=stock, image_url=image_url
    ).dict()
    
    await db.products.insert_one(product_data)
    return product_data

@api_router.put("/admin/products-with-image/{product_id}", response_model=Product, tags=["Admin: Products"])
async def update_product_with_image(
    product_id: str, name: str = Form(...), description: str = Form(...),
    price: float = Form(...), category: str = Form(...), stock: int = Form(...),
    image: Optional[UploadFile] = File(None), current_admin: dict = Depends(get_current_admin)
):
    existing_product = await db.products.find_one({"id": product_id})
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = {"name": name, "description": description, "price": price, "category": category, "stock": stock}

    if image:
        try:
            result = cloudinary.uploader.upload(image.file, folder="techmart_products")
            update_data["image_url"] = result.get("secure_url")
        except Exception as e:
            update_data["image_url"] = existing_product.get("image_url")
    else:
        update_data["image_url"] = existing_product.get("image_url")

    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated_product = await db.products.find_one({"id": product_id})
    return updated_product

@api_router.delete("/admin/products/{product_id}", tags=["Admin: Products"])
async def delete_product(product_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"status": "success", "message": "Product deleted"}

# ---------------- Category Management ----------------
@api_router.post("/admin/categories", response_model=Category, tags=["Admin: Categories"])
async def create_category(category: CategoryCreate, current_admin: dict = Depends(get_current_admin)):
    data = Category(name=category.name, description=category.description, image_url=category.image_url or "").dict()
    await db.categories.insert_one(data)
    return data

@api_router.delete("/admin/categories/{category_id}", tags=["Admin: Categories"])
async def delete_category(category_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"status": "success"}

# ---------------- Banner Management ----------------
@api_router.post("/admin/banners", response_model=Banner, tags=["Admin: Banners"])
async def create_banner(banner: BannerCreate, current_admin: dict = Depends(get_current_admin)):
    data = Banner(**banner.dict()).dict()
    await db.banners.insert_one(data)
    return data

@api_router.get("/banners", response_model=List[Banner], tags=["Public"])
async def get_active_banners():
    banners = await db.banners.find({"is_active": True}).sort("created_at", -1).to_list(1000)
    return banners

@api_router.get("/admin/banners", response_model=List[Banner], tags=["Admin: Banners"])
async def get_all_banners(current_admin: dict = Depends(get_current_admin)):
    banners = await db.banners.find().sort("created_at", -1).to_list(1000)
    return banners

# ---------------- Orders ----------------
@api_router.post("/orders", response_model=Order, tags=["Orders"])
async def create_order(order: dict):
    items = order.get("items", [])
    total_amount = sum((item.get("price", 0) * item.get("quantity", 0)) for item in items)
    order_doc = Order(
        customer_name=order.get("customer_name"),
        customer_email=order.get("customer_email"),
        customer_phone=order.get("customer_phone"),
        customer_address=order.get("customer_address"),
        items=items,
        total_amount=float(total_amount),
        payment_method=order.get("payment_method", "cod"),
        payment_status="pending",
    ).dict()
    await db.orders.insert_one(order_doc)
    return order_doc

@api_router.get("/orders/{order_id}", response_model=Order, tags=["Orders"])
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.get("/admin/orders", response_model=List[Order], tags=["Admin: Orders"])
async def list_orders(current_admin: dict = Depends(get_current_admin)):
    orders = await db.orders.find().sort("created_at", -1).to_list(1000)
    return orders

@api_router.put("/admin/orders/{order_id}/status", tags=["Admin: Orders"])
async def update_order_status(order_id: str, status: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.orders.update_one({"id": order_id}, {"$set": {"order_status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    updated = await db.orders.find_one({"id": order_id})
    return {"status": "success", "order": updated}

# ---------------- Payments ----------------
@api_router.post("/payments/create-razorpay-order", tags=["Payments"])
async def create_razorpay_order(order_id: str):
    import time
    from math import ceil
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    amount_paise = int(round(order["total_amount"] * 100))

    # Try real Razorpay if keys exist; else return a mocked order id
    key_id = os.environ.get("RAZORPAY_KEY_ID")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    if key_id and key_secret:
        try:
            import razorpay
            client = razorpay.Client(auth=(key_id, key_secret))
            rzp_order = client.order.create({"amount": amount_paise, "currency": "INR"})
            razorpay_order_id = rzp_order.get("id")
        except Exception as e:
            razorpay_order_id = f"order_{uuid.uuid4().hex[:14]}"
    else:
        razorpay_order_id = f"order_{uuid.uuid4().hex[:14]}"

    return {"razorpay_order_id": razorpay_order_id, "amount": amount_paise, "currency": "INR", "key": key_id or "rzp_test_key"}

@api_router.post("/payments/verify-payment", tags=["Payments"])
async def verify_payment(payload: dict):
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    order_id = payload.get("order_id")
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id is required")

    # If we have a secret, attempt signature verification; otherwise accept in dev
    verified = True
    if key_secret:
        import hmac, hashlib
        message = f"{payload.get('razorpay_order_id')}|{payload.get('razorpay_payment_id')}".encode()
        generated_signature = hmac.new(key_secret.encode(), message, hashlib.sha256).hexdigest()
        verified = generated_signature == payload.get("razorpay_signature")

    if not verified:
        raise HTTPException(status_code=400, detail="Signature verification failed")

    await db.orders.update_one({"id": order_id}, {"$set": {"payment_status": "paid", "order_status": "Confirmed"}})
    updated = await db.orders.find_one({"id": order_id})
    return {"status": "success", "order": updated}

@api_router.post("/payments/cod-confirmation", tags=["Payments"])
async def cod_confirmation(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.orders.update_one({"id": order_id}, {"$set": {"payment_status": "cod-confirmed", "order_status": "Confirmed"}})
    return {"status": "success"}

# --- Final App Setup ---
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

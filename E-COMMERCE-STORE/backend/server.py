# --- Basic Imports ---
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Optional

# --- FastAPI and Related Imports ---
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
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

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')
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
    id: str = Field(default_factory=lambda: str(uuid.uuid4())); name: str; description: str
class CategoryCreate(BaseModel):
    name: str; description: str
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
async def login_customer(request: OAuth2PasswordRequestForm = Depends()):
    customer = await db.customers.find_one({"email": request.username})
    if not customer or not Hash.verify(customer["password_hash"], request.password): raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
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
@api_router.post("/admin/login", tags=["Admin Auth"])
async def login_admin(request: OAuth2PasswordRequestForm = Depends()):
    admin = await db.admin_users.find_one({"username": request.username})
    if not admin:
        if request.username == 'admin' and request.password == 'admin':
             hashed_password = Hash.bcrypt('admin')
             await db.admin_users.insert_one({'username': 'admin', 'password_hash': hashed_password})
             admin = await db.admin_users.find_one({"username": request.username})
        else: raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    if not Hash.verify(admin["password_hash"], request.password): raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    access_token = oauth2.create_access_token(data={"sub": admin["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

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
        raise HTTPException(status_code=500, detail=f"Image upload failed: {e}")

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
            raise HTTPException(status_code=500, detail=f"Image upload failed: {e}")
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

# --- Final App Setup ---
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

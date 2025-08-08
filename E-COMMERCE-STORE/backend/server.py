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

# --- Cloudinary Configuration ---
cloudinary.config(
    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key = os.environ.get('CLOUDINARY_API_KEY'),
    api_secret = os.environ.get('CLOUDINARY_API_SECRET')
)

# --- Database Connection ---
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# --- FastAPI App Initialization ---
app = FastAPI(title="E-Commerce API", version="1.6.0")
# We no longer need to serve a local /uploads directory
api_router = APIRouter(prefix="/api")


#=================================================================
# Pydantic Models (No changes needed)
#=================================================================
class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str; description: str; price: float; category: str; image_url: str; stock: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
# ... (Other models remain the same)
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
    id: str = Field(default_factory=lambda: str(uuid.uuid4())); customer_name: str; customer_email: str
    items: List; total_amount: float; order_status: str = "Placed"; created_at: datetime = Field(default_factory=datetime.utcnow)


#=================================================================
# Authentication Dependencies (No changes needed)
#=================================================================
async def get_current_admin(token: str = Depends(oauth2.oauth2_scheme)):
    # ... (logic remains the same)
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    username = oauth2.verify_token(token, credentials_exception)
    admin = await db.admin_users.find_one({"username": username})
    if admin is None: raise HTTPException(status_code=401, detail="Admin user not found")
    return admin
# ... (get_current_customer remains the same)
async def get_current_customer(token: str = Depends(oauth2.customer_oauth2_scheme)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    email = oauth2.verify_token(token, credentials_exception)
    customer = await db.customers.find_one({"email": email})
    if customer is None: raise HTTPException(status_code=401, detail="Customer not found")
    return customer

#=================================================================
# Customer & Public Routes (No changes needed)
#=================================================================
# ... (All your existing public and customer routes remain the same)
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
# ... (and so on for other public routes)
@api_router.get("/categories", response_model=List[Category], tags=["Public"])
async def get_categories():
    categories = await db.categories.find().to_list(1000)
    return categories

#=================================================================
# Admin Routes (UPDATED)
#=================================================================
# ... (Admin login, orders, and categories routes remain the same)
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

# --- Admin Product Management (UPDATED FOR CLOUDINARY) ---
@api_router.post("/admin/products-with-image", response_model=Product, tags=["Admin: Products"])
async def create_product_with_image(
    name: str = Form(...), description: str = Form(...), price: float = Form(...),
    category: str = Form(...), stock: int = Form(...), image: UploadFile = File(...),
    current_admin: dict = Depends(get_current_admin)
):
    try:
        # Upload image to Cloudinary
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

# ... (Other admin routes like delete product, categories, orders)
@api_router.delete("/admin/products/{product_id}", tags=["Admin: Products"])
async def delete_product(product_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"status": "success", "message": "Product deleted"}
@api_router.post("/admin/categories", response_model=Category, tags=["Admin: Categories"])
async def create_category(category: CategoryCreate, current_admin: dict = Depends(get_current_admin)):
    category_data = Category(name=category.name, description=category.description).dict()
    await db.categories.insert_one(category_data)
    return category_data
@api_router.delete("/admin/categories/{category_id}", tags=["Admin: Categories"])
async def delete_category(category_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Category not found")
    return {"status": "success", "message": "Category deleted"}


# --- Final App Setup ---
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

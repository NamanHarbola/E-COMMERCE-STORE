from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import razorpay
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
import jwt
from PIL import Image
import shutil
import json
import qrcode
import base64
from io import BytesIO
import aiofiles

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Razorpay configuration
razorpay_client = razorpay.Client(auth=(os.environ.get('RAZORPAY_KEY_ID'), os.environ.get('RAZORPAY_KEY_SECRET')))

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your-secret-key-here"  # In production, use a secure secret
ALGORITHM = "HS256"

# Create the main app without a prefix
app = FastAPI(title="E-Commerce API", version="1.0.0")

# Mount static files for uploaded images
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    image_url: str
    stock: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    image_url: str = ""
    stock: int = 0

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    image_url: str = ""

class CategoryCreate(BaseModel):
    name: str
    description: str
    image_url: str = ""

class CartItem(BaseModel):
    product_id: str
    quantity: int
    price: float

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_address: str
    items: List[CartItem]
    total_amount: float
    payment_method: str  # "razorpay", "cod", "upi_qr"
    payment_status: str = "pending"  # "pending", "paid", "failed", "cod"
    order_status: str = "placed"  # "placed", "confirmed", "shipped", "delivered", "cancelled"
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OrderCreate(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_address: str
    items: List[CartItem]
    payment_method: str

class AdminUser(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AdminUserCreate(BaseModel):
    username: str
    email: str
    password: str

class AdminLogin(BaseModel):
    username: str
    password: str

class Banner(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    image_url: str
    link_url: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BannerCreate(BaseModel):
    title: str
    description: str
    image_url: str
    link_url: str = ""
    is_active: bool = True

class RazorpayOrder(BaseModel):
    amount: int  # Amount in paise
    currency: str = "INR"
    receipt: str

class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_id: str

class UPIPaymentRequest(BaseModel):
    order_id: str
    upi_id: str = "techmart@paytm"  # Default UPI ID for the store

# Utility functions
async def save_uploaded_file(file: UploadFile, upload_dir: Path) -> str:
    """Save uploaded file and return the file path"""
    file_extension = file.filename.split('.')[-1].lower()
    if file_extension not in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
        raise HTTPException(status_code=400, detail="Invalid file format. Only JPG, PNG, GIF, WEBP allowed.")
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = upload_dir / unique_filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Resize image if it's too large
    try:
        with Image.open(file_path) as img:
            # Resize if width > 1200px
            if img.width > 1200:
                ratio = 1200 / img.width
                new_height = int(img.height * ratio)
                img = img.resize((1200, new_height), Image.Resampling.LANCZOS)
                img.save(file_path, optimize=True, quality=85)
    except Exception as e:
        print(f"Error resizing image: {e}")
    
    return f"/uploads/{unique_filename}"

def generate_upi_qr_code(upi_id: str, amount: float, order_id: str, customer_name: str = "Customer") -> str:
    """Generate UPI QR code and return base64 encoded image"""
    # UPI URL format as per NPCI guidelines
    upi_url = f"upi://pay?pa={upi_id}&pn=TechMart&am={amount:.2f}&tn=Order#{order_id}&cu=INR"
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(upi_url)
    qr.make(fit=True)
    
    # Create QR code image
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = BytesIO()
    qr_img.save(buffer, format='PNG')
    buffer.seek(0)
    
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{qr_base64}"
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        admin = await db.admin_users.find_one({"username": username})
        if admin is None:
            raise HTTPException(status_code=401, detail="Admin user not found")
        return admin
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Public Product Routes
@api_router.get("/products", response_model=List[Product])
async def get_products(category: Optional[str] = None, search: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.products.find(query).to_list(1000)
    return [Product(**product) for product in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find().to_list(1000)
    return [Category(**category) for category in categories]

@api_router.get("/banners", response_model=List[Banner])
async def get_active_banners():
    banners = await db.banners.find({"is_active": True}).to_list(1000)
    return [Banner(**banner) for banner in banners]

# Order Routes
@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    # Calculate total amount
    total_amount = sum(item.price * item.quantity for item in order.items)
    
    order_data = order.dict()
    order_data["total_amount"] = total_amount
    order_obj = Order(**order_data)
    
    await db.orders.insert_one(order_obj.dict())
    return order_obj

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

# Razorpay Payment Routes
@api_router.post("/payments/create-razorpay-order")
async def create_razorpay_order(order_id: str):
    # Get order from database
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create Razorpay order
    amount_in_paise = int(order["total_amount"] * 100)
    razorpay_order = razorpay_client.order.create({
        "amount": amount_in_paise,
        "currency": "INR",
        "receipt": order_id,
        "payment_capture": 1
    })
    
    # Update order with Razorpay order ID
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"razorpay_order_id": razorpay_order["id"]}}
    )
    
    return {
        "razorpay_order_id": razorpay_order["id"],
        "amount": razorpay_order["amount"],
        "currency": razorpay_order["currency"],
        "key": os.environ.get('RAZORPAY_KEY_ID')
    }

@api_router.post("/payments/verify-payment")
async def verify_payment(payment_data: PaymentVerification):
    try:
        # Verify payment signature
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': payment_data.razorpay_order_id,
            'razorpay_payment_id': payment_data.razorpay_payment_id,
            'razorpay_signature': payment_data.razorpay_signature
        })
        
        # Update order status
        await db.orders.update_one(
            {"id": payment_data.order_id},
            {"$set": {
                "payment_status": "paid",
                "order_status": "confirmed",
                "razorpay_payment_id": payment_data.razorpay_payment_id
            }}
        )
        
        return {"status": "success", "message": "Payment verified successfully"}
    
    except Exception as e:
        await db.orders.update_one(
            {"id": payment_data.order_id},
            {"$set": {"payment_status": "failed"}}
        )
        raise HTTPException(status_code=400, detail="Payment verification failed")

@api_router.post("/payments/cod-confirmation")
async def confirm_cod_order(order_id: str):
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "payment_status": "cod",
            "order_status": "confirmed"
        }}
    )
    return {"status": "success", "message": "COD order confirmed"}

@api_router.post("/payments/generate-upi-qr")
async def generate_upi_qr(upi_request: UPIPaymentRequest):
    """Generate UPI QR code for order payment"""
    # Get order from database
    order = await db.orders.find_one({"id": upi_request.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    try:
        # Generate UPI QR code
        qr_code_data = generate_upi_qr_code(
            upi_id=upi_request.upi_id,
            amount=order["total_amount"],
            order_id=upi_request.order_id,
            customer_name=order["customer_name"]
        )
        
        return {
            "qr_code": qr_code_data,
            "upi_id": upi_request.upi_id,
            "amount": order["total_amount"],
            "order_id": upi_request.order_id,
            "instructions": [
                "1. Open any UPI app (PhonePe, Paytm, Google Pay, etc.)",
                "2. Scan this QR code using your UPI app",
                "3. Verify the amount and merchant details",
                "4. Complete the payment",
                "5. Your order will be confirmed automatically"
            ]
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error generating UPI QR code: {str(e)}")

@api_router.post("/payments/confirm-upi-payment")
async def confirm_upi_payment(order_id: str, transaction_ref: str = ""):
    """Manually confirm UPI payment (in real implementation, this would be automated via webhook)"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "payment_status": "paid",
            "order_status": "confirmed",
            "transaction_reference": transaction_ref
        }}
    )
    
    return {"status": "success", "message": "UPI payment confirmed"}

# Admin Authentication Routes
@api_router.post("/admin/register")
async def register_admin(admin: AdminUserCreate):
    # Check if admin exists
    existing_admin = await db.admin_users.find_one({"username": admin.username})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin username already exists")
    
    existing_email = await db.admin_users.find_one({"email": admin.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Admin email already exists")
    
    # Create admin
    admin_data = admin.dict()
    admin_data["password_hash"] = get_password_hash(admin.password)
    del admin_data["password"]
    admin_obj = AdminUser(**admin_data)
    
    await db.admin_users.insert_one(admin_obj.dict())
    return {"status": "success", "message": "Admin registered successfully"}

@api_router.post("/admin/login")
async def login_admin(login_data: AdminLogin):
    admin = await db.admin_users.find_one({"username": login_data.username})
    if not admin or not verify_password(login_data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": admin["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

# Admin Product Management
@api_router.post("/admin/products", response_model=Product)
async def create_product(product: ProductCreate, current_admin=Depends(get_current_admin)):
    product_obj = Product(**product.dict())
    await db.products.insert_one(product_obj.dict())
    return product_obj

@api_router.post("/admin/products-with-image")
async def create_product_with_image(
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    category: str = Form(...),
    stock: int = Form(...),
    image: UploadFile = File(...),
    current_admin=Depends(get_current_admin)
):
    try:
        # Save uploaded image
        image_url = await save_uploaded_file(image, UPLOAD_DIR)
        
        # Create product
        product_data = {
            "name": name,
            "description": description,
            "price": price,
            "category": category,
            "stock": stock,
            "image_url": image_url
        }
        
        product_obj = Product(**product_data)
        await db.products.insert_one(product_obj.dict())
        return product_obj
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating product: {str(e)}")

@api_router.put("/admin/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductCreate, current_admin=Depends(get_current_admin)):
    existing_product = await db.products.find_one({"id": product_id})
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product_data = product.dict()
    product_data["id"] = product_id
    product_data["created_at"] = existing_product["created_at"]
    
    await db.products.update_one({"id": product_id}, {"$set": product_data})
    return Product(**product_data)

@api_router.put("/admin/products-with-image/{product_id}")
async def update_product_with_image(
    product_id: str,
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    category: str = Form(...),
    stock: int = Form(...),
    image: Optional[UploadFile] = File(None),
    current_admin=Depends(get_current_admin)
):
    existing_product = await db.products.find_one({"id": product_id})
    if not existing_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    try:
        # Prepare update data
        product_data = {
            "name": name,
            "description": description,
            "price": price,
            "category": category,
            "stock": stock,
            "id": product_id,
            "created_at": existing_product["created_at"]
        }
        
        # Update image if provided
        if image:
            image_url = await save_uploaded_file(image, UPLOAD_DIR)
            product_data["image_url"] = image_url
        else:
            product_data["image_url"] = existing_product.get("image_url", "")
        
        await db.products.update_one({"id": product_id}, {"$set": product_data})
        return Product(**product_data)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating product: {str(e)}")

@api_router.post("/admin/upload-image")
async def upload_image(image: UploadFile = File(...), current_admin=Depends(get_current_admin)):
    """Upload image and return the URL"""
    try:
        image_url = await save_uploaded_file(image, UPLOAD_DIR)
        return {"image_url": image_url, "message": "Image uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error uploading image: {str(e)}")

@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, current_admin=Depends(get_current_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"status": "success", "message": "Product deleted successfully"}

# Admin Category Management
@api_router.post("/admin/categories", response_model=Category)
async def create_category(category: CategoryCreate, current_admin=Depends(get_current_admin)):
    category_obj = Category(**category.dict())
    await db.categories.insert_one(category_obj.dict())
    return category_obj

@api_router.put("/admin/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category: CategoryCreate, current_admin=Depends(get_current_admin)):
    existing_category = await db.categories.find_one({"id": category_id})
    if not existing_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category_data = category.dict()
    category_data["id"] = category_id
    
    await db.categories.update_one({"id": category_id}, {"$set": category_data})
    return Category(**category_data)

@api_router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, current_admin=Depends(get_current_admin)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"status": "success", "message": "Category deleted successfully"}

# Admin Banner Management
@api_router.post("/admin/banners", response_model=Banner)
async def create_banner(banner: BannerCreate, current_admin=Depends(get_current_admin)):
    banner_obj = Banner(**banner.dict())
    await db.banners.insert_one(banner_obj.dict())
    return banner_obj

@api_router.put("/admin/banners/{banner_id}", response_model=Banner)
async def update_banner(banner_id: str, banner: BannerCreate, current_admin=Depends(get_current_admin)):
    existing_banner = await db.banners.find_one({"id": banner_id})
    if not existing_banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    banner_data = banner.dict()
    banner_data["id"] = banner_id
    banner_data["created_at"] = existing_banner["created_at"]
    
    await db.banners.update_one({"id": banner_id}, {"$set": banner_data})
    return Banner(**banner_data)

@api_router.delete("/admin/banners/{banner_id}")
async def delete_banner(banner_id: str, current_admin=Depends(get_current_admin)):
    result = await db.banners.delete_one({"id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"status": "success", "message": "Banner deleted successfully"}

@api_router.get("/admin/banners", response_model=List[Banner])
async def get_all_banners(current_admin=Depends(get_current_admin)):
    banners = await db.banners.find().to_list(1000)
    return [Banner(**banner) for banner in banners]

# Admin Order Management
@api_router.get("/admin/orders", response_model=List[Order])
async def get_all_orders(current_admin=Depends(get_current_admin)):
    orders = await db.orders.find().sort("created_at", -1).to_list(1000)
    return [Order(**order) for order in orders]

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, current_admin=Depends(get_current_admin)):
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"order_status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"status": "success", "message": "Order status updated"}

# Health check
@api_router.get("/")
async def root():
    return {"message": "E-Commerce API is running"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
#!/usr/bin/env python3
import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.append('/app/backend')

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import uuid
from datetime import datetime

# Load environment variables
load_dotenv('/app/backend/.env')

# Database connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def seed_database():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 Seeding database with sample data...")
    
    # Create categories
    categories = [
        {
            "id": str(uuid.uuid4()),
            "name": "Electronics",
            "description": "Electronic gadgets and devices",
            "image_url": "https://images.unsplash.com/photo-1603732551681-2e91159b9dc2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljc3xlbnwwfHx8Ymx1ZXwxNzU0NTYwMjg4fDA&ixlib=rb-4.1.0&q=85"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Home Appliances",
            "description": "Kitchen and home appliances",
            "image_url": "https://images.unsplash.com/photo-1656082352918-75e24cb6d06c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHxhcHBsaWFuY2VzfGVufDB8fHxibHVlfDE3NTQ1NjAyOTZ8MA&ixlib=rb-4.1.0&q=85"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Paints",
            "description": "Wall paints and painting supplies",
            "image_url": ""
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Hardware",
            "description": "Tools and hardware supplies",
            "image_url": ""
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Sanitary",
            "description": "Bathroom and sanitary fittings",
            "image_url": ""
        }
    ]
    
    # Clear existing categories and insert new ones
    await db.categories.delete_many({})
    await db.categories.insert_many(categories)
    print("✅ Categories created")
    
    # Create sample products
    products = [
        {
            "id": str(uuid.uuid4()),
            "name": "Samsung Galaxy Smartphone",
            "description": "Latest Samsung Galaxy smartphone with advanced features and camera",
            "price": 25999.00,
            "category": "Electronics",
            "image_url": "https://images.unsplash.com/photo-1614860243518-c12eb2fdf66c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwyfHxlbGVjdHJvbmljc3xlbnwwfHx8Ymx1ZXwxNzU0NTYwMjg4fDA&ixlib=rb-4.1.0&q=85",
            "stock": 50,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Sony Wireless Headphones",
            "description": "Premium noise-canceling wireless headphones with crystal clear sound",
            "price": 8999.00,
            "category": "Electronics",
            "image_url": "https://images.unsplash.com/photo-1614860243518-c12eb2fdf66c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwyfHxlbGVjdHJvbmljc3xlbnwwfHx8Ymx1ZXwxNzU0NTYwMjg4fDA&ixlib=rb-4.1.0&q=85",
            "stock": 30,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Dell Laptop",
            "description": "High-performance laptop with Intel i7 processor and 16GB RAM",
            "price": 65999.00,
            "category": "Electronics",
            "image_url": "https://images.unsplash.com/photo-1603732551681-2e91159b9dc2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljc3xlbnwwfHx8Ymx1ZXwxNzU0NTYwMjg4fDA&ixlib=rb-4.1.0&q=85",
            "stock": 20,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "LG Washing Machine",
            "description": "Fully automatic front-load washing machine with smart features",
            "price": 35999.00,
            "category": "Home Appliances",
            "image_url": "https://images.pexels.com/photos/8762342/pexels-photo-8762342.jpeg",
            "stock": 15,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Microwave Oven",
            "description": "Digital microwave oven with multiple cooking modes and timer",
            "price": 12999.00,
            "category": "Home Appliances",
            "image_url": "https://images.unsplash.com/photo-1656082352918-75e24cb6d06c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHxhcHBsaWFuY2VzfGVufDB8fHxibHVlfDE3NTQ1NjAyOTZ8MA&ixlib=rb-4.1.0&q=85",
            "stock": 25,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Asian Paints Royal",
            "description": "Premium interior wall paint with excellent coverage and durability",
            "price": 899.00,
            "category": "Paints",
            "image_url": "https://images.unsplash.com/photo-1562876782-f324b8ac8e4c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHw0fHxlbGVjdHJvbmljc3xlbnwwfHx8Ymx1ZXwxNzU0NTYwMjg4fDA&ixlib=rb-4.1.0&q=85",
            "stock": 100,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Drill Machine Set",
            "description": "Professional cordless drill machine with multiple bits and accessories",
            "price": 3499.00,
            "category": "Hardware",
            "image_url": "https://images.unsplash.com/photo-1562876782-f324b8ac8e4c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHw0fHxlbGVjdHJvbmljc3xlbnwwfHx8Ymx1ZXwxNzU0NTYwMjg4fDA&ixlib=rb-4.1.0&q=85",
            "stock": 40,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Premium Bathroom Faucet",
            "description": "Modern brass bathroom faucet with ceramic disc cartridge",
            "price": 2999.00,
            "category": "Sanitary",
            "image_url": "https://images.unsplash.com/photo-1603732551681-2e91159b9dc2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljc3xlbnwwfHx8Ymx1ZXwxNzU0NTYwMjg4fDA&ixlib=rb-4.1.0&q=85",
            "stock": 35,
            "created_at": datetime.utcnow()
        }
    ]
    
    # Clear existing products and insert new ones
    await db.products.delete_many({})
    await db.products.insert_many(products)
    print("✅ Products created")
    
    # Create sample banners
    banners = [
        {
            "id": str(uuid.uuid4()),
            "title": "Mega Sale - Up to 50% Off",
            "description": "Don't miss our biggest sale of the year! Electronics and appliances at unbeatable prices.",
            "image_url": "https://images.unsplash.com/photo-1603732551681-2e91159b9dc2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljc3xlbnwwfHx8Ymx1ZXwxNzU0NTYwMjg4fDA&ixlib=rb-4.1.0&q=85",
            "link_url": "/products?category=Electronics",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "New Home Appliances Collection",
            "description": "Upgrade your home with our latest collection of smart appliances.",
            "image_url": "https://images.unsplash.com/photo-1656082352918-75e24cb6d06c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHxhcHBsaWFuY2VzfGVufDB8fHxibHVlfDE3NTQ1NjAyOTZ8MA&ixlib=rb-4.1.0&q=85",
            "link_url": "/products?category=Home%20Appliances",
            "is_active": True,
            "created_at": datetime.utcnow()
        }
    ]
    
    # Clear existing banners and insert new ones
    await db.banners.delete_many({})
    await db.banners.insert_many(banners)
    print("✅ Banners created")
    
    print("\n🎉 Database seeded successfully!")
    print(f"📊 Created {len(categories)} categories, {len(products)} products, and {len(banners)} banners")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
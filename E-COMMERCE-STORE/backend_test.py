#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for E-commerce Application
Tests all backend APIs including authentication, products, categories, banners, orders, and payments
"""

import requests
import json
import uuid
from datetime import datetime
import time

# Configuration
BASE_URL = "https://313b1a52-72fe-4650-921d-3eacd62723dc.preview.emergentagent.com/api"
ADMIN_CREDENTIALS = {
    "username": "admin",
    "password": "admin123",
    "email": "admin@techmart.com"
}

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.admin_token = None
        self.test_results = []
        self.created_resources = {
            "products": [],
            "categories": [],
            "banners": [],
            "orders": []
        }
    
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, headers=None, params=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, params=params, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers, params=params, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, params=params, timeout=30)
            
            return response
        except requests.exceptions.RequestException as e:
            return None, str(e)
    
    def get_auth_headers(self):
        """Get authorization headers"""
        if self.admin_token:
            return {"Authorization": f"Bearer {self.admin_token}"}
        return {}
    
    def test_health_check(self):
        """Test API health check"""
        print("\n=== TESTING API HEALTH CHECK ===")
        response = self.make_request("GET", "/")
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if "message" in data:
                    self.log_test("API Health Check", True, "API is running successfully")
                    return True
                else:
                    self.log_test("API Health Check", False, "Unexpected response format", data)
            except:
                self.log_test("API Health Check", False, "Invalid JSON response", response.text)
        else:
            error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
            self.log_test("API Health Check", False, error_msg, response.text if response else "No response")
        
        return False
    
    def test_admin_authentication(self):
        """Test admin registration and login"""
        print("\n=== TESTING ADMIN AUTHENTICATION ===")
        
        # Test admin registration
        register_data = ADMIN_CREDENTIALS.copy()
        response = self.make_request("POST", "/admin/register", register_data)
        
        if response:
            if response.status_code == 200:
                self.log_test("Admin Registration", True, "Admin registered successfully")
            elif response.status_code == 400:
                try:
                    error_data = response.json()
                    if "already exists" in error_data.get("detail", ""):
                        self.log_test("Admin Registration", True, "Admin already exists (expected)")
                    else:
                        self.log_test("Admin Registration", False, f"Registration failed: {error_data.get('detail', 'Unknown error')}")
                except:
                    self.log_test("Admin Registration", False, f"Registration failed: {response.text}")
            else:
                self.log_test("Admin Registration", False, f"Registration failed: {response.status_code}", response.text)
        else:
            self.log_test("Admin Registration", False, "Connection error during registration")
            return False
        
        # Test admin login
        login_data = {
            "username": ADMIN_CREDENTIALS["username"],
            "password": ADMIN_CREDENTIALS["password"]
        }
        response = self.make_request("POST", "/admin/login", login_data)
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                if "access_token" in data:
                    self.admin_token = data["access_token"]
                    self.log_test("Admin Login", True, "Login successful, token received")
                    return True
                else:
                    self.log_test("Admin Login", False, "No access token in response", data)
            except:
                self.log_test("Admin Login", False, "Invalid JSON response", response.text)
        else:
            error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
            self.log_test("Admin Login", False, error_msg, response.text if response else "No response")
        
        return False
    
    def test_unauthorized_access(self):
        """Test unauthorized access to protected routes"""
        print("\n=== TESTING UNAUTHORIZED ACCESS ===")
        
        protected_endpoints = [
            ("POST", "/admin/products"),
            ("GET", "/admin/orders"),
            ("POST", "/admin/categories"),
            ("POST", "/admin/banners")
        ]
        
        for method, endpoint in protected_endpoints:
            response = self.make_request(method, endpoint, {"test": "data"})
            
            if response and response.status_code in [401, 403]:
                self.log_test(f"Unauthorized Access - {method} {endpoint}", True, f"Correctly rejected unauthorized request (HTTP {response.status_code})")
            else:
                status = response.status_code if response else "No response"
                self.log_test(f"Unauthorized Access - {method} {endpoint}", False, f"Expected 401/403, got {status}")
    
    def test_category_management(self):
        """Test category CRUD operations"""
        print("\n=== TESTING CATEGORY MANAGEMENT ===")
        
        if not self.admin_token:
            self.log_test("Category Management", False, "No admin token available")
            return False
        
        headers = self.get_auth_headers()
        
        # Test create category
        category_data = {
            "name": "Test Electronics",
            "description": "Test category for electronics",
            "image_url": "https://example.com/electronics.jpg"
        }
        
        response = self.make_request("POST", "/admin/categories", category_data, headers)
        
        if response and response.status_code == 200:
            try:
                category = response.json()
                category_id = category["id"]
                self.created_resources["categories"].append(category_id)
                self.log_test("Create Category", True, f"Category created with ID: {category_id}")
            except:
                self.log_test("Create Category", False, "Invalid response format", response.text)
                return False
        else:
            error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
            self.log_test("Create Category", False, error_msg, response.text if response else "No response")
            return False
        
        # Test get all categories (public endpoint)
        response = self.make_request("GET", "/categories")
        
        if response and response.status_code == 200:
            try:
                categories = response.json()
                if isinstance(categories, list):
                    self.log_test("Get Categories", True, f"Retrieved {len(categories)} categories")
                else:
                    self.log_test("Get Categories", False, "Response is not a list", categories)
            except:
                self.log_test("Get Categories", False, "Invalid JSON response", response.text)
        else:
            error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
            self.log_test("Get Categories", False, error_msg, response.text if response else "No response")
        
        return True
    
    def test_product_management(self):
        """Test product CRUD operations"""
        print("\n=== TESTING PRODUCT MANAGEMENT ===")
        
        if not self.admin_token:
            self.log_test("Product Management", False, "No admin token available")
            return False
        
        headers = self.get_auth_headers()
        
        # Test create product
        product_data = {
            "name": "Samsung Galaxy S24",
            "description": "Latest Samsung smartphone with advanced features",
            "price": 79999.99,
            "category": "Electronics",
            "image_url": "https://example.com/samsung-s24.jpg",
            "stock": 50
        }
        
        response = self.make_request("POST", "/admin/products", product_data, headers)
        
        if response and response.status_code == 200:
            try:
                product = response.json()
                product_id = product["id"]
                self.created_resources["products"].append(product_id)
                self.log_test("Create Product", True, f"Product created with ID: {product_id}")
            except:
                self.log_test("Create Product", False, "Invalid response format", response.text)
                return False
        else:
            error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
            self.log_test("Create Product", False, error_msg, response.text if response else "No response")
            return False
        
        # Test get all products (public endpoint)
        response = self.make_request("GET", "/products")
        
        if response and response.status_code == 200:
            try:
                products = response.json()
                if isinstance(products, list):
                    self.log_test("Get All Products", True, f"Retrieved {len(products)} products")
                else:
                    self.log_test("Get All Products", False, "Response is not a list", products)
            except:
                self.log_test("Get All Products", False, "Invalid JSON response", response.text)
        else:
            error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
            self.log_test("Get All Products", False, error_msg, response.text if response else "No response")
        
        # Test category filtering
        response = self.make_request("GET", "/products", params={"category": "Electronics"})
        
        if response and response.status_code == 200:
            try:
                products = response.json()
                self.log_test("Product Category Filter", True, f"Category filter returned {len(products)} products")
            except:
                self.log_test("Product Category Filter", False, "Invalid JSON response", response.text)
        else:
            error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
            self.log_test("Product Category Filter", False, error_msg, response.text if response else "No response")
        
        # Test search functionality
        response = self.make_request("GET", "/products", params={"search": "Samsung"})
        
        if response and response.status_code == 200:
            try:
                products = response.json()
                self.log_test("Product Search", True, f"Search returned {len(products)} products")
            except:
                self.log_test("Product Search", False, "Invalid JSON response", response.text)
        else:
            error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
            self.log_test("Product Search", False, error_msg, response.text if response else "No response")
        
        # Test get individual product
        if self.created_resources["products"]:
            product_id = self.created_resources["products"][0]
            response = self.make_request("GET", f"/products/{product_id}")
            
            if response and response.status_code == 200:
                try:
                    product = response.json()
                    if product.get("id") == product_id:
                        self.log_test("Get Individual Product", True, "Product retrieved successfully")
                    else:
                        self.log_test("Get Individual Product", False, "Product ID mismatch", product)
                except:
                    self.log_test("Get Individual Product", False, "Invalid JSON response", response.text)
            else:
                error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
                self.log_test("Get Individual Product", False, error_msg, response.text if response else "No response")
        
        return True
    
    def test_banner_management(self):
        """Test banner CRUD operations"""
        print("\n=== TESTING BANNER MANAGEMENT ===")
        
        if not self.admin_token:
            self.log_test("Banner Management", False, "No admin token available")
            return False
        
        headers = self.get_auth_headers()
        
        # Test create banner
        banner_data = {
            "title": "Summer Sale 2024",
            "description": "Get up to 50% off on all electronics",
            "image_url": "https://example.com/summer-sale.jpg",
            "link_url": "/products?category=Electronics",
            "is_active": True
        }
        
        response = self.make_request("POST", "/admin/banners", banner_data, headers)
        
        if response and response.status_code == 200:
            try:
                banner = response.json()
                banner_id = banner["id"]
                self.created_resources["banners"].append(banner_id)
                self.log_test("Create Banner", True, f"Banner created with ID: {banner_id}")
            except:
                self.log_test("Create Banner", False, "Invalid response format", response.text)
                return False
        else:
            error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
            self.log_test("Create Banner", False, error_msg, response.text if response else "No response")
            return False
        
        # Test get active banners (public endpoint)
        response = self.make_request("GET", "/banners")
        
        if response and response.status_code == 200:
            try:
                banners = response.json()
                if isinstance(banners, list):
                    self.log_test("Get Active Banners", True, f"Retrieved {len(banners)} active banners")
                else:
                    self.log_test("Get Active Banners", False, "Response is not a list", banners)
            except:
                self.log_test("Get Active Banners", False, "Invalid JSON response", response.text)
        else:
            error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
            self.log_test("Get Active Banners", False, error_msg, response.text if response else "No response")
        
        # Test get all banners (admin endpoint)
        response = self.make_request("GET", "/admin/banners", headers=headers)
        
        if response and response.status_code == 200:
            try:
                banners = response.json()
                if isinstance(banners, list):
                    self.log_test("Get All Banners (Admin)", True, f"Retrieved {len(banners)} banners")
                else:
                    self.log_test("Get All Banners (Admin)", False, "Response is not a list", banners)
            except:
                self.log_test("Get All Banners (Admin)", False, "Invalid JSON response", response.text)
        else:
            error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
            self.log_test("Get All Banners (Admin)", False, error_msg, response.text if response else "No response")
        
        return True
    
    def test_order_management(self):
        """Test order creation and management"""
        print("\n=== TESTING ORDER MANAGEMENT ===")
        
        # Test create order
        order_data = {
            "customer_name": "Rajesh Kumar",
            "customer_email": "rajesh.kumar@email.com",
            "customer_phone": "+91-9876543210",
            "customer_address": "123 MG Road, Bangalore, Karnataka 560001",
            "items": [
                {
                    "product_id": "test-product-1",
                    "quantity": 2,
                    "price": 25999.99
                },
                {
                    "product_id": "test-product-2", 
                    "quantity": 1,
                    "price": 15999.99
                }
            ],
            "payment_method": "razorpay"
        }
        
        response = self.make_request("POST", "/orders", order_data)
        
        if response and response.status_code == 200:
            try:
                order = response.json()
                order_id = order["id"]
                self.created_resources["orders"].append(order_id)
                expected_total = sum(item["price"] * item["quantity"] for item in order_data["items"])
                if abs(order["total_amount"] - expected_total) < 0.01:
                    self.log_test("Create Order", True, f"Order created with ID: {order_id}, Total: ₹{order['total_amount']}")
                else:
                    self.log_test("Create Order", False, f"Total amount calculation error. Expected: {expected_total}, Got: {order['total_amount']}")
            except:
                self.log_test("Create Order", False, "Invalid response format", response.text)
                return False
        else:
            error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
            self.log_test("Create Order", False, error_msg, response.text if response else "No response")
            return False
        
        # Test get individual order
        if self.created_resources["orders"]:
            order_id = self.created_resources["orders"][0]
            response = self.make_request("GET", f"/orders/{order_id}")
            
            if response and response.status_code == 200:
                try:
                    order = response.json()
                    if order.get("id") == order_id:
                        self.log_test("Get Individual Order", True, "Order retrieved successfully")
                    else:
                        self.log_test("Get Individual Order", False, "Order ID mismatch", order)
                except:
                    self.log_test("Get Individual Order", False, "Invalid JSON response", response.text)
            else:
                error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
                self.log_test("Get Individual Order", False, error_msg, response.text if response else "No response")
        
        # Test admin order management
        if self.admin_token:
            headers = self.get_auth_headers()
            response = self.make_request("GET", "/admin/orders", headers=headers)
            
            if response and response.status_code == 200:
                try:
                    orders = response.json()
                    if isinstance(orders, list):
                        self.log_test("Get All Orders (Admin)", True, f"Retrieved {len(orders)} orders")
                    else:
                        self.log_test("Get All Orders (Admin)", False, "Response is not a list", orders)
                except:
                    self.log_test("Get All Orders (Admin)", False, "Invalid JSON response", response.text)
            else:
                error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
                self.log_test("Get All Orders (Admin)", False, error_msg, response.text if response else "No response")
        
        return True
    
    def test_payment_integration(self):
        """Test Razorpay payment integration"""
        print("\n=== TESTING PAYMENT INTEGRATION ===")
        
        if not self.created_resources["orders"]:
            self.log_test("Payment Integration", False, "No orders available for payment testing")
            return False
        
        order_id = self.created_resources["orders"][0]
        
        # Test create Razorpay order
        response = self.make_request("POST", f"/payments/create-razorpay-order?order_id={order_id}")
        
        if response and response.status_code == 200:
            try:
                payment_data = response.json()
                required_fields = ["razorpay_order_id", "amount", "currency", "key"]
                if all(field in payment_data for field in required_fields):
                    self.log_test("Create Razorpay Order", True, f"Razorpay order created: {payment_data['razorpay_order_id']}")
                    razorpay_order_id = payment_data["razorpay_order_id"]
                else:
                    self.log_test("Create Razorpay Order", False, "Missing required fields in response", payment_data)
                    return False
            except:
                self.log_test("Create Razorpay Order", False, "Invalid JSON response", response.text)
                return False
        else:
            error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
            self.log_test("Create Razorpay Order", False, error_msg, response.text if response else "No response")
            return False
        
        # Test COD confirmation
        cod_order_data = {
            "customer_name": "Priya Sharma",
            "customer_email": "priya.sharma@email.com", 
            "customer_phone": "+91-9876543211",
            "customer_address": "456 Brigade Road, Bangalore, Karnataka 560025",
            "items": [
                {
                    "product_id": "test-product-cod",
                    "quantity": 1,
                    "price": 12999.99
                }
            ],
            "payment_method": "cod"
        }
        
        # Create COD order
        response = self.make_request("POST", "/orders", cod_order_data)
        
        if response and response.status_code == 200:
            try:
                cod_order = response.json()
                cod_order_id = cod_order["id"]
                
                # Test COD confirmation
                response = self.make_request("POST", f"/payments/cod-confirmation?order_id={cod_order_id}")
                
                if response and response.status_code == 200:
                    try:
                        result = response.json()
                        if result.get("status") == "success":
                            self.log_test("COD Order Confirmation", True, "COD order confirmed successfully")
                        else:
                            self.log_test("COD Order Confirmation", False, "Unexpected response", result)
                    except:
                        self.log_test("COD Order Confirmation", False, "Invalid JSON response", response.text)
                else:
                    error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
                    self.log_test("COD Order Confirmation", False, error_msg, response.text if response else "No response")
            except:
                self.log_test("COD Order Creation", False, "Invalid response format", response.text)
        else:
            error_msg = f"HTTP {response.status_code if response else 'Connection Error'}"
            self.log_test("COD Order Creation", False, error_msg, response.text if response else "No response")
        
        return True
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Comprehensive Backend API Testing")
        print(f"🔗 Testing Backend URL: {self.base_url}")
        print("=" * 80)
        
        # Run tests in order
        tests = [
            self.test_health_check,
            self.test_admin_authentication,
            self.test_unauthorized_access,
            self.test_category_management,
            self.test_product_management,
            self.test_banner_management,
            self.test_order_management,
            self.test_payment_integration
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                self.log_test(test.__name__, False, f"Test failed with exception: {str(e)}")
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        
        print("\n📋 CREATED TEST RESOURCES:")
        for resource_type, resources in self.created_resources.items():
            if resources:
                print(f"   {resource_type.title()}: {len(resources)} created")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    tester = BackendTester()
    tester.run_all_tests()
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Context for cart management
const CartContext = createContext();

// Cart Provider
const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  useEffect(() => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setCartTotal(total);
  }, [cart]);

  return (
    <CartContext.Provider value={{
      cart,
      cartTotal,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

// Hook to use cart context
const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

// Header Component
const Header = () => {
  const { cart } = useCart();
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-2xl font-bold text-blue-600">
            TechMart
          </Link>
          
          <nav className="hidden md:flex space-x-8">
            <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors">
              Home
            </Link>
            <Link to="/products" className="text-gray-700 hover:text-blue-600 transition-colors">
              Products
            </Link>
            <Link to="/categories" className="text-gray-700 hover:text-blue-600 transition-colors">
              Categories
            </Link>
            <Link to="/admin" className="text-gray-700 hover:text-blue-600 transition-colors">
              Admin
            </Link>
          </nav>
          
          <Link to="/cart" className="relative">
            <div className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m-2.4 0L5 7m0 0h14M7 13L5.4 5M7 13l-2.293 2.293c-.39.39-.39 1.024 0 1.414L7 17m0 0v4a2 2 0 002 2h6a2 2 0 002-2v-4m-8 0h8" />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {cartItemCount}
                </span>
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};

// Home Page Component
const Home = () => {
  const [banners, setBanners] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchBanners();
    fetchFeaturedProducts();
    fetchCategories();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API}/banners`);
      setBanners(response.data);
    } catch (error) {
      console.error('Error fetching banners:', error);
    }
  };

  const fetchFeaturedProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setFeaturedProducts(response.data.slice(0, 8));
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl font-bold mb-6">Welcome to TechMart</h1>
          <p className="text-xl mb-8">Your one-stop shop for Electronics, Appliances, and More!</p>
          <Link to="/products" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            Shop Now
          </Link>
        </div>
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      </section>

      {/* Advertisement Banners */}
      {banners.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {banners.map(banner => (
                <div key={banner.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <img src={banner.image_url} alt={banner.title} className="w-full h-48 object-cover" />
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{banner.title}</h3>
                    <p className="text-gray-600">{banner.description}</p>
                    {banner.link_url && (
                      <a href={banner.link_url} className="inline-block mt-4 text-blue-600 hover:underline">
                        Learn More →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Shop by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {categories.map(category => (
                <Link key={category.id} to={`/products?category=${category.name}`} 
                      className="group text-center">
                  <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg p-8 group-hover:shadow-lg transition-shadow">
                    {category.image_url ? (
                      <img src={category.image_url} alt={category.name} className="w-16 h-16 mx-auto mb-4" />
                    ) : (
                      <div className="w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {category.name.charAt(0)}
                      </div>
                    )}
                    <h3 className="font-semibold text-gray-800 group-hover:text-blue-600">{category.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Featured Products</h2>
            <ProductGrid products={featuredProducts} />
          </div>
        </section>
      )}
    </div>
  );
};

// Product Grid Component
const ProductGrid = ({ products }) => {
  const { addToCart } = useCart();

  const handleAddToCart = (product) => {
    addToCart(product);
    alert('Product added to cart!');
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map(product => (
        <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <img src={product.image_url || 'https://images.unsplash.com/photo-1603732551681-2e91159b9dc2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljc3xlbnwwfHx8Ymx1ZXwxNzU0NTYwMjg4fDA&ixlib=rb-4.1.0&q=85'} 
               alt={product.name} className="w-full h-48 object-cover" />
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-blue-600">₹{product.price}</span>
              <button 
                onClick={() => handleAddToCart(product)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Products Page Component
const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [selectedCategory, searchQuery]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;
      
      const response = await axios.get(`${API}/products`, { params });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Our Products</h1>
      
      {/* Filters */}
      <div className="mb-8 space-y-4 md:space-y-0 md:flex md:space-x-4">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category.id} value={category.name}>{category.name}</option>
          ))}
        </select>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      ) : products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No products found.</p>
        </div>
      )}
    </div>
  );
};

// Cart Page Component
const CartPage = () => {
  const { cart, cartTotal, updateQuantity, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
        <p className="text-gray-600 text-lg mb-8">Your cart is empty</p>
        <Link to="/products" className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
      
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {cart.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-md p-6 flex items-center space-x-4">
                <img src={item.image_url || 'https://images.unsplash.com/photo-1603732551681-2e91159b9dc2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljc3xlbnwwfHx8Ymx1ZXwxNzU0NTYwMjg4fDA&ixlib=rb-4.1.0&q=85'} 
                     alt={item.name} className="w-20 h-20 object-cover rounded" />
                
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <p className="text-gray-600">₹{item.price}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 bg-gray-100 rounded">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                  >
                    +
                  </button>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Cart Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/checkout')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors mb-2"
            >
              Proceed to Checkout
            </button>
            
            <button 
              onClick={clearCart}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Checkout Page Component
const CheckoutPage = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [showUPIQR, setShowUPIQR] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);

  const handleInputChange = (e) => {
    setCustomerInfo({
      ...customerInfo,
      [e.target.name]: e.target.value
    });
  };

  const createOrder = async () => {
    const orderData = {
      customer_name: customerInfo.name,
      customer_email: customerInfo.email,
      customer_phone: customerInfo.phone,
      customer_address: customerInfo.address,
      items: cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      })),
      payment_method: paymentMethod
    };

    try {
      const response = await axios.post(`${API}/orders`, orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const handleRazorpayPayment = async (order) => {
    try {
      const razorpayResponse = await axios.post(`${API}/payments/create-razorpay-order?order_id=${order.id}`);
      const { razorpay_order_id, amount, currency, key } = razorpayResponse.data;

      const options = {
        key: key,
        amount: amount,
        currency: currency,
        order_id: razorpay_order_id,
        name: 'TechMart',
        description: 'Order Payment',
        handler: async function(response) {
          try {
            await axios.post(`${API}/payments/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: order.id
            });
            
            clearCart();
            alert('Payment successful! Order confirmed.');
            navigate('/');
          } catch (error) {
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: customerInfo.name,
          email: customerInfo.email,
          contact: customerInfo.phone
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Error initiating Razorpay payment:', error);
      alert('Failed to initiate payment. Please try again.');
    }
  };

  const handleUPIPayment = async (order) => {
    try {
      const response = await axios.post(`${API}/payments/generate-upi-qr`, {
        order_id: order.id,
        upi_id: "techmart@paytm"
      });
      
      setQrCodeData(response.data);
      setShowUPIQR(true);
    } catch (error) {
      console.error('Error generating UPI QR:', error);
      alert('Failed to generate UPI QR code. Please try another payment method.');
    }
  };

  const confirmUPIPayment = async () => {
    if (!qrCodeData) return;
    
    const transactionRef = prompt("Please enter the UPI transaction reference number:");
    if (!transactionRef) return;
    
    try {
      await axios.post(`${API}/payments/confirm-upi-payment?order_id=${qrCodeData.order_id}&transaction_ref=${transactionRef}`);
      clearCart();
      setShowUPIQR(false);
      alert('UPI Payment confirmed! Your order has been placed successfully.');
      navigate('/');
    } catch (error) {
      alert('Error confirming payment. Please contact support with your transaction reference.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const order = await createOrder();

      if (paymentMethod === 'cod') {
        await axios.post(`${API}/payments/cod-confirmation?order_id=${order.id}`);
        clearCart();
        alert('Order placed successfully! You will pay on delivery.');
        navigate('/');
      } else if (paymentMethod === 'razorpay') {
        await handleRazorpayPayment(order);
      } else if (paymentMethod === 'upi_qr') {
        await handleUPIPayment(order);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    navigate('/cart');
    return null;
  }

  // UPI QR Code Modal
  if (showUPIQR && qrCodeData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">UPI Payment</h2>
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <img 
                src={qrCodeData.qr_code} 
                alt="UPI QR Code" 
                className="w-48 h-48 mx-auto mb-4 border rounded"
              />
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">₹{qrCodeData.amount}</p>
                <p className="text-sm text-gray-600">Pay to: {qrCodeData.upi_id}</p>
                <p className="text-xs text-gray-500">Order: #{qrCodeData.order_id.substring(0, 8)}</p>
              </div>
            </div>
            
            <div className="text-left bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">Payment Instructions:</h3>
              <ol className="text-sm space-y-1">
                {qrCodeData.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={confirmUPIPayment}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
              >
                I've Completed the Payment
              </button>
              <button
                onClick={() => {
                  setShowUPIQR(false);
                  setQrCodeData(null);
                }}
                className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700"
              >
                Cancel & Go Back
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              After payment, click "I've Completed the Payment" and enter your transaction reference number.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-8">
        {/* Customer Information */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
            <div className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={customerInfo.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={customerInfo.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={customerInfo.phone}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                name="address"
                placeholder="Delivery Address"
                value={customerInfo.address}
                onChange={handleInputChange}
                required
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Payment Method */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <div>
                  <span className="font-medium">Cash on Delivery (COD)</span>
                  <p className="text-sm text-gray-600">Pay when you receive your order</p>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="razorpay"
                  checked={paymentMethod === 'razorpay'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <div>
                  <span className="font-medium">Online Payment</span>
                  <p className="text-sm text-gray-600">Card, UPI, Net Banking, Wallets</p>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi_qr"
                  checked={paymentMethod === 'upi_qr'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <div>
                  <span className="font-medium">UPI QR Code Payment</span>
                  <p className="text-sm text-gray-600">Scan QR with any UPI app</p>
                </div>
              </label>
            </div>
          </div>
        </div>
        
        {/* Order Summary */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="space-y-3 mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : 
               paymentMethod === 'upi_qr' ? 'Generate QR Code' : 
               paymentMethod === 'cod' ? 'Place Order (COD)' : 
               'Proceed to Payment'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// Admin Panel Components
const AdminPanel = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('adminToken'));

  useEffect(() => {
    if (token) {
      setIsLoggedIn(true);
    }
  }, [token]);

  const logout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <AdminLogin onLogin={(token) => {
      setToken(token);
      localStorage.setItem('adminToken', token);
      setIsLoggedIn(true);
    }} />;
  }

  return <AdminDashboard token={token} onLogout={logout} />;
};

const AdminLogin = ({ onLogin }) => {
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [isRegister, setIsRegister] = useState(false);
  const [registerData, setRegisterData] = useState({ username: '', email: '', password: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/admin/login`, loginData);
      onLogin(response.data.access_token);
    } catch (error) {
      alert('Login failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/register`, registerData);
      alert('Admin registered successfully! Please login.');
      setIsRegister(false);
    } catch (error) {
      alert('Registration failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isRegister ? 'Admin Registration' : 'Admin Login'}
        </h2>
        
        {isRegister ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={registerData.username}
              onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
              required
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Email"
              value={registerData.email}
              onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
              required
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={registerData.password}
              onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
              required
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">
              Register
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={loginData.username}
              onChange={(e) => setLoginData({...loginData, username: e.target.value})}
              required
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginData.password}
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              required
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">
              Login
            </button>
          </form>
        )}
        
        <div className="text-center mt-4">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-blue-600 hover:underline"
          >
            {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = ({ token, onLogout }) => {
  const [activeTab, setActiveTab] = useState('products');

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <button onClick={onLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Logout
          </button>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex space-x-4 mb-8 border-b">
          {['products', 'categories', 'banners', 'orders'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize ${
                activeTab === tab 
                  ? 'border-b-2 border-blue-600 text-blue-600' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {activeTab === 'products' && <ProductManagement axiosConfig={axiosConfig} />}
        {activeTab === 'categories' && <CategoryManagement axiosConfig={axiosConfig} />}
        {activeTab === 'banners' && <BannerManagement axiosConfig={axiosConfig} />}
        {activeTab === 'orders' && <OrderManagement axiosConfig={axiosConfig} />}
      </div>
    </div>
  );
};

// Product Management Component
const ProductManagement = ({ axiosConfig }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', category: '', stock: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let productData;
      
      if (imageFile) {
        // Create FormData for file upload
        const formDataObj = new FormData();
        formDataObj.append('name', formData.name);
        formDataObj.append('description', formData.description);
        formDataObj.append('price', parseFloat(formData.price));
        formDataObj.append('category', formData.category);
        formDataObj.append('stock', parseInt(formData.stock));
        formDataObj.append('image', imageFile);

        if (editingProduct) {
          const response = await axios.put(`${API}/admin/products-with-image/${editingProduct.id}`, formDataObj, {
            ...axiosConfig,
            headers: { 
              ...axiosConfig.headers,
              'Content-Type': 'multipart/form-data' 
            }
          });
          productData = response.data;
        } else {
          const response = await axios.post(`${API}/admin/products-with-image`, formDataObj, {
            ...axiosConfig,
            headers: { 
              ...axiosConfig.headers,
              'Content-Type': 'multipart/form-data' 
            }
          });
          productData = response.data;
        }
      } else {
        // Use regular JSON endpoint if no image
        const productPayload = {
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          image_url: editingProduct ? editingProduct.image_url : ''
        };

        if (editingProduct) {
          await axios.put(`${API}/admin/products/${editingProduct.id}`, productPayload, axiosConfig);
        } else {
          await axios.post(`${API}/admin/products`, productPayload, axiosConfig);
        }
      }

      fetchProducts();
      resetForm();
      alert(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
    } catch (error) {
      alert('Error saving product: ' + (error.response?.data?.detail || error.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const deleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`${API}/admin/products/${id}`, axiosConfig);
        fetchProducts();
      } catch (error) {
        alert('Error deleting product: ' + (error.response?.data?.detail || 'Unknown error'));
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', category: '', stock: '' });
    setEditingProduct(null);
    setShowForm(false);
    setImageFile(null);
    setImagePreview('');
  };

  const startEdit = (product) => {
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      stock: product.stock.toString()
    });
    setEditingProduct(product);
    setImagePreview(product.image_url || '');
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Product Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Product
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Product Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                required
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                required
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Stock Quantity"
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: e.target.value})}
                required
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
              rows="3"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            
            {/* Image Upload Section */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Product Image
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {imagePreview && (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Upload JPG, PNG, GIF, or WEBP files. Images will be automatically resized.
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button 
                type="submit" 
                disabled={uploading}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {uploading ? 'Uploading...' : (editingProduct ? 'Update Product' : 'Add Product')}
              </button>
              <button 
                type="button" 
                onClick={resetForm} 
                className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map(product => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img src={product.image_url || 'https://images.unsplash.com/photo-1603732551681-2e91159b9dc2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzV8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljc3xlbnwwfHx8Ymx1ZXwxNzU0NTYwMjg4fDA&ixlib=rb-4.1.0&q=85'} 
                         alt={product.name} className="w-10 h-10 rounded object-cover mr-3" />
                    <span className="font-medium">{product.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{product.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">₹{product.price}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{product.stock}</td>
                <td className="px-6 py-4 whitespace-nowrap space-x-2">
                  <button onClick={() => startEdit(product)} className="text-blue-600 hover:text-blue-800">Edit</button>
                  <button onClick={() => deleteProduct(product.id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Category Management (simplified)
const CategoryManagement = ({ axiosConfig }) => {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', image_url: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/categories`, formData, axiosConfig);
      fetchCategories();
      setFormData({ name: '', description: '', image_url: '' });
      setShowForm(false);
    } catch (error) {
      alert('Error saving category: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const deleteCategory = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await axios.delete(`${API}/admin/categories/${id}`, axiosConfig);
        fetchCategories();
      } catch (error) {
        alert('Error deleting category');
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Category Management</h2>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Add Category
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Category Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="url"
              placeholder="Image URL (optional)"
              value={formData.image_url}
              onChange={(e) => setFormData({...formData, image_url: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex space-x-4">
              <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
                Add Category
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => (
          <div key={category.id} className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
            <p className="text-gray-600 mb-4">{category.description}</p>
            <div className="flex space-x-2">
              <button onClick={() => deleteCategory(category.id)} className="text-red-600 hover:text-red-800">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Banner Management (simplified)
const BannerManagement = ({ axiosConfig }) => {
  const [banners, setBanners] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', image_url: '', link_url: '' });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API}/admin/banners`, axiosConfig);
      setBanners(response.data);
    } catch (error) {
      console.error('Error fetching banners:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/banners`, formData, axiosConfig);
      fetchBanners();
      setFormData({ title: '', description: '', image_url: '', link_url: '' });
      setShowForm(false);
    } catch (error) {
      alert('Error saving banner');
    }
  };

  const deleteBanner = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await axios.delete(`${API}/admin/banners/${id}`, axiosConfig);
        fetchBanners();
      } catch (error) {
        alert('Error deleting banner');
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Banner Management</h2>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Add Banner
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Banner Title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="url"
              placeholder="Image URL"
              value={formData.image_url}
              onChange={(e) => setFormData({...formData, image_url: e.target.value})}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="url"
              placeholder="Link URL (optional)"
              value={formData.link_url}
              onChange={(e) => setFormData({...formData, link_url: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex space-x-4">
              <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
                Add Banner
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {banners.map(banner => (
          <div key={banner.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <img src={banner.image_url} alt={banner.title} className="w-full h-48 object-cover" />
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2">{banner.title}</h3>
              <p className="text-gray-600 mb-4">{banner.description}</p>
              <div className="flex space-x-2">
                <button onClick={() => deleteBanner(banner.id)} className="text-red-600 hover:text-red-800">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Order Management (simplified)
const OrderManagement = ({ axiosConfig }) => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/admin/orders`, axiosConfig);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}/status?status=${status}`, {}, axiosConfig);
      fetchOrders();
    } catch (error) {
      alert('Error updating order status');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Order Management</h2>
      
      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold">Order #{order.id.substring(0, 8)}</h3>
                <p className="text-gray-600">{order.customer_name} - {order.customer_phone}</p>
                <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-lg">₹{order.total_amount}</p>
                <p className="text-sm text-gray-600">{order.payment_method.toUpperCase()}</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <strong>Payment Status:</strong>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                  order.payment_status === 'cod' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.payment_status.toUpperCase()}
                </span>
              </div>
              
              <div>
                <strong>Order Status:</strong>
                <select
                  value={order.order_status}
                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                  className="ml-2 px-2 py-1 border rounded"
                >
                  <option value="placed">Placed</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded p-4">
              <h4 className="font-semibold mb-2">Items:</h4>
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>Product ID: {item.product_id} × {item.quantity}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <CartProvider>
      <div className="App min-h-screen bg-gray-50">
        <BrowserRouter>
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </main>
        </BrowserRouter>
      </div>
    </CartProvider>
  );
}

export default App;
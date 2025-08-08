import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { ShieldCheck, Truck, MessageSquare, Trash2, Plus, Minus } from 'lucide-react';

// --- External Page/Component Imports ---
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import ProtectedRoute from './components/ProtectedRoute';

import './App.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

//=================================================================
// Cart Context
//=================================================================
const CartContext = createContext();
const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => { try { const d = localStorage.getItem('cart'); return d ? JSON.parse(d) : [] } catch (e) { return [] }});
    const [cartTotal, setCartTotal] = useState(0);
    useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)); setCartTotal(cart.reduce((s, i) => s + i.price * i.quantity, 0))}, [cart]);
    const addToCart = (p,q=1) => setCart(c => { const i=c.find(x=>x.id===p.id); if(i) return c.map(x=>x.id===p.id?{...x,quantity:x.quantity+q}:x); return [...c, {...p,quantity:q}]});
    const removeFromCart = (pId) => setCart(c => c.filter(i => i.id !== pId));
    const updateQuantity = (pId, q) => { if (q <= 0) { removeFromCart(pId); return; } setCart(c => c.map(i => i.id === pId ? { ...i, quantity: q } : i))};
    const clearCart = () => setCart([]);
    return <CartContext.Provider value={{ cart, cartTotal, addToCart, removeFromCart, updateQuantity, clearCart }}>{children}</CartContext.Provider>;
};
export const useCart = () => useContext(CartContext);


//=================================================================
// Reusable UI Components
//=================================================================
export const ProductGrid = ({ products }) => {
    const { addToCart } = useCart();
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
                    <img src={product.image_url || 'https://placehold.co/600x400/EEE/31343C?text=No+Image'} alt={product.name} className="w-full h-48 object-cover" />
                    <div className="p-4">
                        <h3 className="font-semibold text-lg mb-2 truncate">{product.name}</h3>
                        <div className="flex justify-between items-center">
                            <span className="text-xl font-bold text-blue-600">₹{product.price}</span>
                            <button onClick={() => { addToCart(product); toast.success(`${product.name} added!`); }} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Add to Cart</button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const Header = () => {
    const { user, logout } = useAuth();
    const { cart } = useCart();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/products?search=${searchQuery.trim()}`);
            setSearchQuery('');
        }
    };

    return (
        <header className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4 gap-4">
                    <Link to="/" className="text-2xl font-bold text-blue-600">TechMart</Link>
                    <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl">
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search products..." className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-blue-500" />
                    </form>
                    <nav className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <Link to="/profile" className="text-gray-700 hover:text-blue-600">Profile</Link>
                                <button onClick={() => { logout(); toast.success('Logged out!'); }} className="text-gray-700 hover:text-blue-600">Logout</button>
                            </>
                        ) : (
                            <Link to="/login" className="text-gray-700 hover:text-blue-600">Login</Link>
                        )}
                        <Link to="/cart" className="relative">
                            <div className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.29 2.29a1 1 0 000 1.41L7 17h0m0 0v4a2 2 0 002 2h6a2 2 0 002-2v-4m-8 0h8" /></svg>
                                {cartItemCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">{cartItemCount}</span>}
                            </div>
                        </Link>
                    </nav>
                </div>
            </div>
        </header>
    );
};

const Footer = () => (
    <footer className="bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                    <h3 className="text-lg font-semibold mb-4">Shop</h3>
                    <ul>
                        <li><Link to="/products" className="text-gray-400 hover:text-white">All Products</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-4">About</h3>
                    <ul>
                        <li><Link to="#" className="text-gray-400 hover:text-white">Our Story</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-4">Support</h3>
                    <ul>
                        <li><Link to="#" className="text-gray-400 hover:text-white">Contact Us</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-4">Legal</h3>
                    <ul>
                        <li><Link to="#" className="text-gray-400 hover:text-white">Privacy Policy</Link></li>
                    </ul>
                </div>
            </div>
            <div className="mt-8 border-t border-gray-700 pt-8 text-center text-gray-400">
                &copy; {new Date().getFullYear()} TechMart. All rights reserved.
            </div>
        </div>
    </footer>
);


//=================================================================
// Page Components
//=================================================================
const HomePage = () => {
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchHomePageData = async () => {
            try {
                const productsResponse = await axios.get(`${API}/products`);
                setFeaturedProducts(productsResponse.data.slice(0, 8));
                const categoriesResponse = await axios.get(`${API}/categories`);
                setCategories(categoriesResponse.data.slice(0, 4));
            } catch (error) {
                console.error("Error fetching homepage data:", error);
            }
        };
        fetchHomePageData();
    }, []);

    return (
        <div className="bg-white">
            <section className="bg-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">Welcome to TechMart</h1>
                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-300 mb-8">Your ultimate destination for the latest and greatest in electronics.</p>
                    <Link to="/products" className="inline-block bg-blue-600 text-white font-bold text-lg px-8 py-3 rounded-md hover:bg-blue-700 transition-transform transform hover:scale-105">Shop All Products</Link>
                </div>
            </section>
            <section className="bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        <div className="flex flex-col items-center"><Truck size={48} className="text-blue-600 mb-4" /><h3 className="text-xl font-bold mb-2">Fast Shipping</h3><p className="text-gray-600">Get your orders delivered to your doorstep in record time.</p></div>
                        <div className="flex flex-col items-center"><ShieldCheck size={48} className="text-blue-600 mb-4" /><h3 className="text-xl font-bold mb-2">Secure Payments</h3><p className="text-gray-600">Your transactions are safe with our advanced security.</p></div>
                        <div className="flex flex-col items-center"><MessageSquare size={48} className="text-blue-600 mb-4" /><h3 className="text-xl font-bold mb-2">24/7 Support</h3><p className="text-gray-600">Our team is here to help you with any questions, anytime.</p></div>
                    </div>
                </div>
            </section>
            {featuredProducts.length > 0 && (
                <section className="bg-gray-50 py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-12">Featured Products</h2>
                        <ProductGrid products={featuredProducts} />
                    </div>
                </section>
            )}
        </div>
    );
};

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();

    const categoryFilter = searchParams.get('category') || '';
    const searchQuery = searchParams.get('search') || '';
    const sortOption = searchParams.get('sort') || '';

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ category: categoryFilter, search: searchQuery, sort: sortOption });
                const response = await axios.get(`${API}/products?${params.toString()}`);
                setProducts(response.data);
            } catch (error) {
                toast.error("Could not fetch products.");
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [categoryFilter, searchQuery, sortOption]);

    useEffect(() => {
        const fetchCategories = async () => {
            const response = await axios.get(`${API}/categories`);
            setCategories(response.data);
        };
        fetchCategories();
    }, []);

    const updateFilters = (newParams) => {
        setSearchParams(prev => {
            Object.entries(newParams).forEach(([k, v]) => v ? prev.set(k, v) : prev.delete(k));
            return prev;
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">{searchQuery ? `Searching for "${searchQuery}"` : "Our Products"}</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-white rounded-lg shadow">
                <input type="text" placeholder="Search..." defaultValue={searchQuery} onKeyDown={(e) => e.key === 'Enter' && updateFilters({ search: e.target.value })} className="md:col-span-1 w-full px-4 py-2 border rounded-lg" />
                <select value={categoryFilter} onChange={(e) => updateFilters({ category: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <select value={sortOption} onChange={(e) => updateFilters({ sort: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                    <option value="">Sort by Relevance</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Name: A to Z</option>
                </select>
            </div>
            {loading ? <div className="text-center py-12">Loading...</div> : products.length > 0 ? <ProductGrid products={products} /> : <div className="text-center py-12"><p>No products found.</p></div>}
        </div>
    );
};

const CartPage = () => {
    const { cart, cartTotal, updateQuantity, removeFromCart, clearCart } = useCart();
    const navigate = useNavigate();

    if (cart.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h1 className="text-4xl font-bold mb-4">Your Cart is Empty</h1>
                <p className="text-gray-600 text-lg mb-8">Looks like you haven't added anything to your cart yet.</p>
                <Link to="/products" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">Continue Shopping</Link>
            </div>
        );
    }

    return (
        <div className="bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold mb-8 text-center">Shopping Cart</h1>
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6 space-y-6">
                        {cart.map(item => (
                            <div key={item.id} className="flex items-center space-x-4 border-b pb-4 last:border-b-0">
                                <img src={item.image_url || 'https://placehold.co/100x100/EEE/31343C?text=No+Image'} alt={item.name} className="w-24 h-24 object-cover rounded-md" />
                                <div className="flex-1"><h3 className="font-semibold text-lg">{item.name}</h3><p className="text-gray-600">₹{item.price.toFixed(2)}</p></div>
                                <div className="flex items-center space-x-3">
                                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"><Minus size={16} /></button>
                                    <span className="px-4 py-2 font-semibold">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"><Plus size={16} /></button>
                                </div>
                                <div className="text-right"><p className="font-semibold text-lg">₹{(item.price * item.quantity).toFixed(2)}</p></div>
                                <button onClick={() => { removeFromCart(item.id); toast.error(`${item.name} removed.`); }} className="text-red-500 hover:text-red-700"><Trash2 size={20} /></button>
                            </div>
                        ))}
                    </div>
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                            <h2 className="text-2xl font-semibold mb-6 border-b pb-4">Order Summary</h2>
                            <div className="border-t pt-4 flex justify-between font-bold text-lg text-gray-900"><span>Total</span><span>₹{cartTotal.toFixed(2)}</span></div>
                            <button onClick={() => navigate('/checkout')} className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 text-lg">Proceed to Checkout</button>
                            <button onClick={() => { if(window.confirm('Clear cart?')) { clearCart(); toast.success('Cart cleared!'); }}} className="w-full mt-4 text-center text-red-600 hover:underline">Clear Cart</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CheckoutPage = () => <div className="text-center py-10"><h1>Checkout</h1><p>This is where the checkout form will be.</p></div>;

//=================================================================
// Main App Component
//=================================================================
function App() {
    return (
        <AuthProvider>
            <CartProvider>
                <BrowserRouter>
                    <div className="App flex flex-col min-h-screen bg-gray-50">
                        <Toaster position="top-center" />
                        <Header />
                        <main className="flex-grow">
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/products" element={<ProductsPage />} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/register" element={<RegisterPage />} />
                                <Route path="/cart" element={<CartPage />} />
                                <Route path="/admin" element={<AdminPage />} />
                                <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                            </Routes>
                        </main>
                        <Footer />
                    </div>
                </BrowserRouter>
            </CartProvider>
        </AuthProvider>
    );
}

export default App;

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
import { ProductsPage } from './pages/ProductsPage';
import { HomePage } from './pages/HomePage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { Footer } from './components/Footer';
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
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden group">
                    <Link to={`/products/${product.id}`}>
                        <img src={product.image_url || 'https://placehold.co/600x400/EEE/31343C?text=No+Image'} alt={product.name} className="w-full h-48 object-cover group-hover:opacity-80 transition-opacity" />
                    </Link>
                    <div className="p-4">
                        <Link to={`/products/${product.id}`}>
                            <h3 className="font-semibold text-lg mb-2 truncate hover:text-blue-600">{product.name}</h3>
                        </Link>
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
                                <Route path="/products/:productId" element={<ProductDetailPage />} />
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

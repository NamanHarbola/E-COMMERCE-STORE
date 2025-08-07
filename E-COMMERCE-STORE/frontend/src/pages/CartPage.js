import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../App'; // Assuming useCart is exported from App.js
import { Trash2, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

export function CartPage() {
    const { cart, cartTotal, updateQuantity, removeFromCart, clearCart } = useCart();
    const navigate = useNavigate();

    if (cart.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h1 className="text-4xl font-bold mb-4">Your Cart is Empty</h1>
                <p className="text-gray-600 text-lg mb-8">Looks like you haven't added anything to your cart yet.</p>
                <Link to="/products" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    Continue Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold mb-8 text-center">Shopping Cart</h1>
                
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
                        <div className="space-y-6">
                            {cart.map(item => (
                                <div key={item.id} className="flex items-center space-x-4 border-b pb-4 last:border-b-0">
                                    <img 
                                        src={item.image_url || 'https://placehold.co/100x100/EEE/31343C?text=No+Image'} 
                                        alt={item.name} 
                                        className="w-24 h-24 object-cover rounded-md" 
                                    />
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">{item.name}</h3>
                                        <p className="text-gray-600">₹{item.price.toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300">
                                            <Minus size={16} />
                                        </button>
                                        <span className="px-4 py-2 font-semibold">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-lg">₹{(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                    <button onClick={() => { removeFromCart(item.id); toast.error(`${item.name} removed from cart.`); }} className="text-red-500 hover:text-red-700">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Cart Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                            <h2 className="text-2xl font-semibold mb-6 border-b pb-4">Order Summary</h2>
                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>₹{cartTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Shipping</span>
                                    <span className="font-semibold text-green-600">FREE</span>
                                </div>
                                <div className="border-t pt-4 flex justify-between font-bold text-lg text-gray-900">
                                    <span>Total</span>
                                    <span>₹{cartTotal.toFixed(2)}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => navigate('/checkout')}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
                            >
                                Proceed to Checkout
                            </button>
                            <button 
                                onClick={() => {
                                    if(window.confirm('Are you sure you want to clear the cart?')) {
                                        clearCart();
                                        toast.success('Cart cleared!');
                                    }
                                }}
                                className="w-full mt-4 text-center text-red-600 hover:underline"
                            >
                                Clear Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

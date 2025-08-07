import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useCart } from '../App';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export function CheckoutPage() {
    const { cart, cartTotal, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
    });
    const [paymentMethod, setPaymentMethod] = useState('razorpay');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setCustomerInfo(prev => ({ ...prev, name: user.username, email: user.email }));
        }
    }, [user]);

    const handleInputChange = (e) => {
        setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        setLoading(true);

        const orderData = {
            customer_name: customerInfo.name,
            customer_email: customerInfo.email,
            customer_phone: customerInfo.phone,
            customer_address: customerInfo.address,
            items: cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                price: item.price,
            })),
            payment_method: paymentMethod,
        };

        try {
            // Step 1: Create the order in our database
            const orderResponse = await axios.post(`${API}/orders`, orderData);
            const order = orderResponse.data;

            // Step 2: Handle payment based on the selected method
            if (paymentMethod === 'razorpay') {
                await handleRazorpayPayment(order);
            } else { // Assuming 'cod'
                await axios.post(`${API}/payments/cod-confirmation?order_id=${order.id}`);
                toast.success('Order placed successfully!');
                clearCart();
                navigate('/');
            }
        } catch (error) {
            toast.error('Failed to place order. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRazorpayPayment = async (order) => {
        try {
            const { data } = await axios.post(`${API}/payments/create-razorpay-order?order_id=${order.id}`);
            
            const options = {
                key: data.key,
                amount: data.amount,
                currency: data.currency,
                name: 'TechMart',
                description: `Order #${order.id.substring(0, 8)}`,
                order_id: data.razorpay_order_id,
                handler: async function (response) {
                    try {
                        await axios.post(`${API}/payments/verify-payment`, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            order_id: order.id,
                        });
                        toast.success('Payment successful! Order confirmed.');
                        clearCart();
                        navigate('/');
                    } catch (verifyError) {
                        toast.error('Payment verification failed. Please contact support.');
                    }
                },
                prefill: {
                    name: customerInfo.name,
                    email: customerInfo.email,
                    contact: customerInfo.phone,
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) {
            toast.error('Failed to initialize payment.');
        }
    };

    if (cart.length === 0) {
        return <Navigate to="/cart" />;
    }

    return (
        <div className="bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold mb-8 text-center">Checkout</h1>
                <form onSubmit={handlePlaceOrder} className="grid lg:grid-cols-2 gap-12">
                    {/* Customer Information */}
                    <div className="bg-white p-8 rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold mb-6">Shipping Information</h2>
                        <div className="space-y-4">
                            <input type="text" name="name" placeholder="Full Name" value={customerInfo.name} onChange={handleInputChange} required className="w-full p-3 border rounded-lg" />
                            <input type="email" name="email" placeholder="Email Address" value={customerInfo.email} onChange={handleInputChange} required className="w-full p-3 border rounded-lg" />
                            <input type="tel" name="phone" placeholder="Phone Number" value={customerInfo.phone} onChange={handleInputChange} required className="w-full p-3 border rounded-lg" />
                            <textarea name="address" placeholder="Delivery Address" value={customerInfo.address} onChange={handleInputChange} required rows="3" className="w-full p-3 border rounded-lg" />
                        </div>
                    </div>

                    {/* Order Summary & Payment */}
                    <div className="bg-white p-8 rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold mb-6">Your Order</h2>
                        <div className="space-y-3 mb-6 border-b pb-4">
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span>{item.name} × {item.quantity}</span>
                                    <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between font-bold text-xl mb-6">
                            <span>Total</span>
                            <span>₹{cartTotal.toFixed(2)}</span>
                        </div>
                        
                        <h3 className="text-xl font-semibold mb-4">Payment Method</h3>
                        <div className="space-y-3">
                            <label className="flex items-center p-3 border rounded-lg cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                                <input type="radio" name="paymentMethod" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={(e) => setPaymentMethod(e.target.value)} className="h-4 w-4 text-blue-600" />
                                <span className="ml-3 font-medium">Online Payment (Razorpay)</span>
                            </label>
                            <label className="flex items-center p-3 border rounded-lg cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                                <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'} onChange={(e) => setPaymentMethod(e.target.value)} className="h-4 w-4 text-blue-600" />
                                <span className="ml-3 font-medium">Cash on Delivery (COD)</span>
                            </label>
                        </div>

                        <button type="submit" disabled={loading} className="w-full mt-8 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 text-lg">
                            {loading ? 'Processing...' : 'Place Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

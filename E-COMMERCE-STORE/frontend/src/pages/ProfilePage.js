// In frontend/src/pages/ProfilePage.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export function ProfilePage() {
    const { user, token } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            const fetchOrders = async () => {
                try {
                    const config = {
                        headers: { Authorization: `Bearer ${token}` }
                    };
                    const response = await axios.get(`${API}/my-orders`, config);
                    setOrders(response.data);
                } catch (error) {
                    toast.error("Could not fetch order history.");
                    console.error("Failed to fetch orders:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchOrders();
        }
    }, [token]);

    if (loading) {
        return <div className="text-center py-10">Loading profile...</div>;
    }

    if (!user) {
        return <div className="text-center py-10">Please log in to see your profile.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">My Profile</h1>
            
            {/* User Info Card */}
            <div className="bg-white shadow rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">My Details</h2>
                <div className="space-y-2">
                    <p><strong>Username:</strong> {user.username}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                </div>
            </div>

            {/* Order History */}
            <h2 className="text-2xl font-bold mb-4">My Order History</h2>
            <div className="space-y-4">
                {orders.length > 0 ? (
                    orders.map(order => (
                        <div key={order.id} className="bg-white shadow rounded-lg p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold">Order #{order.id.substring(0, 8)}</p>
                                    <p className="text-sm text-gray-500">
                                        Placed on: {new Date(order.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <p className="font-bold text-lg">₹{order.total_amount.toFixed(2)}</p>
                            </div>
                            <div className="mt-4 border-t pt-4">
                                {order.items.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm py-1">
                                        <span>{item.quantity} x (Product ID: {item.product_id.substring(0,8)})</span>
                                        <span>₹{item.price.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <p>You haven't placed any orders yet.</p>
                )}
            </div>
        </div>
    );
}
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export function OrderManagement({ axiosConfig }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/admin/orders`, axiosConfig);
            setOrders(response.data);
        } catch (error) {
            toast.error('Failed to fetch orders.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        const toastId = toast.loading('Updating status...');
        try {
            await axios.put(`${API}/admin/orders/${orderId}/status?status=${newStatus}`, {}, axiosConfig);
            toast.success('Order status updated!', { id: toastId });
            // Refresh the orders list to show the change
            fetchOrders();
        } catch (error) {
            toast.error('Failed to update status.', { id: toastId });
            console.error(error);
        }
    };

    if (loading) {
        return <div>Loading orders...</div>;
    }

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Order Management</h2>
            <div className="space-y-4">
                {orders.length > 0 ? (
                    orders.map(order => (
                        <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="font-semibold">Order #{order.id.substring(0, 8)}</p>
                                    <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">{order.customer_name}</p>
                                    <p className="text-sm text-gray-600">{order.customer_email}</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Total: ₹{order.total_amount.toFixed(2)}</p>
                                    <p className="text-sm text-gray-600">Payment: {order.payment_method.toUpperCase()}</p>
                                </div>
                                <div>
                                    <label htmlFor={`status-${order.id}`} className="block text-sm font-medium text-gray-700">Order Status</label>
                                    <select
                                        id={`status-${order.id}`}
                                        value={order.order_status}
                                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                    >
                                        <option>Placed</option>
                                        <option>Confirmed</option>
                                        <option>Shipped</option>
                                        <option>Delivered</option>
                                        <option>Cancelled</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p>No orders found.</p>
                )}
            </div>
        </div>
    );
}

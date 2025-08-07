import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ProductManagement } from '../components/admin/ProductManagement';
import { OrderManagement } from '../components/admin/OrderManagement'; // <-- Import OrderManagement

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

//=================================================================
// Admin Login Component
//=================================================================
const AdminLogin = ({ onLogin }) => {
    const [username, setUsername] = useState('admin'); // Default for easier testing
    const [password, setPassword] = useState('admin'); // Default for easier testing

    const handleLogin = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Logging in...');
        try {
            const config = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };
            const body = `username=${username}&password=${password}`;
            const response = await axios.post(`${API}/admin/login`, body, config);
            onLogin(response.data.access_token);
            toast.success('Admin login successful!', { id: toastId });
        } catch (error) {
            toast.error('Admin login failed. Check credentials.', { id: toastId });
            console.error(error);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center">Admin Login</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full px-4 py-2 border rounded-lg"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2 border rounded-lg"
                    />
                    <button type="submit" className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};


//=================================================================
// Admin Dashboard Component
//=================================================================
const AdminDashboard = ({ token, onLogout }) => {
    const [activeTab, setActiveTab] = useState('products');

    const axiosConfig = {
        headers: { Authorization: `Bearer ${token}` }
    };

    return (
        <div>
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
                    {['products', 'categories', 'orders'].map(tab => (
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
                {activeTab === 'categories' && <div>Category Management Coming Soon...</div>}
                {activeTab === 'orders' && <OrderManagement axiosConfig={axiosConfig} />}
            </div>
        </div>
    );
};


//=================================================================
// Main AdminPage Component
//=================================================================
export function AdminPage() {
    const [token, setToken] = useState(localStorage.getItem('adminToken'));

    const handleLogin = (newToken) => {
        localStorage.setItem('adminToken', newToken);
        setToken(newToken);
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        setToken(null);
        toast.success('Logged out.');
    };

    if (!token) {
        return <AdminLogin onLogin={handleLogin} />;
    }

    return <AdminDashboard token={token} onLogout={handleLogout} />;
}

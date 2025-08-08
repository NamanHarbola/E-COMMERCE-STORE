import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export function CategoryManagement({ axiosConfig }) {
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API}/categories`);
            setCategories(response.data);
        } catch (error) {
            toast.error('Failed to fetch categories.');
        }
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await axios.post(`${API}/admin/categories`, formData, axiosConfig);
            toast.success('Category created successfully!');
            setFormData({ name: '', description: '' }); // Reset form
            fetchCategories(); // Refresh list
        } catch (error) {
            toast.error('Failed to create category.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (categoryId) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            try {
                await axios.delete(`${API}/admin/categories/${categoryId}`, axiosConfig);
                toast.success('Category deleted.');
                fetchCategories(); // Refresh list
            } catch (error) {
                toast.error('Failed to delete category.');
            }
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-6">Category Management</h2>

            {/* Add Category Form */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-lg font-medium">Add New Category</h3>
                    <input
                        name="name"
                        value={formData.name}
                        onChange={handleFormChange}
                        placeholder="Category Name"
                        required
                        className="w-full p-2 border rounded"
                    />
                    <input
                        name="description"
                        value={formData.description}
                        onChange={handleFormChange}
                        placeholder="Description"
                        required
                        className="w-full p-2 border rounded"
                    />
                    <button type="submit" disabled={isLoading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400">
                        {isLoading ? 'Adding...' : 'Add Category'}
                    </button>
                </form>
            </div>

            {/* Existing Categories List */}
            <div className="bg-white rounded-lg shadow-md">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="p-3 text-left">Name</th>
                            <th className="p-3 text-left">Description</th>
                            <th className="p-3 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(cat => (
                            <tr key={cat.id} className="border-b">
                                <td className="p-3 font-medium">{cat.name}</td>
                                <td className="p-3">{cat.description}</td>
                                <td className="p-3">
                                    <button onClick={() => handleDelete(cat.id)} className="text-red-600">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

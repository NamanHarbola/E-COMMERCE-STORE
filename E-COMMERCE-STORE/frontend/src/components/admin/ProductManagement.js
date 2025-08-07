import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export function ProductManagement({ axiosConfig }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: '', // Will hold the selected category name
        stock: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch both products and categories when the component loads
    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await axios.get(`${API}/products`);
            setProducts(response.data);
        } catch (error) {
            toast.error('Failed to fetch products.');
        }
    };

    const fetchCategories = async () => {
        try {
            // This is a public endpoint, so no auth is needed, but it's good practice
            const response = await axios.get(`${API}/categories`, axiosConfig);
            setCategories(response.data);
        } catch (error) {
            toast.error('Failed to fetch categories for the form.');
        }
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        if (e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', description: '', price: '', category: '', stock: '' });
        setImageFile(null);
        setEditingProduct(null);
        setShowForm(false);
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            stock: product.stock,
        });
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        const productData = new FormData();
        productData.append('name', formData.name);
        productData.append('description', formData.description);
        productData.append('price', formData.price);
        productData.append('category', formData.category);
        productData.append('stock', formData.stock);
        if (imageFile) {
            productData.append('image', imageFile);
        }

        const toastId = toast.loading(editingProduct ? 'Updating product...' : 'Creating product...');

        try {
            const url = editingProduct 
                ? `${API}/admin/products-with-image/${editingProduct.id}` 
                : `${API}/admin/products-with-image`;
            
            const method = editingProduct ? 'put' : 'post';

            await axios[method](url, productData, axiosConfig);
            
            toast.success(editingProduct ? 'Product updated!' : 'Product created!', { id: toastId });
            resetForm();
            fetchProducts(); // Refresh product list
        } catch (error) {
            toast.error('Operation failed. Please check the details.', { id: toastId });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (productId) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await axios.delete(`${API}/admin/products/${productId}`, axiosConfig);
                toast.success('Product deleted.');
                fetchProducts();
            } catch (error) {
                toast.error('Failed to delete product.');
            }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Product Management</h2>
                <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Add Product
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input name="name" value={formData.name} onChange={handleFormChange} placeholder="Name" required className="w-full p-2 border rounded" />
                        <textarea name="description" value={formData.description} onChange={handleFormChange} placeholder="Description" required className="w-full p-2 border rounded" />
                        <input name="price" type="number" step="0.01" value={formData.price} onChange={handleFormChange} placeholder="Price" required className="w-full p-2 border rounded" />
                        <input name="stock" type="number" value={formData.stock} onChange={handleFormChange} placeholder="Stock" required className="w-full p-2 border rounded" />
                        
                        {/* Corrected Category Select Dropdown */}
                        <select name="category" value={formData.category} onChange={handleFormChange} required className="w-full p-2 border rounded">
                            <option value="" disabled>Select a Category</option>
                            {categories.length > 0 ? (
                                categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)
                            ) : (
                                <option disabled>Loading categories...</option>
                            )}
                        </select>
                        
                        <input type="file" onChange={handleImageChange} className="w-full p-2 border rounded" />
                        <div className="flex gap-4">
                            <button type="submit" disabled={isLoading} className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400">
                                {isLoading ? 'Saving...' : 'Save Product'}
                            </button>
                            <button type="button" onClick={resetForm} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="p-3 text-left">Product</th>
                            <th className="p-3 text-left">Category</th>
                            <th className="p-3 text-left">Price</th>
                            <th className="p-3 text-left">Stock</th>
                            <th className="p-3 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id} className="border-b">
                                <td className="p-3">{product.name}</td>
                                <td className="p-3">{product.category}</td>
                                <td className="p-3">₹{product.price}</td>
                                <td className="p-3">{product.stock}</td>
                                <td className="p-3 flex gap-2">
                                    <button onClick={() => handleEdit(product)} className="text-blue-600">Edit</button>
                                    <button onClick={() => handleDelete(product.id)} className="text-red-600">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

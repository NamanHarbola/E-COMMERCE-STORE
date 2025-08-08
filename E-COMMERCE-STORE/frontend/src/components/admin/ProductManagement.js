import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Import shadcn/ui components using the correct path alias
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/ui/table";

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const BACKEND_URL = 'http://localhost:8000';

const initialFormData = {
    name: '',
    description: '',
    price: '',
    category: '',
    stock: ''
};

export function ProductManagement({ axiosConfig }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchCategories();
        fetchProducts();
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
            const response = await axios.get(`${API}/categories`);
            setCategories(response.data);
        } catch (error) {
            toast.error('Failed to fetch categories for the form.');
        }
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const resetForm = () => {
        setFormData(initialFormData);
        setImageFile(null);
        setEditingProduct(null);
        setImagePreview('');
        setIsDialogOpen(false);
    };

    const handleAddNew = () => {
        resetForm();
        setIsDialogOpen(true);
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
        if (product.image_url) {
            setImagePreview(product.image_url); // Cloudinary provides a full URL
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.category) {
            toast.error("Please select a category.");
            return;
        }
        setIsLoading(true);
        const toastId = toast.loading('Saving product...');
        
        const productPayload = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            productPayload.append(key, value);
        });
        if (imageFile) {
            productPayload.append('image', imageFile);
        }

        try {
            const url = editingProduct 
                ? `${API}/admin/products-with-image/${editingProduct.id}` 
                : `${API}/admin/products-with-image`;
            const method = editingProduct ? 'put' : 'post';

            await axios[method](url, productPayload, axiosConfig);
            
            toast.success('Product saved!', { id: toastId });
            resetForm();
            fetchProducts();
        } catch (error) {
            toast.error('Operation failed.', { id: toastId });
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
                <Button onClick={handleAddNew}>Add Product</Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                        <DialogDescription>
                            Fill in the details for the product here. Click save when you're done.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleFormChange} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Description</Label>
                            <Textarea id="description" name="description" value={formData.description} onChange={handleFormChange} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">Price</Label>
                            <Input id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleFormChange} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stock" className="text-right">Stock</Label>
                            <Input id="stock" name="stock" type="number" value={formData.stock} onChange={handleFormChange} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">Category</Label>
                            <select id="category" name="category" value={formData.category} onChange={handleFormChange} required className="col-span-3 w-full p-2 border rounded">
                                <option value="" disabled>-- Select a Category --</option>
                                {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="image" className="text-right">Image</Label>
                            <Input id="image" type="file" onChange={handleImageChange} className="col-span-3" />
                        </div>
                        {imagePreview && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <div className="col-start-2 col-span-3">
                                    <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-md" />
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Save Product'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Image</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map(product => (
                            <TableRow key={product.id}>
                                <TableCell>
                                    <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded" />
                                </TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell>₹{product.price}</TableCell>
                                <TableCell>{product.stock}</TableCell>
                                <TableCell className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>Edit</Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>Delete</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

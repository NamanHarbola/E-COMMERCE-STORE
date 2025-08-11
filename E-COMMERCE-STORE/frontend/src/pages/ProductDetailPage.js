import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useCart } from '../App'; // Assuming useCart is exported from App.js

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export function ProductDetailPage() {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const { productId } = useParams();
    const { addToCart } = useCart();

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API}/products/${productId}`);
                setProduct(response.data);
            } catch (error) {
                toast.error("Could not find product.");
                console.error("Fetch product error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [productId]);

    if (loading) {
        return <div className="text-center py-20">Loading Product...</div>;
    }

    if (!product) {
        return <div className="text-center py-20">Product not found.</div>;
    }

    return (
        <div className="bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid md:grid-cols-2 gap-12 items-start">
                    {/* Product Image */}
                    <div>
                        <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-full h-auto object-cover rounded-lg shadow-lg"
                        />
                    </div>

                    {/* Product Details */}
                    <div>
                        <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">{product.category}</span>
                        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mt-4">{product.name}</h1>
                        <p className="text-3xl text-gray-900 mt-4">₹{product.price.toFixed(2)}</p>
                        
                        <div className="mt-6">
                            <h3 className="text-lg font-medium text-gray-900">Description</h3>
                            <p className="mt-2 text-base text-gray-600">{product.description}</p>
                        </div>

                        <div className="mt-8">
                            <button 
                                onClick={() => { addToCart(product); toast.success(`${product.name} added to cart!`); }}
                                className="w-full bg-blue-600 text-white font-bold py-3 px-8 rounded-md text-lg hover:bg-blue-700 transition"
                            >
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

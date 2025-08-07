import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ProductGrid } from '../App'; // We'll keep ProductGrid in App.js for now
import { ShieldCheck, Truck, MessageSquare } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export function HomePage() {
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchHomePageData = async () => {
            try {
                // Fetch first 8 products as features
                const productsResponse = await axios.get(`${API}/products`);
                setFeaturedProducts(productsResponse.data.slice(0, 8));

                // Fetch categories
                const categoriesResponse = await axios.get(`${API}/categories`);
                setCategories(categoriesResponse.data.slice(0, 4)); // Show first 4 categories
            } catch (error) {
                console.error("Error fetching homepage data:", error);
            }
        };
        fetchHomePageData();
    }, []);

    return (
        <div className="bg-white">
            {/* Hero Section */}
            <section className="bg-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                        Welcome to TechMart
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-300 mb-8">
                        Your ultimate destination for the latest and greatest in electronics.
                    </p>
                    <Link
                        to="/products"
                        className="inline-block bg-blue-600 text-white font-bold text-lg px-8 py-3 rounded-md hover:bg-blue-700 transition-transform transform hover:scale-105"
                    >
                        Shop All Products
                    </Link>
                </div>
            </section>

            {/* Features Section */}
            <section className="bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        <div className="flex flex-col items-center">
                            <Truck size={48} className="text-blue-600 mb-4" />
                            <h3 className="text-xl font-bold mb-2">Fast Shipping</h3>
                            <p className="text-gray-600">Get your orders delivered to your doorstep in record time.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <ShieldCheck size={48} className="text-blue-600 mb-4" />
                            <h3 className="text-xl font-bold mb-2">Secure Payments</h3>
                            <p className="text-gray-600">Your transactions are safe with our advanced security.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <MessageSquare size={48} className="text-blue-600 mb-4" />
                            <h3 className="text-xl font-bold mb-2">24/7 Support</h3>
                            <p className="text-gray-600">Our team is here to help you with any questions, anytime.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Categories */}
            {categories.length > 0 && (
                <section className="py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-12">Shop by Category</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {categories.map(category => (
                                <Link key={category.id} to={`/products?category=${category.name}`} className="group">
                                    <div className="bg-gray-100 rounded-lg p-8 text-center transition-all duration-300 hover:bg-blue-600 hover:shadow-xl">
                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-white">{category.name}</h3>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Featured Products */}
            {featuredProducts.length > 0 && (
                <section className="bg-gray-50 py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-12">Featured Products</h2>
                        <ProductGrid products={featuredProducts} />
                    </div>
                </section>
            )}
        </div>
    );
}

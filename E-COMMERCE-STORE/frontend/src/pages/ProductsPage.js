import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

// We will create the ProductGrid component in App.js for now
// to avoid creating too many files at once.
import { ProductGrid } from '../App'; 

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchParams, setSearchParams] = useSearchParams();

    // Get filter values from URL query parameters
    const categoryFilter = searchParams.get('category') || '';
    const searchQuery = searchParams.get('search') || '';
    const sortOption = searchParams.get('sort') || '';

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (categoryFilter) params.append('category', categoryFilter);
                if (searchQuery) params.append('search', searchQuery);
                if (sortOption) params.append('sort', sortOption);

                const response = await axios.get(`${API}/products?${params.toString()}`);
                setProducts(response.data);
            } catch (error) {
                toast.error("Could not fetch products.");
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [categoryFilter, searchQuery, sortOption]); // Refetch when filters change

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await axios.get(`${API}/categories`);
                setCategories(response.data);
            } catch (error) {
                console.error("Failed to fetch categories.");
            }
        };
        fetchCategories();
    }, []);

    // Function to update URL search parameters
    const updateFilters = (newParams) => {
        setSearchParams(prev => {
            const updated = new URLSearchParams(prev);
            Object.entries(newParams).forEach(([key, value]) => {
                if (value) {
                    updated.set(key, value);
                } else {
                    updated.delete(key);
                }
            });
            return updated;
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">{searchQuery ? `Searching for "${searchQuery}"` : "Our Products"}</h1>

            {/* Filter and Sort Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-white rounded-lg shadow">
                {/* Search Input */}
                <div className="md:col-span-1">
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <input
                        type="text"
                        id="search"
                        placeholder="Search and press Enter"
                        defaultValue={searchQuery}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                updateFilters({ search: e.target.value });
                            }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                </div>

                {/* Category Filter */}
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                        id="category"
                        value={categoryFilter}
                        onChange={(e) => updateFilters({ category: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                {/* Sort Options */}
                <div>
                    <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                    <select
                        id="sort"
                        value={sortOption}
                        onChange={(e) => updateFilters({ sort: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                        <option value="">Relevance</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                        <option value="name-asc">Name: A to Z</option>
                    </select>
                </div>
            </div>

            {/* Products Grid */}
            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : products.length > 0 ? (
                <ProductGrid products={products} />
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-600 text-lg">No products found matching your criteria.</p>
                </div>
            )}
        </div>
    );
}

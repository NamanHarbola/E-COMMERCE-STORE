import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
    return (
        <footer className="bg-gray-800 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Shop</h3>
                        <ul>
                            <li><Link to="/products" className="text-gray-400 hover:text-white">All Products</Link></li>
                            <li><Link to="/products?category=Electronics" className="text-gray-400 hover:text-white">Electronics</Link></li>
                            <li><Link to="/products?category=Appliances" className="text-gray-400 hover:text-white">Appliances</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">About Us</h3>
                        <ul>
                            <li><Link to="#" className="text-gray-400 hover:text-white">Our Story</Link></li>
                            <li><Link to="#" className="text-gray-400 hover:text-white">Careers</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Support</h3>
                        <ul>
                            <li><Link to="#" className="text-gray-400 hover:text-white">Contact Us</Link></li>
                            <li><Link to="#" className="text-gray-400 hover:text-white">FAQs</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Legal</h3>
                        <ul>
                            <li><Link to="#" className="text-gray-400 hover:text-white">Privacy Policy</Link></li>
                            <li><Link to="#" className="text-gray-400 hover:text-white">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 border-t border-gray-700 pt-8 text-center text-gray-400">
                    &copy; {new Date().getFullYear()} TechMart. All rights reserved.
                </div>
            </div>
        </footer>
    );
}

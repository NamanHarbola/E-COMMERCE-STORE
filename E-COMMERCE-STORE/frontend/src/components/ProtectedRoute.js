// In frontend/src/components/ProtectedRoute.js

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        // You can add a spinner here while auth state is being determined
        return <div>Loading...</div>;
    }

    if (!user) {
        // If user is not logged in, redirect them to the login page
        return <Navigate to="/login" />;
    }

    // If user is logged in, render the component they are trying to access
    return children;
};

export default ProtectedRoute;
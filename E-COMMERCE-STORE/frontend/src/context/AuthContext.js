import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
    });

    useEffect(() => {
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            // Fetch user data if token exists
            api.get('/me')
                .then(response => {
                    setUser(response.data);
                })
                .catch(() => {
                    // Token is invalid
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                    delete api.defaults.headers.common['Authorization'];
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = async (email, password) => {
        const config = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };
        const body = `username=${email}&password=${password}`;
        const response = await api.post('/login', body, config);
        
        const { access_token, user: userData } = response.data;
        localStorage.setItem('token', access_token);
        setToken(access_token);
        setUser(userData);
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    };

    const register = async (username, email, password) => {
        const newUser = { username, email, password };
        await api.post('/register', newUser);
        // Automatically log in the user after successful registration
        await login(email, password);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete api.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, register, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
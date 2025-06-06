// client/src/components/AuthPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/api';
import './AuthPage.css'; // Import the new CSS file

const AuthPage = ({ setIsAuthenticated }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const response = await login({
                    username: formData.username,
                    password: formData.password
                });
                
                // Store session data
                localStorage.setItem('sessionId', response.sessionId);
                localStorage.setItem('username', response.username);
                localStorage.setItem('userId', response._id);
                
                setIsAuthenticated(true);
                navigate('/chat');
            } else {
                const response = await register({
                    username: formData.username,
                    password: formData.password,
                    email: formData.email
                });
                
                // Store session data after registration
                localStorage.setItem('sessionId', response.sessionId);
                localStorage.setItem('username', response.username);
                localStorage.setItem('userId', response._id);
                
                setIsAuthenticated(true);
                navigate('/chat');
            }
        } catch (err) {
            console.error('Auth Error:', err);
            setError(err.response?.data?.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>{isLogin ? 'Login' : 'Register'}</h2>
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    )}
                    <button type="submit" disabled={loading}>
                        {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
                    </button>
                </form>
                <p className="toggle-auth">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        type="button"
                        className="link-button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                    >
                        {isLogin ? 'Register' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
};

// Remove inline CSS and injection logic
// --- CSS for AuthPage (included directly) ---
/*
const AuthPageCSS = `
.auth-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f0f2f5; }
.auth-box { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); width: 100%; max-width: 400px; text-align: center; }
.auth-box h2 { margin-bottom: 25px; color: #333; }
.input-group { margin-bottom: 20px; text-align: left; }
.input-group label { display: block; margin-bottom: 8px; color: #555; font-weight: bold; }
.input-group input { width: 100%; padding: 12px 15px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 1rem; }
.input-group input:focus { outline: none; border-color: #007bff; box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25); }
.input-group input:disabled { background-color: #e9ecef; cursor: not-allowed; }
.auth-button { width: 100%; padding: 12px; background-color: #007bff; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; transition: background-color 0.3s ease; margin-top: 10px; }
.auth-button:hover:not(:disabled) { background-color: #0056b3; }
.auth-button:disabled { background-color: #cccccc; cursor: not-allowed; }
.toggle-button { background: none; border: none; color: #007bff; cursor: pointer; margin-top: 20px; font-size: 0.9rem; }
.toggle-button:hover:not(:disabled) { text-decoration: underline; }
.toggle-button:disabled { color: #999; cursor: not-allowed; }
.error-message { color: #dc3545; margin-top: 15px; margin-bottom: 0; font-size: 0.9rem; }
`;
*/
// --- Inject CSS ---
/*
const styleTagAuthId = 'auth-page-styles';
if (!document.getElementById(styleTagAuthId)) {
    const styleTag = document.createElement("style");
    styleTag.id = styleTagAuthId;
    styleTag.type = "text/css";
    styleTag.innerText = AuthPageCSS;
    document.head.appendChild(styleTag);
}
*/
// --- End CSS Injection ---

export default AuthPage;

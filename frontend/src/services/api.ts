import axios from 'axios';
import Cookies from 'js-cookie';

export const api = axios.create({
  // Dynamically switches to your Cloudflare Tunnel URL when running the app
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
});

// Automatically attach the JWT token to every request if it exists
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


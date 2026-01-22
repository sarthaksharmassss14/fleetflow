// API Configuration
// Always use relative path /api in production deployment
const API_BASE_URL = import.meta.env.VITE_API_URL || (window.location.origin + '/api');

export default API_BASE_URL;

// API Configuration
// Use relative path '/api' in production to work with Nginx proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export default API_BASE_URL;

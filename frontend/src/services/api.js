import axios from 'axios';

// Base URL for your backend API
// In development, this points to localhost
// Later we'll change this to API Gateway URL after deployment
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// API Key for AWS API Gateway (required for Lambda access)
const API_KEY = process.env.REACT_APP_API_KEY || '';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'x-api-key': API_KEY }), // Add API key if available
  },
  timeout: 10000, // 10 seconds timeout
});

// API service object with all backend calls
const api = {
  // GET /api/items - Fetch all items
  getItems: async () => {
    const response = await apiClient.get('/items');
    return response.data;
  },

  // GET /api/items/:id - Fetch single item by ID
  getItemById: async (id) => {
    const response = await apiClient.get(`/items/${id}`);
    return response.data;
  },

  // POST /api/items - Create a new item
  createItem: async (itemData) => {
    const response = await apiClient.post('/items', itemData);
    return response.data;
  },

  // GET /api/hello - Test endpoint
  testConnection: async () => {
    const response = await apiClient.get('/hello');
    return response.data;
  },

  // File upload to S3
  uploadFile: async (itemId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/items/${itemId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get presigned URL for downloading a file
  getFileUrl: async (itemId, fileId) => {
    const response = await apiClient.get(`/items/${itemId}/files/${fileId}`);
    return response.data;
  },

  // Delete a file from an item
  deleteFile: async (itemId, fileId) => {
    const response = await apiClient.delete(`/items/${itemId}/files/${fileId}`);
    return response.data;
  },
};

export default api;

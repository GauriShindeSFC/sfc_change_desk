// Shared API Client Library Utility
const BASE_URL = 'http://localhost:5001/api/dashboard';

export const apiClient = {
  get: async (endpoint) => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`[apiClient.get] Error fetching ${endpoint}:`, error);
      throw error;
    }
  },

  post: async (endpoint, payload) => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`[apiClient.post] Error requesting ${endpoint}:`, error);
      throw error;
    }
  }
};

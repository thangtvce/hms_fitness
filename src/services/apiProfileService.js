import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
  
    if (error.response?.status === 401) {
      throw new Error(error.response?.data?.message || 'Unauthorized access');
    }
    return Promise.reject(error);
  }
);

export const profileService = {
  async getLatestProfile(userId) {
    try {
      const response = await apiClient.get(`/Profile/${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },


  async getProfileByProfileId(profileId) {
    try {
      const response = await apiClient.get(`/Profile/by-profile-id/${profileId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateProfile(userId,profileData) {
    try {
      const response = await apiClient.put(`/Profile/${userId}`,profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async registerProfile(profileData) {
    try {
      const response = await apiClient.post('/Profile/register',profileData);
      return response.data;
    } catch (error) {
      throw error?.response?.data;
    }
  },
};

export default profileService;
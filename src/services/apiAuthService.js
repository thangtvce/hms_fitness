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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        const response = await apiClient.post('/Auth/refresh-token',{ refreshToken });
        if (response.data.statusCode === 200 && response.data.data) {
          const { accessToken: newAccessToken,refreshToken: newRefreshToken } = response.data.data;
          await AsyncStorage.setItem('accessToken',newAccessToken);
          await AsyncStorage.setItem('refreshToken',newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['accessToken','refreshToken','user']);
        throw refreshError;
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async register(dataRegister) {
    try {
      const response = await apiClient.post('/Auth/register/m',dataRegister);
      return response.data;
    } catch (error) {

      throw error?.response?.data;
    }
  },
  async login({ email,password }) {
    try {
      const response = await apiClient.post('/Auth/login/u',{ email,password });
      if (response.data.statusCode === 200 && response.data.data) {
        const { accessToken,refreshToken,userId,username,roles } = response.data.data;
        await AsyncStorage.setItem('accessToken',accessToken);
        await AsyncStorage.setItem('refreshToken',refreshToken);
        const userData = JSON.stringify({ userId,email: username,roles });
        await AsyncStorage.setItem('user',userData);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async googleLogin({ token }) {
    try {
      const response = await apiClient.post('/Auth/google-login',{ token });
      if (response.data.statusCode === 200 && response.data.data) {
        const { accessToken,refreshToken,userId,username,roles } = response.data.data;
        await AsyncStorage.setItem('accessToken',accessToken);
        await AsyncStorage.setItem('refreshToken',refreshToken);
        const userData = JSON.stringify({ userId,email: username,roles });
        await AsyncStorage.setItem('user',userData);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async facebookLogin({ token }) {
    try {
      const response = await apiClient.post('/Auth/facebook-login',{ token });
      if (response.data.statusCode === 200 && response.data.data) {
        const { accessToken,refreshToken,userId,username,roles } = response.data.data;
        await AsyncStorage.setItem('accessToken',accessToken);
        await AsyncStorage.setItem('refreshToken',refreshToken);
        const userData = JSON.stringify({ userId,email: username,roles });
        await AsyncStorage.setItem('user',userData);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async activateAccount({ userId,token }) {
    try {
      const response = await apiClient.get(`/Auth/activate?userId=${userId}&token=${encodeURIComponent(token)}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async logout() {
    try {
      const response = await apiClient.post('/Auth/logout');
      await AsyncStorage.multiRemove(['accessToken','refreshToken','user']);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async refreshToken() {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token available');
      const response = await apiClient.post('/Auth/refresh-token',{ refreshToken });
      if (response.data.statusCode === 200 && response.data.data) {
        const { accessToken: newAccessToken,refreshToken: newRefreshToken } = response.data.data;
        await AsyncStorage.setItem('accessToken',newAccessToken);
        await AsyncStorage.setItem('refreshToken',newRefreshToken);
        return { accessToken: newAccessToken,refreshToken: newRefreshToken };
      } else {
        throw new Error('Failed to refresh token');
      }
    } catch (error) {
      await AsyncStorage.multiRemove(['accessToken','refreshToken','user']);
      throw error;
    }
  },
  async forgotPassword({ email }) {
    try {
      const response = await apiClient.post('/Auth/forgot-password',{ email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async changePassword({ email }) {
    try {
      const response = await apiClient.post('/Auth/change-password',{ email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async resetPassword({ email,otpCode,newPassword }) {
    try {
      const response = await apiClient.post('/Auth/reset-password',{ email,otpCode,newPassword });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default authService;
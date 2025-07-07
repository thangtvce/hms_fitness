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
        throw new Error('Failed to refresh token');
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['accessToken','refreshToken','user']);
        throw new Error('Unauthorized access, please log in again.');
      }
    }

    if (error.response?.status === 400 && error.response?.data?.errors) {
      const errorMessages = Object.values(error.response.data.errors).flat().join(', ');
      throw new Error(errorMessages || 'Invalid request data.');
    }
    throw new Error(error.response?.data?.message || error.message);
  }
);

export const bodyMeasurementService = {
  async getMyMeasurements(queryParams = {}) {
    try {
      const response = await apiClient.get('/BodyMeasurement/me',{ queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getMeasurementById(measurementId) {
    try {
      const response = await apiClient.get(`/BodyMeasurement/me/${measurementId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async addMeasurement(measurementData) {
    try {
      const response = await apiClient.post('/BodyMeasurement',measurementData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateMeasurement(measurementId,measurementData) {
    try {
      const response = await apiClient.put(`/BodyMeasurement/${measurementId}`,measurementData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async deleteMeasurement(measurementId) {
    try {
      const response = await apiClient.delete(`/BodyMeasurement/${measurementId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getUserStatistics(userId,startDate,endDate) {
    try {
      const params = { startDate,endDate };
      const response = await apiClient.get(`/BodyMeasurement/user/${userId}/statistics`,{ params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getMyStatistics(startDate,endDate) {
    try {
      const params = { startDate,endDate };
      const response = await apiClient.get('/BodyMeasurement/me/statistics',{ params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getAverageMeasurementsByPeriod(userId,period) {
    try {
      const response = await apiClient.get(`/BodyMeasurement/user/${userId}/average/period`,{ params: { period } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getMyAverageMeasurementsByPeriod(period) {
    try {
      const response = await apiClient.get('/BodyMeasurement/me/average/period',{ params: { period } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default bodyMeasurementService;
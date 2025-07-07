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

export const weightHistoryService = {
  async getAllWeightHistory(queryParams = {},minWeight,maxWeight) {
    try {
      const params = { ...queryParams,minWeight,maxWeight };
      const response = await apiClient.get('/WeightHistory',{ params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getWeightHistoryByUserId(userId,queryParams = {}) {
    try {
      const response = await apiClient.get(`/WeightHistory/user/${userId}`,{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getMyWeightHistory(queryParams = {}) {
    try {
      const response = await apiClient.get('/WeightHistory/me',{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getWeightHistoryById(historyId) {
    try {
      const response = await apiClient.get(`/WeightHistory/${historyId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async addWeightHistory(weightHistoryData) {
    try {
      const response = await apiClient.post('/WeightHistory',weightHistoryData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateWeightHistory(historyId,weightHistoryData) {
    try {
      const response = await apiClient.put(`/WeightHistory/${historyId}`,weightHistoryData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async deleteWeightHistory(historyId) {
    try {
      const response = await apiClient.delete(`/WeightHistory/${historyId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getUserStatistics(userId,startDate,endDate) {
    try {
      const params = { startDate,endDate };
      const response = await apiClient.get(`/WeightHistory/user/${userId}/statistics`,{ params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getMyStatistics(startDate,endDate) {
    try {
      const params = { startDate,endDate };
      const response = await apiClient.get('/WeightHistory/me/statistics',{ params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getAverageWeightByPeriod(userId,period) {
    try {
      const response = await apiClient.get(`/WeightHistory/user/${userId}/average/period`,{ params: { period } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getMyAverageWeightByPeriod(period) {
    try {
      const response = await apiClient.get('/WeightHistory/me/average/period',{ params: { period } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getAverageWeight(userId,startDate,endDate) {
    try {
      const params = { startDate,endDate };
      const response = await apiClient.get(`/WeightHistory/user/${userId}/average`,{ params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getMyAverageWeight(startDate,endDate) {
    try {
      const params = { startDate,endDate };
      const response = await apiClient.get('/WeightHistory/me/average',{ params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default weightHistoryService;
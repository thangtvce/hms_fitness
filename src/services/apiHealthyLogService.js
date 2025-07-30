import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

const apiHealthyLogClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiHealthyLogClient.interceptors.request.use(
  async (config) => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiHealthyLogClient.interceptors.response.use(
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
        const response = await apiHealthyLogClient.post('/Auth/refresh-token',{ refreshToken });
        if (response.data.statusCode === 200 && response.data.data) {
          const { accessToken: newAccessToken,refreshToken: newRefreshToken } = response.data.data;
          await AsyncStorage.setItem('accessToken',newAccessToken);
          await AsyncStorage.setItem('refreshToken',newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiHealthyLogClient(originalRequest);
        }
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['accessToken','refreshToken','user']);
        throw refreshError;
      }
    }
    return Promise.reject(error);
  }
);

export const healthyLogService = {
  async getMyHealthLogs(params = {}) {
    try {
      const response = await apiHealthyLogClient.get('/HealthLog/me',{ params });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  async getHealthLogById(id) {
    if (!id || id <= 0) throw new Error('Valid log id is required.');
    try {
      const response = await apiHealthyLogClient.get(`/HealthLog/${id}`);
      return response.data.data; // Trả về object chi tiết log
    } catch (error) {
      throw error;
    }
  },

  async createHealthLog(logDto) {
    if (!logDto || typeof logDto !== 'object') throw new Error('Log payload is required.');
    try {
      const response = await apiHealthyLogClient.post('/HealthLog',logDto);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  async createHealthLogsBulk(logDtos) {
    if (!Array.isArray(logDtos) || logDtos.length === 0) throw new Error('Log list cannot be empty.');
    try {
      const response = await apiHealthyLogClient.post('/HealthLog/bulk',logDtos);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  async updateHealthLog(id,logDto) {
    if (!id || id <= 0) throw new Error('Valid log id is required.');
    if (!logDto || typeof logDto !== 'object') throw new Error('Log payload is required.');
    try {
      const response = await apiHealthyLogClient.put(`/HealthLog/${id}`,logDto);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  async deleteHealthLog(id) {
    if (!id || id <= 0) throw new Error('Valid log id is required.');
    try {
      const response = await apiHealthyLogClient.delete(`/HealthLog/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getMyHealthLogStatistics(params = {}) {
    if (params.StartDate && params.EndDate && new Date(params.StartDate) > new Date(params.EndDate)) {
      throw new Error('StartDate must be earlier than or equal to EndDate.');
    }
    try {
      const response = await apiHealthyLogClient.get('/HealthLog/statistics/me',{ params });
      return response.data.data;
    } catch (error) {
      if (error.response?.data) throw error.response.data;
      throw error;
    }
  },
};

export default apiHealthyLogClient;

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
        const response = await apiHealthyLogClient.post('/Auth/refresh-token', { refreshToken });
        if (response.data.statusCode === 200 && response.data.data) {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
          await AsyncStorage.setItem('accessToken', newAccessToken);
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiHealthyLogClient(originalRequest);
        }
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw refreshError;
      }
    }
    return Promise.reject(error);
  }
);

export const healthyLogService = {
  async getMyHealthLogs(params = {}) {
    try {
      const response = await apiHealthyLogClient.get('/HealthLog/me', { params });
      // Chuẩn hóa trả về đúng structure backend
      return response.data.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch health logs');
    }
  },

  async getHealthLogById(id) {
    if (!id || id <= 0) throw new Error('Valid log id is required.');
    try {
      const response = await apiHealthyLogClient.get(`/HealthLog/${id}`);
      return response.data.data; // Trả về object chi tiết log
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch health log by id');
    }
  },

  async createHealthLog(logDto) {
    if (!logDto || typeof logDto !== 'object') throw new Error('Log payload is required.');
    try {
      const response = await apiHealthyLogClient.post('/HealthLog', logDto);
      return response.data.data; // Trả về object log vừa tạo
    } catch (error) {
      // Nếu có lỗi validation, trả về luôn lỗi từ backend
      if (error.response?.data) throw error.response.data;
      throw new Error(error.message || 'Failed to create health log');
    }
  },

  async createHealthLogsBulk(logDtos) {
    if (!Array.isArray(logDtos) || logDtos.length === 0) throw new Error('Log list cannot be empty.');
    try {
      const response = await apiHealthyLogClient.post('/HealthLog/bulk', logDtos);
      return response.data.data; // Trả về object chứa createdLogs, failedLogs, ...
    } catch (error) {
      if (error.response?.data) throw error.response.data;
      throw new Error(error.message || 'Failed to create health logs in bulk');
    }
  },

  async updateHealthLog(id, logDto) {
    if (!id || id <= 0) throw new Error('Valid log id is required.');
    if (!logDto || typeof logDto !== 'object') throw new Error('Log payload is required.');
    try {
      const response = await apiHealthyLogClient.put(`/HealthLog/${id}`, logDto);
      return response.data.data; // Trả về object log đã cập nhật
    } catch (error) {
      if (error.response?.data) throw error.response.data;
      throw new Error(error.message || 'Failed to update health log');
    }
  },

  async deleteHealthLog(id) {
    if (!id || id <= 0) throw new Error('Valid log id is required.');
    try {
      const response = await apiHealthyLogClient.delete(`/HealthLog/${id}`);
      return response.data; // Trả về object response từ backend (status, message, ...)
    } catch (error) {
      if (error.response?.data) throw error.response.data;
      throw new Error(error.message || 'Failed to delete health log');
    }
  },

  async getMyHealthLogStatistics(params = {}) {
    if (params.StartDate && params.EndDate && new Date(params.StartDate) > new Date(params.EndDate)) {
      throw new Error('StartDate must be earlier than or equal to EndDate.');
    }
    try {
      const response = await apiHealthyLogClient.get('/HealthLog/statistics/me', { params });
      return response.data.data; // Trả về object thống kê
    } catch (error) {
      if (error.response?.data) throw error.response.data;
      throw new Error(error.message || 'Failed to fetch health log statistics');
    }
  },
};

export default apiHealthyLogClient;

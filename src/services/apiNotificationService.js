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

const apiNotificationService = {
  getNotificationsByUserId: async (userId,queryParams = {},includeRead = false) => {
    try {
      const params = { includeRead,...queryParams };
      const response = await apiClient.get(`/Notification/user/${userId}`,{ params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch notifications for user.' };
    }
  },

  getNotificationById: async (id) => {
    try {
      const response = await apiClient.get(`/Notification/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch notification.' };
    }
  },


  updateNotificationReadStatus: async (updateDto) => {
    try {
      const response = await apiClient.post('/Notification/read',updateDto);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update read status.' };
    }
  },

  markAllNotificationsRead: async (userId) => {
    try {
      const response = await apiClient.post(`/Notification/mark-all-read`,null,{ params: { userId } });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark all notifications as read.' };
    }
  },


  deleteNotification: async (id) => {
    try {
      const response = await apiClient.delete(`/Notification/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete notification.' };
    }
  },

  markNotificationsUnread: async (updateDto) => {
    try {
      const response = await apiClient.post('/Notification/unread',updateDto);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark notifications as unread.' };
    }
  },

  markAllNotificationsUnread: async (userId) => {
    try {
      const response = await apiClient.post(`/Notification/unread-mark-all`,null,{ params: { userId } });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark all notifications as unread.' };
    }
  },

  deleteExpiredNotifications: async (userId) => {
    try {
      const response = await apiClient.delete(`/Notification/expired`,{ params: { userId } });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete expired notifications.' };
    }
  },

  markNotificationsRead: async (updateDto) => {
    try {
      const response = await apiClient.post('/Notification/read',updateDto);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark notifications as read.' };
    }
  },
};

export default apiNotificationService;
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

export const apiReminderService = {
  async getReminderPlansByUserId(userId, params = {}) {
    const res = await apiClient.get(`/ReminderPlan/user/${userId}`, { params });
    return res.data;
  },

  async getReminderPlanById(id) {
    const res = await apiClient.get(`/ReminderPlan/${id}`);
    return res.data;
  },

  async addReminderPlan(plan) {
    const res = await apiClient.post(`/ReminderPlan`, plan);
    return res.data;
  },

  async updateReminderPlan(id, plan) {
    const res = await apiClient.put(`/ReminderPlan/${id}`, plan);
    return res.data;
  },

  async softDeleteReminderPlan(id) {
    const res = await apiClient.delete(`/ReminderPlan/${id}`);
    return res.data;
  },
};

export default  apiReminderService ;

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

const apiWorkoutPlanClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiWorkoutPlanClient.interceptors.request.use(
  async (config) => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiWorkoutPlanClient.interceptors.response.use(
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
        const response = await apiWorkoutPlanClient.post('/Auth/refresh-token', { refreshToken });
        if (response.data.statusCode === 200 && response.data.data) {
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
          await AsyncStorage.setItem('accessToken', newAccessToken);
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiWorkoutPlanClient(originalRequest);
        }
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        throw refreshError;
      }
    }
    return Promise.reject(error);
  }
);


export async function getPlansByUserId(userId, queryParams = {}) {
  try {
    const params = { ...queryParams };
    const response = await apiWorkoutPlanClient.get(`/WorkoutPlan/user/${userId}`, { params });
    return response.data;
  } catch (error) {
    // Log lỗi chi tiết để debug
    throw error?.response?.data || error;
  }
}


export async function getPlanById(planId) {
  try {
    const response = await apiWorkoutPlanClient.get(`/WorkoutPlan/${planId}`);
    return response.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
}


export async function getExercisesByPlanId(planId, queryParams = {}) {
  try {
    const params = { ...queryParams };
    const response = await apiWorkoutPlanClient.get(`/WorkoutPlanExercise/plan/${planId}`, { params });
    return response.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
}


export async function getPlanExerciseById(planExerciseId) {
  try {
    const response = await apiWorkoutPlanClient.get(`/WorkoutPlanExercise/${planExerciseId}`);
    return response.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
}


export async function getSubscriptionsByUserId(userId, queryParams = {}) {
  try {
    const params = { ...queryParams };
    const response = await apiWorkoutPlanClient.get(`/Subscription/user/${userId}`, { params });
    return response.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
}


export async function addTrainerRating(ratingDto) {
  try {
    const response = await apiWorkoutPlanClient.post('/TrainerRating', ratingDto);
    return response.data;
  } catch (error) {
    throw error?.response?.data || error;
  }
}

export default apiWorkoutPlanClient;

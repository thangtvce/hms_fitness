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

export const apiUserWaterLogService = {
    async getAllWaterLogs(queryParams = {}) {
        try {
            const response = await apiClient.get('/UserWaterLog',{ params: queryParams });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getUserWaterLogs(userId,queryParams = {}) {
        try {
            const response = await apiClient.get(`/UserWaterLog/user/${userId}`,{ params: queryParams });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getMyWaterLogs(queryParams = {}) {
        try {
            const response = await apiClient.get('/UserWaterLog/me',{ params: queryParams });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getWaterLogById(waterLogId) {
        try {
            const response = await apiClient.get(`/UserWaterLog/me/${waterLogId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async addWaterLog(waterLogData) {
        try {
            const response = await apiClient.post('/UserWaterLog',waterLogData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async updateWaterLog(waterLogId,waterLogData) {
        try {
            const response = await apiClient.put(`/UserWaterLog/${waterLogId}`,waterLogData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async deleteWaterLog(waterLogId) {
        try {
            const response = await apiClient.delete(`/UserWaterLog/${waterLogId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getUserStatistics(userId,startDate,endDate) {
        try {
            const params = { startDate,endDate };
            const response = await apiClient.get(`/UserWaterLog/user/${userId}/statistics`,{ params });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getMyStatistics(startDate,endDate) {
        try {
            const params = { startDate,endDate };
            const response = await apiClient.get('/UserWaterLog/me/statistics',{ params });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getAverageWaterIntakeByPeriod(userId,period) {
        try {
            const response = await apiClient.get(`/UserWaterLog/user/${userId}/average/period`,{ params: { period } });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getMyAverageWaterIntakeByPeriod(period) {
        try {
            const response = await apiClient.get('/UserWaterLog/me/average/period',{ params: { period } });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
};

export default apiUserWaterLogService;
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

export const apiChatSupportService = {
    async createCallRoom({ userId,trainerId }) {
        try {
            const response = await apiClient.post('/CallSupport/create-room',{ userId,trainerId });
            return response.data;
        } catch (error) {
            throw error?.response?.data || error;
        }
    },
    async createCallRoomFromTrainer({ userId,trainerId }) {
        try {
            const response = await apiClient.post('/CallSupport/create-room/trainer',{ userId,trainerId });
            return response.data;
        } catch (error) {
            throw error?.response?.data || error;
        }
    },
    async validateRoom({ roomId,currentUserId }) {
        try {
            const response = await apiClient.get(`/CallSupport/validate-room/${roomId}?currentUserId=${currentUserId}`);
            return response.data;
        } catch (error) {
            throw error?.response?.data || error;
        }
    },
    async rejectCall({ roomId,rejectorId }) {
        try {
            const response = await apiClient.post('/CallSupport/reject-call',{ roomId,rejectorId });
            return response.data;
        } catch (error) {
            throw error?.response?.data || error;
        }
    },
    async acceptCall({ roomId,acceptorId }) {
        try {
            const response = await apiClient.post('/CallSupport/accept-call',{ roomId,acceptorId });
            return response.data;
        } catch (error) {
            throw error?.response?.data || error;
        }
    },
};

export default apiChatSupportService;
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

export const apiSubscriptionService = {
    async getMySubscription(queryParams = {},userId) {
        try {
            const response = await apiClient.get(`/Subscription/user/${userId}`,{
                queryParams
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
};

export default apiSubscriptionService;
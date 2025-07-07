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

export const apiUserPaymentService = {
    subscribeToPackage: async (purchaseDto) => {
        try {
            const response = await apiClient.post('/UserPayment/purchase/m',purchaseDto);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to create payment.' };
        }
    },

    checkPaymentStatus: async (paymentCode,subscriptionId,status) => {
        try {
            const response = await apiClient.get(`/UserPayment/${paymentCode}/payment-status?subscriptionId=${subscriptionId}&status=${status}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Failed to update payment.' };
        }
    }

};

export default apiUserPaymentService;
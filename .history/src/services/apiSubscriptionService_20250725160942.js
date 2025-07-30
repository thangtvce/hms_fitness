    // Kiểm tra user đã đánh giá subscription này chưa
    async hasUserRatedSubscription(userId, subscriptionId) {
        try {
            const response = await apiClient.get(`/TrainerRating/user/${userId}/subscription/${subscriptionId}`);
            // Trả về response.data.data (null nếu chưa đánh giá, object nếu đã đánh giá)
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },
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
    async getMySubscription(queryParams = {}, userId) {
        try {
            const response = await apiClient.get(`/Subscription/user/${userId}`, {
                queryParams
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Lấy danh sách các subscription cần review cho user hiện tại
    async getSubscriptionsNeedToReviewForUser(queryParams = {}) {
        try {
            const response = await apiClient.get('/Subscription/need-to-review/user/me', {
                params: queryParams
            });
            // Trả về response.data.data để lấy đúng object chứa subscriptions, totalCount, ...
            return response.data.data;
        } catch (error) {
            throw error;
        }
    },
};

export default apiSubscriptionService;
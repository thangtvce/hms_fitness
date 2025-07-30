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

const apiPersonalRecommendationService = {
    createRecommendation: async () => {
        const res = await apiClient.post("/PersonalAI/me");
        return res;
    },

    validateSession: async (sessionId) => {
        const res = await apiClient.get(`/PersonalAI/validate-session/${sessionId}`);
        return res;
    },

    getChatHistory: async (sessionId) => {
        const res = await apiClient.get(`/PersonalAI/chat-history/${sessionId}`);
        return res;
    },

    sendMessage: async (sessionId,message) => {
        const res = await apiClient.post(`/PersonalAI/chat/${sessionId}`,{ message });
        return res;
    },

    deleteSession: async (sessionId) => {
        const res = await apiClient.delete(`/PersonalAI/session/${sessionId}`);
        return res;
    },

    deleteMessage: async (sessionId,messageId) => {
        const res = await apiClient.delete(`/PersonalAI/chat/${sessionId}/message/${messageId}`);
        return res;
    }
};

export default apiPersonalRecommendationService;

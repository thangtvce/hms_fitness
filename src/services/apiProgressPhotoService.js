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
        console.log('Access Token:',accessToken);
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => {
        console.log(`Response: ${response.config.url}`,{ status: response.status });
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        console.log(`Response error for ${originalRequest.url}:`,{
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            data: error.response?.data,
        });
        if (error.response?.status === 401) {
            console.warn('401 Unauthorized, skipping token refresh for debugging');
            throw new Error(error.response?.data?.message || 'Unauthorized access');
        }
        return Promise.reject(error);
    }
);

export const apiProgressPhotoService = {
    async getAllProgressPhotos(queryParams = {}) {
        try {
            const response = await apiClient.get('/ProgressPhoto',{
                params: {
                    PageNumber: queryParams.pageNumber || 1,
                    PageSize: queryParams.pageSize || 10,
                    SearchTerm: queryParams.searchTerm,
                    StartDate: queryParams.startDate ? queryParams.startDate.toISOString() : undefined,
                    EndDate: queryParams.endDate ? queryParams.endDate.toISOString() : undefined,
                },
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getMyProgressPhotos(queryParams = {}) {
        try {
            const response = await apiClient.get('/ProgressPhoto/me',{
                params: {
                    PageNumber: queryParams.pageNumber || 1,
                    PageSize: queryParams.pageSize || 10,
                    SearchTerm: queryParams.searchTerm,
                    StartDate: queryParams.startDate ? queryParams.startDate.toISOString() : undefined,
                    EndDate: queryParams.endDate ? queryParams.endDate.toISOString() : undefined,
                },
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getProgressPhotoById(photoId) {
        try {
            const response = await apiClient.get(`/ProgressPhoto/${photoId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async createProgressPhoto(photoDto) {
        try {
            const response = await apiClient.post('/ProgressPhoto',photoDto);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async createProgressPhotos(photoDtos) {
        try {
            const response = await apiClient.post('/ProgressPhoto/bulk',photoDtos);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async updateProgressPhoto(photoId,photoDto) {
        try {
            const response = await apiClient.put(`/ProgressPhoto/${photoId}`,photoDto);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async deleteProgressPhoto(photoId) {
        try {
            const response = await apiClient.delete(`/ProgressPhoto/${photoId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getMyProgressPhotoStatistics(queryParams = {}) {
        try {
            const response = await apiClient.get('/ProgressPhoto/statistics/me',{
                params: {
                    SearchTerm: queryParams.searchTerm,
                    StartDate: queryParams.startDate ? queryParams.startDate.toISOString() : undefined,
                    EndDate: queryParams.endDate ? queryParams.endDate.toISOString() : undefined,
                },
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    async getProgressPhotoStatisticsByUser(userId,queryParams = {}) {
        try {
            const response = await apiClient.get(`/ProgressPhoto/statistics/${userId}`,{
                params: {
                    SearchTerm: queryParams.searchTerm,
                    StartDate: queryParams.startDate ? queryParams.startDate.toISOString() : undefined,
                    EndDate: queryParams.endDate ? queryParams.endDate.toISOString() : undefined,
                },
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },
};

export default apiProgressPhotoService;
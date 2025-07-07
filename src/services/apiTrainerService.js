
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
  (error) => Promise.reject(error),
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
  },
);

export const trainerService = {
  // Lấy danh sách đơn ứng tuyển của chính user hiện tại
  async getMyTrainerApplications(queryParams = {}) {
    try {
      const response = await apiClient.get('/TrainerApplication/me', { params: queryParams });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  // Lấy điểm đánh giá trung bình của trainer
  async getTrainerAverageRating(trainerId) {
    try {
      const response = await apiClient.get(`/TrainerRating/average/${trainerId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
   async getFitnessExercisesByTrainer(queryParams = {}) {
    try {
      const response = await apiClient.get('/TrainerFitnessExercise/me', { params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  async getWorkoutPlansByTrainerId(trainerId, queryParams = {}) {
    try {
      const response = await apiClient.get(`/WorkoutPlan/trainer/${trainerId}`, { params: queryParams });
      return response.data;
    } catch (error) {
      const errorResponse = {
        status: error.response?.status || 500,
        data: error.response?.data || null,
        message: error.response?.data?.message || error.message || 'Failed to fetch trainer workout plans',
      };
      throw errorResponse;
    }
  },
  async getMyTrainerApplications(queryParams = {}) {
    try {
      const response = await apiClient.get('/TrainerApplication/me', { params: queryParams });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  async submitTrainerApplication(applicationDto) {
    try {
      const response = await apiClient.post('/TrainerApplication', applicationDto);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  async getAllActiveServicePackage(queryParams = {}) {
    try {
      const response = await apiClient.get('/ServicePackage/all-active-package',{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getServicePackage(queryParams = {}) {
    try {
      const response = await apiClient.get('/ServicePackage',{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getServicePackageById(id) {
    try {
      const response = await apiClient.get(`/ServicePackage/active/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getActiveServicePackage(id) {
    try {
      const response = await apiClient.get(`/ServicePackage/active/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
async getApprovedTrainerApplication(trainerId) {
    try {
      const response = await apiClient.get(`TrainerApplication/user/approved/${trainerId}`);
      // The API returns the trainer info in response.data.data
      // Return the whole response (status, message, data, etc.)
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  async getTrainerServicePackage(trainerId,packageId) {
    try {
      const response = await apiClient.get(`/ServicePackage/trainer/${trainerId}/${packageId}/active`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async createServicePackage(packageData) {
    try {
      const response = await apiClient.post('/ServicePackage',packageData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateServicePackage(id,packageData) {
    try {
      const response = await apiClient.put(`/ServicePackage/${id}`,packageData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async deleteServicePackage(id) {
    try {
      const response = await apiClient.delete(`/ServicePackage/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async restoreServicePackage(id) {
    try {
      const response = await apiClient.post(`/ServicePackage/restore/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async restoreMultipleServicePackage(packageIds) {
    try {
      const response = await apiClient.post('/ServicePackage/restore-multiple',{ packageIds });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async restoreAllServicePackage() {
    try {
      const response = await apiClient.post('/ServicePackage/restore-all');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getServicePackageStatistics() {
    try {
      const response = await apiClient.get('/ServicePackage/statistics');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createPayment: async (paymentData) => {
    try {
      const response = await apiClient.post('/api/userpayment',paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  initializePaymentSheet: async (paymentData) => {
    try {
      const response = await apiClient.post('/api/payment/initialize',paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  getProgressPhotos: async (queryParams = {}) => {
    try {
      const params = new URLSearchParams({
        PageNumber: queryParams.pageNumber || 1,
        PageSize: queryParams.pageSize || 10,
        ...(queryParams.userId && { userId: queryParams.userId }),
        ...(queryParams.packageId && { packageId: queryParams.packageId }),
      }).toString();
      const response = await apiClient.get(`/api/progressphoto?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  uploadProgressPhoto: async (formData) => {
    try {
      const response = await apiClient.post('/api/progressphoto',formData,{
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const photoData = response.data;
      return {
        statusCode: response.status,
        data: photoData,
        message: 'Photo uploaded successfully',
      };
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  getProgressComparisons: async (queryParams = {}) => {
    try {
      const params = new URLSearchParams({
        PageNumber: queryParams.pageNumber || 1,
        PageSize: queryParams.pageSize || 10,
        ...(queryParams.userId && { userId: queryParams.userId }),
      }).toString();
      const response = await apiClient.get(`/api/progresscomparison?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  createComparison: async (comparisonData) => {
    try {
      const response = await apiClient.post('/api/progresscomparison',comparisonData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },updateComparison: async (comparisonId,comparisonData) => {
    try {
      const response = await apiClient.put(`/api/progresscomparison/${comparisonId}`,comparisonData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  //////////////////////////////////////////////////////////////////
  async fetchRelatedPackages(trainerId, packageId) {
    try {
      const response = await apiClient.get(`/ServicePackage/trainer/${trainerId}/${packageId}/active`, { params: { packageId } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getSubscriptionCountByPackageId(packageId) {
    try {
      const response = await apiClient.get(`/Subscription/count`, { params: { PackageId: packageId } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getServicePackageByTrainerId(id, queryParams = {}) {
    try {
      const response = await apiClient.get(`/ServicePackage/trainer/${id}`, { params: queryParams });
      const packages = response.data.data?.Packages || [];
      const subscriptionCounts = await Promise.all(
        packages.map(async (pkg) => {
          const countResponse = await this.getSubscriptionCountByPackageId(pkg.PackageId);
          return { ...pkg, SubscriptionCount: countResponse.data?.data || 0 };
        })
      );
      return {
        ...response.data,
        data: {
          ...response.data.data,
          Packages: subscriptionCounts,
        },
      };
    } catch (error) {
      throw error;
    }
  },

  async toggleServicePackageStatus(id, status) {
    try {
      const response = await apiClient.patch(`/ServicePackage/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getSubscriptionsByTrainerId(trainerId, queryParams = {}) {
    try {
      const response = await apiClient.get(`/Subscription/trainer/${trainerId}`, { params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getDeletedServicePackages(queryParams = {}) {
    try {
      const response = await apiClient.get('/ServicePackage/deleted', { params: queryParams });
      const packages = response.data.data?.Packages || [];
      const subscriptionCounts = await Promise.all(
        packages.map(async (pkg) => {
          const countResponse = await this.getSubscriptionCountByPackageId(pkg.PackageId);
          return { ...pkg, SubscriptionCount: countResponse.data?.data || 0 };
        })
      );
      return {
        ...response.data,
        data: {
          ...response.data.data,
          Packages: subscriptionCounts,
        },
      };
    } catch (error) {
      throw error;
    }
  },

  async getAllPayouts(queryParams = {}) {
    try {
      const response = await apiClient.get('/TrainerPayout', { params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getPlanExerciseById(id) {
    try {
      const response = await apiClient.get(`/WorkoutPlanExercise/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updatePlanExercise(id, exerciseData) {
    try {
      const response = await apiClient.put(`/WorkoutPlanExercise/${id}`, exerciseData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async createPlanExercise(exerciseData) {
    try {
      const response = await apiClient.post('/WorkoutPlanExercise', exerciseData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getPaymentById(id) {
    try {
      const response = await apiClient.get(`/userpayment/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  // Trainer Application Endpoints
  async getAllApplications(queryParams = {}) {
    try {
      const response = await apiClient.get('/TrainerApplication', { params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getMyApplications(queryParams = {}) {
    try {
      const response = await apiClient.get('/TrainerApplication/me', { params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getApplicationById(id) {
    try {
      const response = await apiClient.get(`/TrainerApplication/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async submitApplication(applicationData) {
    try {
      const response = await apiClient.post('/TrainerApplication', applicationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async approveApplication(id, notes) {
    try {
      const response = await apiClient.put(`/TrainerApplication/${id}/approve`, notes);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async rejectApplication(id, notes) {
    try {
      const response = await apiClient.put(`/TrainerApplication/${id}/reject`, notes);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async deleteApplication(id) {
    try {
      const response = await apiClient.delete(`/TrainerApplication/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getApplicationStatistics(queryParams = {}) {
    try {
      const response = await apiClient.get('/TrainerApplication/statistics', { params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getApprovedApplication(trainerId) {
    try {
      const response = await apiClient.get(`/TrainerApplication/user/approved/${trainerId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
//////////////////////////////////////////////////////////////////
};

export default trainerService;
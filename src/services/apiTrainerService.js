
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
    console.log(accessToken)
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
  async getMyTrainerApplications(queryParams = {}) {
    try {
      const response = await apiClient.get('/TrainerApplication/me',{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async getMyTrainerApplications(queryParams = {}) {
    try {
      const response = await apiClient.get('/TrainerApplication/me',{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  async submitTrainerApplication(applicationDto) {
    try {
      const response = await apiClient.post('/TrainerApplication',applicationDto);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  async getApprovedTrainerApplication(trainerId) {
    try {
      const response = await apiClient.get(`TrainerApplication/user/approved/${trainerId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  // Service package
  async getServicePackageByTrainerId(id,queryParams = {}) {
    try {
      const response = await apiClient.get(`/ServicePackage/trainer/${id}`,{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async toggleServicePackageStatus(id,status) {
    try {
      const response = await apiClient.put(`/ServicePackage/byTrainer/${id}/status`,{ status });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getServicePackageById(id) {
    try {
      const response = await apiClient.get(`/ServicePackage/trainer/packageById/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async createServicePackage(packageData) {
    try {
      const response = await apiClient.post('/ServicePackage/trainer',packageData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateServicePackage(id,packageData) {
    try {
      const response = await apiClient.put(`/ServicePackage/byTrainer/${id}`,packageData);
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

  // Exercise
  async getExerciseCategory() {
    try {
      const queryParams = {
        PageSize: 1000,
        PageNumber: 1
      }
      const response = await apiClient.get(`/ExerciseCategory/all-active-categories`,{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getExerciseByTrainerId(queryParams) {
    try {
      const response = await apiClient.get(`/FitnessExercise/trainer`,{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getExerciseByBank(queryParams) {
    try {
      const response = await apiClient.get(`/FitnessExercise/view/0`,{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getFitnessExerciseById(id) {
    try {
      const response = await apiClient.get(`/TrainerFitnessExercise/me/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async createFitnessExercise(exerciseData) {
    try {
      const response = await apiClient.post('/TrainerFitnessExercise',exerciseData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateFitnessExercise(id,exerciseData) {
    try {
      const response = await apiClient.put(`/TrainerFitnessExercise/${id}`,exerciseData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async deleteExercise(id) {
    try {
      const response = await apiClient.delete(`/TrainerFitnessExercise/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  //Pay out
  async getMyPayouts(trainerId,queryParams = {}) {
    try {
      const response = await apiClient.get(`/TrainerPayout/trainer/${trainerId}`,{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async getMyPayoutsById(payoutId) {
    try {
      const response = await apiClient.get(`/TrainerPayout/${payoutId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async getMyPayoutsStatistics(trainerId,queryParams) {
    try {
      const response = await apiClient.get(`/TrainerPayout/statistics/trainer/${trainerId}`,{ queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Trainer rating
  async getTrainerAverageRating(trainerId) {
    try {
      const response = await apiClient.get(`/TrainerRating/average/${trainerId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getTrainerStatistic(trainerId) {
    try {
      const response = await apiClient.get(`/TrainerRating/statistics/trainer/${trainerId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getTrainerRatings(trainerId,queryParams) {
    try {
      const response = await apiClient.get(`/TrainerRating/detailed/trainer/${trainerId}`,{ queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getTrainerRatingsBySubscriptionId(subscriptionId) {
    try {
      const response = await apiClient.get(`/TrainerRating/subscription/${subscriptionId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async getTrainerRatingsByPackageId(packageId,queryParams) {
    try {
      const response = await apiClient.get(`/TrainerRating/package/active/${packageId}`,{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Subscription
  async getMySubscription(trainerId,queryParams) {
    try {
      const response = await apiClient.get(`/Subscription/trainer/${trainerId}`,{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async getMySubscriptionById(subscriptionId) {
    try {
      const response = await apiClient.get(`/Subscription/${subscriptionId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async getSubscriptionStatistic(queryParams) {
    try {
      const response = await apiClient.get(`/Subscription/trainer/me/statistics`,{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async getSubscriptionByPackageId(packageId,queryParams) {
    try {
      const response = await apiClient.get(`/Subscription/byMyPackageId/${packageId}`,{ params: { queryParams } });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getSubscriptionsByTrainerId(trainerId,queryParams = {}) {
    try {
      const response = await apiClient.get(`/Subscription/trainer/${trainerId}`,{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Workout plan
  async getWorkoutPlansByTrainerId(trainerId,queryParams = {}) {
    try {
      const response = await apiClient.get(`/WorkoutPlan/trainer/${trainerId}/all`,{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async getWorkoutPlansId(planId) {
    try {
      const response = await apiClient.get(`/WorkoutPlan/${planId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async getWorkoutPlansBySubscriptionId(subscriptionId,queryParams) {
    try {
      const response = await apiClient.get(`/WorkoutPlan/subscription/${subscriptionId}`,{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async addWorkoutPlan(workoutData) {
    try {
      const response = await apiClient.post(`/WorkoutPlan`,workoutData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async updateWorkoutPlan(planId,workoutData) {
    try {
      const response = await apiClient.put(`/WorkoutPlan/${planId}`,workoutData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async deleteWorkoutPlan(planId) {
    try {
      const response = await apiClient.delete(`/WorkoutPlan/${planId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async getWorkoutPlanStatistic(trainerId,queryParams) {
    try {
      const response = await apiClient.get(`/WorkoutPlan/statistics/trainer/${trainerId}`,{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async getWorkoutPlansById(planId) {
    try {
      const response = await apiClient.get(`/WorkoutPlan/${planId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async getPlanExerciseByPlanId(id,queryParams) {
    try {
      const response = await apiClient.get(`/WorkoutPlanExercise/plan/${id}`,{ params: queryParams });
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

  async updatePlanExercise(id,exerciseData) {
    try {
      const response = await apiClient.put(`/WorkoutPlanExercise/${id}`,exerciseData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async createPlanExercise(exerciseData) {
    try {
      const response = await apiClient.post('/WorkoutPlanExercise',exerciseData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // View user for trainer
  async viewUserForTrainer(userId) {
    try {
      const response = await apiClient.get(`/User/trainer/user/${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async viewProgressUserForTrainer(userId) {
    try {
      const response = await apiClient.get(`/Subscription/trainer/me/subscriber/${userId}/progress-comparisons`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async getAllUserForTrainer(queryParams) {
    try {
      const response = await apiClient.get(`/Subscription/trainer/me/active-paid-subscribers`,{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Trainer dashboard
  async getDashboardStatistic(startDate,endDate) {
    try {
      const response = await apiClient.get(
        `/Subscription/trainer/me/revenue-statistics`,
        {
          params: {
            startDate,
            endDate
          }
        }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // end
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
  },
  updateComparison: async (comparisonId,comparisonData) => {
    try {
      const response = await apiClient.put(`/api/progresscomparison/${comparisonId}`,comparisonData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },


  async getDeletedServicePackages(queryParams = {}) {
    try {
      const response = await apiClient.get('/ServicePackage/deleted',{ params: queryParams });
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
      const response = await apiClient.get('/TrainerApplication',{ params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getMyApplications(queryParams = {}) {
    try {
      const response = await apiClient.get('/TrainerApplication/me',{ params: queryParams });
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
      const response = await apiClient.post('/TrainerApplication',applicationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async approveApplication(id,notes) {
    try {
      const response = await apiClient.put(`/TrainerApplication/${id}/approve`,notes);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async rejectApplication(id,notes) {
    try {
      const response = await apiClient.put(`/TrainerApplication/${id}/reject`,notes);
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
      const response = await apiClient.get('/TrainerApplication/statistics',{ params: queryParams });
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
};

export default trainerService;
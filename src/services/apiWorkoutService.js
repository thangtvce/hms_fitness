
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
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const errorResponse = error.response?.data || {};
    const status = error.response?.status || 500;
    const message = errorResponse.message || 'An unexpected error occurred';
    const devMessage = errorResponse.devMessage || error.message;

    if (status === 401) {
      throw new Error(message || 'Unauthorized access');
    }

    throw new Error(message);
  }
);

export const workoutService = {
  async getExercisesByCategory(categoryId, queryParams = {}) {
    if (!categoryId || categoryId <= 0) throw new Error('Valid category id is required.');
    try {
      const response = await apiClient.get(`/FitnessExercise/category/${categoryId}`, {
        params: {
          PageNumber: queryParams.PageNumber,
          PageSize: queryParams.PageSize,
          StartDate: queryParams.StartDate,
          EndDate: queryParams.EndDate,
          ValidPageSize: queryParams.ValidPageSize,
          SearchTerm: queryParams.SearchTerm,
          Status: queryParams.Status,
        },
      });
      return response.data.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch exercises by category');
    }
  },
  async getAllActiveActivities({ pageNumber = 1, pageSize = 10 } = {}) {
    try {
      const response = await apiClient.get('/UserActivity/all-active-activities', {
        params: {
          pageNumber,
          pageSize,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch activities');
    }
  },

  async getAllExercises(queryParams) {
    try {
      const response = await apiClient.get('/FitnessExercise', {
        params: {
          PageNumber: queryParams.PageNumber,
          pageSize: queryParams.PageSize,
          CategoryId: queryParams?.CategoryId,
          searchTerm: queryParams.SearchTerm,
        },
      });
      return response.data.data.exercises;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch exercises');
    }
  },

  async getAllActiveCategories({ pageNumber = 1, pageSize = 10 } = {}) {
    try {
      const response = await apiClient.get('/ExerciseCategory/all-active-categories', {
        params: {
          pageNumber,
          pageSize,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch categories');
    }
  },

  async getAllCategories() {
    try {
      const response = await apiClient.get('/ExerciseCategory/all-active-categories');
      return response.data.data.categories;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch categories');
    }
  },

  async getAllActiveActivityTypes({ pageNumber = 1, pageSize = 10 } = {}) {
    try {
      const response = await apiClient.get('/ActivityType/all-active-types', {
        params: {
          pageNumber,
          pageSize,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch activity types');
    }
  },
  async getExercisesByCategory(categoryId, queryParams = {}) {
    if (!categoryId || categoryId <= 0) throw new Error('Valid category id is required.');
    try {
      const response = await apiClient.get(`/FitnessExercise/category/${categoryId}`, {
        params: {
          PageNumber: queryParams.PageNumber,
          PageSize: queryParams.PageSize,
          StartDate: queryParams.StartDate,
          EndDate: queryParams.EndDate,
          ValidPageSize: queryParams.ValidPageSize,
          SearchTerm: queryParams.SearchTerm,
          Status: queryParams.Status,
        },
      });
      return response.data.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch exercises by category');
    }
  },
  async getMyActivities({ pageNumber = 1, pageSize = 10, ...restParams } = {}) {
    try {
      const response = await apiClient.get('/UserActivity/me', {
        params: {
          pageNumber,
          pageSize,
          ...restParams,
        },
      });
      return response.data.data.activities;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch user activities');
    }
  },

  async createActivity(activity) {
    if (!activity || typeof activity !== 'object') {
      throw new Error('Activity payload is required');
    }
    if (!activity.UserId) {
      throw new Error('UserId is required');
    }
    if (!activity.ActivityType) {
      throw new Error('ActivityType is required');
    }
    if (
      !activity.Steps &&
      !activity.DistanceKm &&
      !activity.CaloriesBurned &&
      !activity.DurationMinutes &&
      !activity.HeartRate
    ) {
      throw new Error('At least one metric (Steps, DistanceKm, CaloriesBurned, DurationMinutes, HeartRate) must be provided.');
    }
    try {
      const response = await apiClient.post('/UserActivity', activity);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to create activity');
    }
  },

  async createActivitiesBulk(activities) {
    if (!Array.isArray(activities) || activities.length === 0) {
      throw new Error('Activity list cannot be empty.');
    }
    for (const activity of activities) {
      if (!activity.UserId) throw new Error('UserId is required for all activities.');
      if (!activity.ActivityType) throw new Error('ActivityType is required for all activities.');
      if (
        !activity.Steps &&
        !activity.DistanceKm &&
        !activity.CaloriesBurned &&
        !activity.DurationMinutes &&
        !activity.HeartRate
      ) {
        throw new Error('Each activity must have at least one metric.');
      }
    }
    try {
      const response = await apiClient.post('/UserActivity/bulk', activities);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to create activities in bulk');
    }
  },

  async updateActivity(id, activity) {
    if (!id || id <= 0) throw new Error('Valid activity id is required.');
    if (!activity || typeof activity !== 'object') throw new Error('Activity payload is required.');
    if (!activity.UserId) throw new Error('UserId is required.');
    if (!activity.ActivityType) throw new Error('ActivityType is required.');
    if (
      !activity.Steps &&
      !activity.DistanceKm &&
      !activity.CaloriesBurned &&
      !activity.DurationMinutes &&
      !activity.HeartRate
    ) {
      throw new Error('At least one metric (Steps, DistanceKm, CaloriesBurned, DurationMinutes, HeartRate) must be provided.');
    }
    try {
      const response = await apiClient.put(`/UserActivity/${id}`, activity);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to update activity');
    }
  },

  async deleteActivity(id) {
    if (!id || id <= 0) throw new Error('Valid activity id is required.');
    try {
      const response = await apiClient.delete(`/UserActivity/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to delete activity');
    }
  },

  async getMyActivityStatistics(params = {}) {
    if (
      params.StartDate &&
      params.EndDate &&
      new Date(params.StartDate) > new Date(params.EndDate)
    ) {
      throw new Error('StartDate must be earlier than or equal to EndDate.');
    }
    try {
      const response = await apiClient.get('/UserActivity/statistics/me', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch activity statistics');
    }
  },

  async getMyWorkoutSessions(params = {}) {
    try {
      const response = await apiClient.get('/WorkoutSessionLog/me', { params });
      return response.data.data.sessions;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch workout sessions');
    }
  },

  async getWorkoutSessionById(id) {
    if (!id || id <= 0) throw new Error('Valid session id is required.');
    try {
      const response = await apiClient.get(`/WorkoutSessionLog/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch workout session');
    }
  },

  async createWorkoutSession(session) {
    if (!session || typeof session !== 'object') throw new Error('Session payload is required.');
    if (!session.UserId) throw new Error('UserId is required.');
    if (!session.StartTime) throw new Error('StartTime is required.');
    if (session.EndTime && new Date(session.EndTime) <= new Date(session.StartTime)) {
      throw new Error('EndTime must be later than StartTime.');
    }
    try {
      const response = await apiClient.post('/WorkoutSessionLog', session);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to create workout session');
    }
  },

  async createWorkoutSessionsBulk(sessions) {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      throw new Error('Session list cannot be empty.');
    }
    for (const session of sessions) {
      if (!session.UserId) throw new Error('UserId is required for all sessions.');
      if (!session.StartTime) throw new Error('StartTime is required for all sessions.');
      if (session.EndTime && new Date(session.EndTime) <= new Date(session.StartTime)) {
        throw new Error('EndTime must be later than StartTime for all sessions.');
      }
    }
    try {
      const response = await apiClient.post('/WorkoutSessionLog/bulk', sessions);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to create workout sessions in bulk');
    }
  },

  async updateWorkoutSession(id, session) {
    if (!id || id <= 0) throw new Error('Valid session id is required.');
    if (!session || typeof session !== 'object') throw new Error('Session payload is required.');
    if (!session.UserId) throw new Error('UserId is required.');
    if (!session.StartTime) throw new Error('StartTime is required.');
    if (session.EndTime && new Date(session.EndTime) <= new Date(session.StartTime)) {
      throw new Error('EndTime must be later than StartTime.');
    }
    try {
      const response = await apiClient.put(`/WorkoutSessionLog/${id}`, session);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to update workout session');
    }
  },

  async deleteWorkoutSession(id) {
    if (!id || id <= 0) throw new Error('Valid session id is required.');
    try {
      const response = await apiClient.delete(`/WorkoutSessionLog/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to delete workout session');
    }
  },

  async getMyWorkoutSessionStatistics(params = {}) {
    if (
      params.StartDate &&
      params.EndDate &&
      new Date(params.StartDate) > new Date(params.EndDate)
    ) {
      throw new Error('StartDate must be earlier than or equal to EndDate.');
    }
    try {
      const response = await apiClient.get('/WorkoutSessionLog/statistics/me', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch workout session statistics');
    }
  },

  async getExerciseById(id) {
    if (!id || id <= 0) throw new Error('Valid exercise id is required.');
    try {
      const response = await apiClient.get(`/FitnessExercise/${id}`);
      return response.data.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch exercise by id');
    }
  },

  async getCategoryById(id) {
    if (!id || id <= 0) throw new Error('Valid category id is required.');
    try {
      const response = await apiClient.get(`/ExerciseCategory/${id}`);
      return response.data.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch category by id');
    }
  },
};

export default workoutService;
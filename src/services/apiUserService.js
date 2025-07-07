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

export const apiUserService = {
 

  

async getUserById(userId) {
    try {
      const response = await apiClient.get(`/User/active/${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

 

  async updateUser(userId,userDto) {
    try {
      const response = await apiClient.put(`/User/user/${userId}`,userDto);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

 

  async getUserStatistics(startDate,endDate) {
    try {
      const response = await apiClient.get('/User/statistics',{
        params: {
          startDate: startDate ? startDate.toISOString() : undefined,
          endDate: endDate ? endDate.toISOString() : undefined,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateAvatar(userId,avatarUrl) {
    try {
      const response = await apiClient.put(`/User/${userId}/avatar`,{ AvatarUrl: avatarUrl });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

 

  async getDeletedUsers(queryParams = {}) {
    try {
      const response = await apiClient.get('/User/deleted',{
        params: {
          PageNumber: queryParams.pageNumber || 1,
          PageSize: queryParams.pageSize || 10,
          SearchTerm: queryParams.searchTerm,
          SortBy: queryParams.sortBy,
          SortOrder: queryParams.sortOrder,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async permanentlyDeleteUser(userId) {
    try {
      const response = await apiClient.delete(`/User/${userId}/permanent`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async restoreUser(userId,status = 'active') {
    try {
      const response = await apiClient.post(`/User/${userId}/restore`,{ Status: status });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async restoreUsers(userIds,status = 'active') {
    try {
      const response = await apiClient.post('/User/restore',{ UserIds: userIds,Status: status });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async checkInUser(type = 'checkin') {
    try {
      const response = await apiClient.post(`/User/checkin`,{
        Type: type,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getLeaderboard(queryParams = {}) {
    try {
      const params = {
        PageNumber: queryParams.PageNumber || 1,
        PageSize: queryParams.PageSize || 10,
        Search: queryParams.SearchTerm || '',
        SortBy: queryParams.SortBy || 'level',
        SortDescending: queryParams.SortOrder == 'Descending' ? true : false,
        StartDate: queryParams.StartDate ? new Date(queryParams.StartDate).toISOString().split('T')[0] : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        EndDate: queryParams.EndDate ? new Date(queryParams.EndDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      };
      const response = await apiClient.get('/User/leaderboard',{
        params
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },


  // Get all trainers
  async getTrainers() {
    try {
      const response = await apiClient.get('/User/trainers');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

 

  // Get user fitness goals
  async getUserFitnessGoals(userId, queryParams = {}) {
    try {
      const response = await apiClient.get(`/UserFitnessGoal/user/${userId}`, { params: queryParams });
      return response.data;
    } catch (error) {
      throw error;
    }
  },


  
};

export default apiUserService;
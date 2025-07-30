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

export const foodService = {

  async getAllActiveCategories({ pageNumber = 1,pageSize = 10 } = {}) {
    try {
      const response = await apiClient.get('/FoodCategory/all-active-category',{
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


  async getAllActiveFoods({ pageNumber = 1,pageSize = 10,categoryId,searchTerm } = {}) {
    try {
      const response = await apiClient.get('/Food/all-active-food',{
        params: {
          pageNumber,
          pageSize,
          categoryId,
          searchTerm,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch foods');
    }
  },

  // Lấy tất cả dữ liệu thực phẩm, không phân trang
  async getAllActiveFoodsAllPages({ pageSize = 100, categoryId, searchTerm } = {}) {
    let allFoods = [];
    let pageNumber = 1;
    let hasMore = true;
    while (hasMore) {
      const res = await this.getAllActiveFoods({ pageNumber, pageSize, categoryId, searchTerm });
      // Nếu backend trả về mảng hoặc object có .items
      let items = Array.isArray(res) ? res : (res.items || res.data || []);
      if (!Array.isArray(items)) items = [];
      allFoods = allFoods.concat(items);
      if (items.length < pageSize) {
        hasMore = false;
      } else {
        pageNumber++;
      }
    }
    return allFoods;
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

export const foodService = {

  async getAllActiveCategories({ pageNumber = 1,pageSize = 10 } = {}) {
    try {
      const response = await apiClient.get('/FoodCategory/all-active-category',{
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


  async getAllActiveFoods({ pageNumber = 1,pageSize = 10,categoryId,searchTerm } = {}) {
    try {
      const response = await apiClient.get('/Food/all-active-food',{
        params: {
          pageNumber,
          pageSize,
          categoryId,
          searchTerm,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch foods');
    }
  },

  async getRelatedFoods({ foodId,pageNumber = 1,pageSize = 4,searchTerm } = {}) {
    try {
      const response = await apiClient.get(`/Food/related/${foodId}`,{
        params: {
          pageNumber,
          pageSize,
          searchTerm,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch foods');
    }
  },

  async getMyNutritionLogs({ pageNumber = 1, pageSize = 10, ...restParams } = {}) {
    try {
      const response = await apiClient.get('/UserNutritionLog/me', {
        params: {
          pageNumber,
          pageSize,
          ...restParams,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch nutrition logs');
    }
  },

  async createNutritionLog(logData) {
    try {
      const response = await apiClient.post('/UserNutritionLog', logData);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to create nutrition log');
    }
  },

async createNutritionLogsBulk(logDtos, userId) {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  if (!Array.isArray(logDtos) || logDtos.length === 0) {
    throw new Error('Dữ liệu gửi lên phải là mảng và không được rỗng!');
  }

  // Map data to match backend expectations
  const mappedLogs = logDtos.map((log) => {
    return {
      userId: userId,
      foodId: log.foodId,
      mealType: log.mealType,
      portionSize: log.portionSize !== undefined ? log.portionSize : 1,
      servingSize: log.servingSize !== undefined ? log.servingSize : 1,
      calories: log.calories !== undefined ? log.calories : 0,
      protein: log.protein !== undefined ? log.protein : 0,
      carbs: log.carbs !== undefined ? log.carbs : 0,
      fats: log.fats !== undefined ? log.fats : 0,
      notes: log.notes && log.notes.toString().trim() !== '' ? log.notes : '',
      satisfactionRating: log.satisfactionRating !== undefined ? log.satisfactionRating : 5,
      consumptionDate: log.consumptionDate || dayjs().format('YYYY-MM-DD'),
    };
  });

  // Validate required fields
  const requiredFields = ['userId', 'foodId', 'mealType', 'consumptionDate'];
  for (const log of mappedLogs) {
    for (const field of requiredFields) {
      if (log[field] === undefined || log[field] === null || (typeof log[field] === 'string' && log[field].trim() === '')) {
        throw new Error(`Thiếu trường '${field}' trong log!`);
      }
    }
  }

  try {
    const response = await apiClient.post('/UserNutritionLog/bulk', mappedLogs);
    return response.data;
  } catch (error) {
    throw new Error(error?.response?.data?.message || 'Failed to create nutrition logs (bulk)');
  }
},
  async updateNutritionLog(id, logDto) {
    // Map data to match backend expectations (same as createNutritionLogsBulk)
    const mappedLog = {
      userId: logDto.userId,
      foodId: logDto.foodId,
      mealType: logDto.mealType,
      portionSize: logDto.portionSize !== undefined ? logDto.portionSize : 1,
      servingSize: logDto.servingSize !== undefined ? logDto.servingSize : 1,
      calories: logDto.calories !== undefined ? logDto.calories : 0,
      protein: logDto.protein !== undefined ? logDto.protein : 0,
      carbs: logDto.carbs !== undefined ? logDto.carbs : 0,
      fats: logDto.fats !== undefined ? logDto.fats : 0,
      notes: logDto.notes && logDto.notes.toString().trim() !== '' ? logDto.notes : '',
      satisfactionRating: logDto.satisfactionRating !== undefined ? logDto.satisfactionRating : 5,
      consumptionDate: logDto.consumptionDate || (logDto.recordedAt ? logDto.recordedAt.split('T')[0] : undefined),
    };
    // Remove undefined fields
    Object.keys(mappedLog).forEach(key => {
      if (mappedLog[key] === undefined) delete mappedLog[key];
    });
    // Validate required fields
    const requiredFields = ['userId', 'foodId', 'mealType', 'consumptionDate'];
    for (const field of requiredFields) {
      if (
        mappedLog[field] === undefined ||
        mappedLog[field] === null ||
        (typeof mappedLog[field] === 'string' && mappedLog[field].toString().trim() === '')
      ) {
        throw new Error(`Thiếu trường '${field}' trong log!`);
      }
    }
    try {
      const response = await apiClient.put(`/UserNutritionLog/${id}`, mappedLog);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to update nutrition log');
    }
  },

  async deleteNutritionLog(id) {
    try {
      const response = await apiClient.delete(`/UserNutritionLog/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to delete nutrition log');
    }
  },


  async getAllActiveFoodsAllPages({ pageSize = 100, categoryId, searchTerm } = {}) {
    let allFoods = [];
    let pageNumber = 1;
    let hasMore = true;
    while (hasMore) {
      const res = await this.getAllActiveFoods({ pageNumber, pageSize, categoryId, searchTerm });
      // Nếu backend trả về mảng hoặc object có .items
      let items = Array.isArray(res) ? res : (res.items || res.data || []);
      if (!Array.isArray(items)) items = [];
      allFoods = allFoods.concat(items);
      if (items.length < pageSize) {
        hasMore = false;
      } else {
        pageNumber++;
      }
    }
    return allFoods;
  }
};

export default foodService;
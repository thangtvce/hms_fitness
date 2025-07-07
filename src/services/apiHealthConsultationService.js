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

export const healthConsultationService = {
  async getMyHealthConsultations(params = {}) {
    try {
      const response = await apiClient.get('/HealthConsultation/me', { params });
      return response.data.data.consultations;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch consultations');
    }
  },

  async getHealthConsultationById(id) {
    if (!id || id <= 0) throw new Error('Valid consultation id is required.');
    try {
      const response = await apiClient.get(`/HealthConsultation/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch consultation');
    }
  },

  async createHealthConsultation(consultation) {
    if (!consultation || typeof consultation !== 'object') throw new Error('Consultation payload is required.');
    if (!consultation.UserId) throw new Error('UserId is required.');
    if (!consultation.ConsultationType) throw new Error('ConsultationType is required.');
    if (!consultation.ConsultationDetails && !consultation.AiResponse) throw new Error('At least one of ConsultationDetails or AiResponse must be provided.');
    try {
      const response = await apiClient.post('/HealthConsultation', consultation);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to create consultation');
    }
  },

  async createHealthConsultationsBulk(consultations) {
    if (!Array.isArray(consultations) || consultations.length === 0) {
      throw new Error('Consultation list cannot be empty.');
    }
    for (const consultation of consultations) {
      if (!consultation.UserId) throw new Error('UserId is required for all consultations.');
      if (!consultation.ConsultationType) throw new Error('ConsultationType is required for all consultations.');
      if (!consultation.ConsultationDetails && !consultation.AiResponse) throw new Error('Each consultation must have at least one of ConsultationDetails or AiResponse.');
    }
    try {
      const response = await apiClient.post('/HealthConsultation/bulk', consultations);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to create consultations in bulk');
    }
  },

  async updateHealthConsultation(id, consultation) {
    if (!id || id <= 0) throw new Error('Valid consultation id is required.');
    if (!consultation || typeof consultation !== 'object') throw new Error('Consultation payload is required.');
    if (!consultation.UserId) throw new Error('UserId is required.');
    if (!consultation.ConsultationType) throw new Error('ConsultationType is required.');
    if (!consultation.ConsultationDetails && !consultation.AiResponse) throw new Error('At least one of ConsultationDetails or AiResponse must be provided.');
    try {
      const response = await apiClient.put(`/HealthConsultation/${id}`, consultation);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to update consultation');
    }
  },

  async deleteHealthConsultation(id) {
    if (!id || id <= 0) throw new Error('Valid consultation id is required.');
    try {
      const response = await apiClient.delete(`/HealthConsultation/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to delete consultation');
    }
  },

  async getMyHealthConsultationStatistics(params = {}) {
    if (
      params.StartDate &&
      params.EndDate &&
      new Date(params.StartDate) > new Date(params.EndDate)
    ) {
      throw new Error('StartDate must be earlier than or equal to EndDate.');
    }
    try {
      const response = await apiClient.get('/HealthConsultation/statistics/me', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch consultation statistics');
    }
  },
};

export default healthConsultationService;

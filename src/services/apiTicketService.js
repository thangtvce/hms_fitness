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
    if (error.response?.status === 401) {
      throw new Error(error.response?.data?.message || 'Unauthorized access');
    }
    return Promise.reject(error);
  }
);


export const ticketService = {
  
  async getMyTickets(params = {}) {
    try {
      const response = await apiClient.get('/Ticket/me', { params });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },


  async getTicketById(id) {
    if (!id || id <= 0) throw new Error('Valid ticket id is required.');
    try {
      const response = await apiClient.get(`/Ticket/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },


  async createTicket(ticketData) {
    if (!ticketData || typeof ticketData !== 'object') throw new Error('Ticket data is required.');
    if (!ticketData.title || !ticketData.description || !ticketData.priority || !ticketData.category) {
      throw new Error('Missing required ticket fields.');
    }
    try {
      const response = await apiClient.post('/Ticket', ticketData);
      return response.data;
    } catch (error) {
      if (error.response?.data) throw error.response.data;
      throw error;
    }
  },


  async addTicketResponse(ticketId, responseData) {
    if (!ticketId || ticketId <= 0) throw new Error('Valid ticket id is required.');
    if (!responseData || typeof responseData !== 'object' || !responseData.responseText) {
      throw new Error('Response text is required.');
    }
    try {
      const response = await apiClient.post(`/Ticket/${ticketId}/response`, responseData);
      return response.data;
    } catch (error) {
      if (error.response?.data) throw error.response.data;
      throw error;
    }
  },


  async getTicketResponsesForUser(ticketId, params = {}) {
    if (!ticketId || ticketId <= 0) throw new Error('Valid ticket id is required.');
    try {
      const response = await apiClient.get(`/Ticket/${ticketId}/responses/user`, { params });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },
};

export default ticketService;

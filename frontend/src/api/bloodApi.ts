import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const getAuthHeader = async () => {
  const token = await AsyncStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface BloodRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  blood_type: string;
  units_needed: number;
  units_fulfilled: number;
  urgency: string;
  status: string;
  hospital_name?: string;
  hospital_address?: string;
  latitude?: number;
  longitude?: number;
  patient_name?: string;
  notes?: string;
  matched_donors: DonorMatch[];
  ai_recommendation?: string;
  created_at: string;
  updated_at: string;
}

export interface DonorMatch {
  donor_id: string;
  donor_name: string;
  blood_type: string;
  distance_km: number;
  compatibility_score: number;
  is_available: boolean;
  last_donation_date?: string;
  status?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  data?: any;
  created_at: string;
}

export const bloodApi = {
  // Blood Requests
  createRequest: async (data: {
    blood_type: string;
    units_needed: number;
    urgency: string;
    hospital_name?: string;
    hospital_address?: string;
    latitude?: number;
    longitude?: number;
    patient_name?: string;
    notes?: string;
  }): Promise<BloodRequest> => {
    const headers = await getAuthHeader();
    const response = await axios.post(`${API_URL}/api/requests`, data, { headers });
    return response.data;
  },

  getRequests: async (status?: string): Promise<BloodRequest[]> => {
    const headers = await getAuthHeader();
    const params = status ? { status } : {};
    const response = await axios.get(`${API_URL}/api/requests`, { headers, params });
    return response.data;
  },

  getRequest: async (id: string): Promise<BloodRequest> => {
    const headers = await getAuthHeader();
    const response = await axios.get(`${API_URL}/api/requests/${id}`, { headers });
    return response.data;
  },

  acceptRequest: async (requestId: string): Promise<void> => {
    const headers = await getAuthHeader();
    await axios.post(`${API_URL}/api/requests/${requestId}/accept`, {}, { headers });
  },

  // Nearby Donors
  getNearbyDonors: async (
    blood_type: string,
    latitude: number,
    longitude: number,
    radius_km: number = 50
  ): Promise<DonorMatch[]> => {
    const headers = await getAuthHeader();
    const response = await axios.get(`${API_URL}/api/donors/nearby`, {
      headers,
      params: { blood_type, latitude, longitude, radius_km },
    });
    return response.data;
  },

  // Notifications
  getNotifications: async (): Promise<Notification[]> => {
    const headers = await getAuthHeader();
    const response = await axios.get(`${API_URL}/api/notifications`, { headers });
    return response.data;
  },

  markNotificationRead: async (id: string): Promise<void> => {
    const headers = await getAuthHeader();
    await axios.put(`${API_URL}/api/notifications/${id}/read`, {}, { headers });
  },

  markAllNotificationsRead: async (): Promise<void> => {
    const headers = await getAuthHeader();
    await axios.put(`${API_URL}/api/notifications/read-all`, {}, { headers });
  },

  // Dashboard Stats
  getDashboardStats: async (): Promise<any> => {
    const headers = await getAuthHeader();
    const response = await axios.get(`${API_URL}/api/stats/dashboard`, { headers });
    return response.data;
  },
};

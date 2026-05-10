import axios from 'axios';
import { NativeModules, Platform } from 'react-native';

function normalizeBaseUrl(value) {
  if (!value) {
    return '';
  }

  const trimmed = String(value).trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('https//')) {
    return trimmed.replace('https//', 'https://');
  }

  if (trimmed.startsWith('http//')) {
    return trimmed.replace('http//', 'http://');
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return `http://${trimmed}`;
  }

  return trimmed;
}

function getDevMachineHost() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.hostname || 'localhost';
  }

  const scriptUrl = NativeModules?.SourceCode?.scriptURL || '';

  if (!scriptUrl) {
    return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  }

  try {
    const parsedUrl = new URL(scriptUrl);

    if (parsedUrl.hostname === 'localhost' && Platform.OS === 'android') {
      return '10.0.2.2';
    }

    return parsedUrl.hostname || 'localhost';
  } catch (error) {
    return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  }
}

const defaultBaseUrl = `http://${getDevMachineHost()}:3001/api`;

const resolvedBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL) || defaultBaseUrl;

let authTokenGetter = null;

export function setAuthTokenGetter(getter) {
  authTokenGetter = getter;
}

const api = axios.create({
  baseURL: resolvedBaseUrl,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  if (authTokenGetter) {
    const token = await authTokenGetter();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

function getMessage(error, fallbackMessage) {
  if (error?.code === 'ERR_NETWORK') {
    return `Could not reach the backend at ${api.defaults.baseURL}.`;
  }

  if (error?.code === 'ECONNABORTED') {
    return `The backend at ${api.defaults.baseURL} took too long to respond.`;
  }

  return error?.response?.data?.message || fallbackMessage;
}

export async function registerUser(payload) {
  try {
    const response = await api.post('/auth/register', payload);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not create your account.'));
  }
}

export async function loginUser(payload) {
  try {
    const response = await api.post('/auth/login', payload);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not sign you in.'));
  }
}

export async function getCurrentProfile() {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not load your account details.'));
  }
}

export async function getUsers(role = '') {
  try {
    const response = await api.get('/users', {
      params: role ? { role } : undefined,
    });
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not load users.'));
  }
}

export async function createLecturerUser(payload) {
  try {
    const response = await api.post('/users/lecturers', payload);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not create lecturer account.'));
  }
}

export async function registerNotificationToken(payload) {
  try {
    const response = await api.post('/notifications/token', payload);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not save notification token.'));
  }
}

export async function getNotifications() {
  try {
    const response = await api.get('/notifications');
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not load notifications.'));
  }
}

export async function markNotificationRead(notificationId) {
  try {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not update notification.'));
  }
}

export async function getReports() {
  try {
    const response = await api.get('/reports');
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not load reports.'));
  }
}

export async function getModuleRecords(moduleKey) {
  try {
    const response = await api.get(`/modules/${moduleKey}`);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not load records.'));
  }
}

export async function createModuleRecord(moduleKey, payload) {
  try {
    const response = await api.post(`/modules/${moduleKey}`, payload);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not create record.'));
  }
}

export async function updateModuleRecord(moduleKey, recordId, payload) {
  try {
    const response = await api.put(`/modules/${moduleKey}/${recordId}`, payload);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not update record.'));
  }
}

export async function deleteModuleRecord(moduleKey, recordId) {
  try {
    const response = await api.delete(`/modules/${moduleKey}/${recordId}`);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not delete record.'));
  }
}

export async function createReport(payload) {
  try {
    const response = await api.post('/reports', payload);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not create the report.'));
  }
}

export async function updateReport(reportId, payload) {
  try {
    const response = await api.put(`/reports/${reportId}`, payload);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not update the report.'));
  }
}

export async function deleteReport(reportId) {
  try {
    const response = await api.delete(`/reports/${reportId}`);
    return response.data;
  } catch (error) {
    throw new Error(getMessage(error, 'Could not delete the report.'));
  }
}

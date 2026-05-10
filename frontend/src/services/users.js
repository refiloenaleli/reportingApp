import {
  createLecturerUser,
  getUsers,
} from './api';

export async function loadLecturers(profile) {
  if (!['student', 'lecturer', 'prl', 'pl'].includes(profile?.role || '')) {
    return [];
  }

  const response = await getUsers('lecturer');
  return Array.isArray(response.users) ? response.users : [];
}

export async function loadStudents(profile) {
  if (!['lecturer', 'prl', 'pl'].includes(profile?.role || '')) {
    return [];
  }

  const response = await getUsers('student');
  return Array.isArray(response.users) ? response.users : [];
}

export async function createLecturerAccount(payload) {
  const response = await createLecturerUser(payload);
  return response.user;
}

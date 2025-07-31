// API service for new endpoints using fetch
import { UserInput, ChatInput } from '../types/types';

const API_BASE_URL = 'http://localhost:8000';

export const sendLogin = async (input: { email: string; password: string }) => {
  const formData = new URLSearchParams();
  formData.append('username', input.email);
  formData.append('password', input.password);
  const res = await fetch(`${API_BASE_URL}/auth/jwt/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
};

export const sendSignup = async (input: UserInput) => {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Signup failed');
  return res.json();
};

export const googleSignIn = async (idToken: string, email: string) => {
  const res = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({ email }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Google sign-in failed');
  return res.json();
};

export const getParentProfile = async () => {
  const res = await fetch(`${API_BASE_URL}/profile/parent`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch parent profile');
  return res.json();
};

export const updateParentProfile = async (profile: any) => {
  const res = await fetch(`${API_BASE_URL}/profile/parent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error('Failed to update parent profile');
  return res.json();
};

export const getChildren = async () => {
  const res = await fetch(`${API_BASE_URL}/profile/children`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch children');
  return res.json();
};

export const addChild = async (child: any) => {
  const res = await fetch(`${API_BASE_URL}/profile/children`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(child),
  });
  if (!res.ok) throw new Error('Failed to add child');
  return res.json();
};

export const updateChild = async (childId: string, child: any) => {
  const res = await fetch(`${API_BASE_URL}/profile/children/${childId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(child),
  });
  if (!res.ok) throw new Error('Failed to update child');
  return res.json();
};

export const deleteChild = async (childId: string) => {
  const res = await fetch(`${API_BASE_URL}/profile/children/${childId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete child');
  return res.json();
};

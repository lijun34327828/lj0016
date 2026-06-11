import { create } from 'zustand';
import type { User, UserRole, LoginResponse } from '../../shared/types';
import { api } from '../lib/api';

interface AuthState {
  user: User | null;
  studentId: number | null;
  coachId: number | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string, role: UserRole) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  studentId: null,
  coachId: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  
  login: async (username, password, role) => {
    set({ loading: true });
    try {
      const response = await api.auth.login({ username, password, role });
      
      if (response.success && response.data) {
        const { token, user, studentId, coachId } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({
          user,
          token,
          studentId: studentId || null,
          coachId: coachId || null,
          isAuthenticated: true,
          loading: false,
        });
        return { success: true };
      }
      
      set({ loading: false });
      return { success: false, message: response.message || response.error || '登录失败' };
    } catch (error) {
      set({ loading: false });
      return { success: false, message: '网络错误，请稍后重试' };
    }
  },
  
  logout: () => {
    api.auth.logout();
    set({
      user: null,
      studentId: null,
      coachId: null,
      token: null,
      isAuthenticated: false,
    });
  },
  
  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isAuthenticated: false });
      return false;
    }
    
    try {
      const response = await api.auth.me();
      if (response.success && response.data) {
        const { user, studentId, coachId } = response.data;
        localStorage.setItem('user', JSON.stringify(user));
        set({
          user,
          token,
          studentId: studentId || null,
          coachId: coachId || null,
          isAuthenticated: true,
        });
        return true;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
    
    api.auth.logout();
    set({ isAuthenticated: false, user: null, token: null });
    return false;
  },
}));

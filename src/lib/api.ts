import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  User,
  Student,
  Booking,
  Lesson,
  Leave,
  ExamScore,
  Venue,
  Coach,
  ConflictInfo,
  BatchScheduleRequest,
  DashboardStats,
  Reminder,
} from '../../shared/types';

const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  
  const data = await response.json();
  return data as ApiResponse<T>;
}

async function requestFormData<T>(
  endpoint: string,
  formData: FormData,
  method: string = 'POST'
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: formData,
  });
  
  const data = await response.json();
  return data as ApiResponse<T>;
}

export const api = {
  auth: {
    login: (data: LoginRequest) => request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    me: () => request<LoginResponse>('/auth/me'),
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
  
  students: {
    list: (params?: { page?: number; pageSize?: number; search?: string; status?: string }) => {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ list: Student[]; total: number }>(`/students?${query}`);
    },
    get: (id: number) => request<Student>(`/students/${id}`),
    create: (data: Partial<Student>) => request<Student>('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<Student>) => request<Student>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request(`/students/${id}`, { method: 'DELETE' }),
    checkDuplicate: (idCard: string) => request<{ exists: boolean }>('/students/check-duplicate', {
      method: 'POST',
      body: JSON.stringify({ idCard }),
    }),
    upload: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return requestFormData<{ filePath: string }>('/students/upload', formData);
    },
  },
  
  bookings: {
    list: (params?: { type?: string; status?: string; startDate?: string; endDate?: string }) => {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      return request<Booking[]>(`/bookings?${query}`);
    },
    create: (data: Partial<Booking>) => request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    checkConflict: (data: { studentId: number; venueId: number; coachId?: number; date: string; startTime: string; endTime: string }) => 
      request<ConflictInfo>('/bookings/check-conflict', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (id: number) => request(`/bookings/${id}`, { method: 'DELETE' }),
  },
  
  lessons: {
    list: (params?: { coachId?: number; venueId?: number; startDate?: string; endDate?: string; status?: string }) => {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      return request<Lesson[]>(`/lessons?${query}`);
    },
    batchSchedule: (data: BatchScheduleRequest) => request<{ lessons: Lesson[]; skipped: { date: string; reason: string }[] }>('/lessons/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    postpone: (id: number, days: number) => request<Lesson>(`/lessons/${id}/postpone`, {
      method: 'PUT',
      body: JSON.stringify({ days }),
    }),
    updateStatus: (id: number, status: string) => request<Lesson>(`/lessons/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  },
  
  leaves: {
    list: (params?: { status?: string }) => {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      return request<Leave[]>(`/leaves?${query}`);
    },
    create: (data: { lessonId: number; reason: string }) => request<Leave>('/leaves', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    audit: (id: number, status: 'approved' | 'rejected', auditRemark?: string) => request<Leave>(`/leaves/${id}/audit`, {
      method: 'PUT',
      body: JSON.stringify({ status, auditRemark }),
    }),
  },
  
  exams: {
    scores: {
      list: (params?: { subject?: number; passed?: boolean }) => {
        const query = new URLSearchParams(params as Record<string, string>).toString();
        return request<ExamScore[]>(`/exams/scores?${query}`);
      },
      create: (data: Partial<ExamScore>) => request<ExamScore>('/exams/scores', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    },
    archive: (studentId: number) => request('/exams/archive', {
      method: 'POST',
      body: JSON.stringify({ studentId, archiveType: 'graduation' }),
    }),
    archiveCandidates: () => request<Array<{
      id: number;
      name: string;
      phone: string;
      idCard: string;
      licenseType: string;
      enrollDate: string;
      scores: Array<{ subject: number; score: number; passed: boolean; examDate: string }>;
    }>>('/exams/archive/candidates'),
    archivedList: () => request<Array<{
      id: number;
      studentId: number;
      studentName: string;
      archiveDate: string;
      archiveType: string;
      phone: string;
      licenseType: string;
    }>>('/exams/archive'),
  },
  
  system: {
    venues: () => request<Venue[]>('/venues'),
    createVenue: (data: Partial<Venue>) => request<Venue>('/venues', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateVenue: (id: number, data: Partial<Venue>) => request<Venue>(`/venues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteVenue: (id: number) => request(`/venues/${id}`, {
      method: 'DELETE',
    }),
    coaches: () => request<Coach[]>('/coaches'),
    users: () => request<User[]>('/users'),
    createUser: (data: Partial<User> & { password: string }) => request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateUser: (id: number, data: Partial<User>) => request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteUser: (id: number) => request(`/users/${id}`, {
      method: 'DELETE',
    }),
    export: (params: { type: string; startDate?: string; endDate?: string; status?: string }) => {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      window.open(`${API_BASE}/export/data?${query}`, '_blank');
    },
  },
  
  dashboard: {
    stats: () => request<DashboardStats>('/dashboard/stats'),
    reminders: () => request<Reminder[]>('/dashboard/reminders'),
  },
};

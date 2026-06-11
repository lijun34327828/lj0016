export type UserRole = 'admin' | 'coach' | 'student';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  name: string;
  phone: string;
  createdAt: string;
}

export interface Student {
  id: number;
  userId?: number;
  name: string;
  idCard: string;
  phone: string;
  gender: 'male' | 'female';
  birthday: string;
  address: string;
  licenseType: 'C1' | 'C2' | 'B1' | 'B2' | 'A1' | 'A2';
  enrollDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  idCardFront?: string;
  idCardBack?: string;
  photo?: string;
  medicalReport?: string;
  createdAt: string;
}

export type BookingType = 'practice' | 'exam';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Booking {
  id: number;
  studentId: number;
  studentName?: string;
  type: BookingType;
  subject?: number;
  venueId: number;
  venueName?: string;
  coachId?: number;
  coachName?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
}

export interface ConflictInfo {
  hasConflict: boolean;
  conflicts: {
    type: 'venue' | 'coach' | 'student';
    id: number;
    name: string;
    startTime: string;
    endTime: string;
  }[];
}

export type LessonStatus = 'scheduled' | 'completed' | 'cancelled' | 'leave';

export interface Lesson {
  id: number;
  coachId: number;
  coachName?: string;
  venueId: number;
  venueName?: string;
  studentIds: number[];
  studentNames?: string[];
  date: string;
  startTime: string;
  endTime: string;
  subject: number;
  status: LessonStatus;
  groupId?: number;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface Leave {
  id: number;
  studentId: number;
  studentName?: string;
  lessonId: number;
  lessonInfo?: string;
  reason: string;
  status: LeaveStatus;
  auditRemark?: string;
  createdAt: string;
}

export interface ExamScore {
  id: number;
  studentId: number;
  studentName?: string;
  subject: number;
  score: number;
  passed: boolean;
  examDate: string;
  coachId: number;
  coachName?: string;
  remark?: string;
}

export type VenueType = 'training' | 'exam';

export interface Venue {
  id: number;
  name: string;
  type: VenueType;
  capacity: number;
  address: string;
}

export interface Coach {
  id: number;
  userId: number;
  name: string;
  phone: string;
  licenseTypes: string[];
  subjects: number[];
}

export interface DashboardStats {
  totalStudents: number;
  pendingStudents: number;
  todayBookings: number;
  todayLessons: number;
  monthlyTrend: { date: string; students: number; bookings: number }[];
  passRate: { subject: string; rate: number }[];
}

export interface Reminder {
  id: number;
  type: 'license_expiry' | 'exam_due' | 'lesson_today';
  title: string;
  description: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: User;
  studentId?: number;
  coachId?: number;
}

export interface BatchScheduleRequest {
  coachId: number;
  venueId: number;
  studentIds: number[];
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  subject: number;
  autoPostpone: boolean;
}

export interface ExportRequest {
  type: 'students' | 'bookings' | 'lessons' | 'scores';
  startDate?: string;
  endDate?: string;
  status?: string;
}

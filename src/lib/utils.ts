import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, format: string = 'YYYY-MM-DD'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes);
}

export function formatTime(time: string): string {
  return time.substring(0, 5);
}

export function getSubjectName(subject: number): string {
  const names: Record<number, string> = {
    1: '科目一（理论）',
    2: '科目二（场地）',
    3: '科目三（道路）',
    4: '科目四（安全文明）',
  };
  return names[subject] || `科目${subject}`;
}

export function getLicenseTypeName(type: string): string {
  const names: Record<string, string> = {
    C1: 'C1 手动挡',
    C2: 'C2 自动挡',
    B1: 'B1 中型客车',
    B2: 'B2 大型货车',
    A1: 'A1 大型客车',
    A2: 'A2 牵引车',
  };
  return names[type] || type;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    confirmed: 'bg-blue-100 text-blue-800',
    scheduled: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    rejected: 'bg-red-100 text-red-800',
    leave: 'bg-orange-100 text-orange-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusName(status: string): string {
  const names: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    confirmed: '已确认',
    scheduled: '已排期',
    completed: '已完成',
    cancelled: '已取消',
    rejected: '已驳回',
    leave: '已请假',
  };
  return names[status] || status;
}

export function getRoleName(role: string): string {
  const names: Record<string, string> = {
    admin: '管理员',
    coach: '教练',
    student: '学员',
  };
  return names[role] || role;
}

export function validateIdCard(idCard: string): { valid: boolean; message?: string } {
  if (!/^\d{17}[\dXx]$/.test(idCard)) {
    return { valid: false, message: '身份证号格式不正确' };
  }
  
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(idCard[i]) * weights[i];
  }
  
  const checkCode = checkCodes[sum % 11];
  if (idCard[17].toUpperCase() !== checkCode) {
    return { valid: false, message: '身份证号校验位不正确' };
  }
  
  return { valid: true };
}

export function validatePhone(phone: string): { valid: boolean; message?: string } {
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { valid: false, message: '手机号格式不正确' };
  }
  return { valid: true };
}

export function generateWeekDates(startDate: string, endDate: string, daysOfWeek: number[]): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const current = new Date(start);
  while (current <= end) {
    if (daysOfWeek.includes(current.getDay())) {
      dates.push(formatDate(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Users, MapPin, User, BookOpen, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, generateWeekDates, getSubjectName, formatTime } from '@/lib/utils';
import type { Coach, Venue, Student, Lesson, BatchScheduleRequest } from '../../shared/types';

interface SchedulePreview {
  date: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface ScheduleResult {
  success: boolean;
  lessons: Lesson[];
  skipped: { date: string; reason: string }[];
}

const weekOptions = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

const subjectOptions = [
  { value: 1, label: '科目一（理论）' },
  { value: 2, label: '科目二（场地）' },
  { value: 3, label: '科目三（道路）' },
  { value: 4, label: '科目四（安全文明）' },
];

export default function LessonSchedule() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [result, setResult] = useState<ScheduleResult | null>(null);

  const [formData, setFormData] = useState<Partial<BatchScheduleRequest>>({
    coachId: 0,
    venueId: 0,
    subject: 1,
    studentIds: [],
    startDate: '',
    endDate: '',
    daysOfWeek: [],
    startTime: '09:00',
    endTime: '11:00',
    autoPostpone: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coachesRes, venuesRes, studentsRes] = await Promise.all([
        api.system.coaches(),
        api.system.venues(),
        api.students.list({ pageSize: 1000, status: 'approved' }),
      ]);
      if (coachesRes.success && coachesRes.data) setCoaches(coachesRes.data);
      if (venuesRes.success && venuesRes.data) setVenues(venuesRes.data);
      if (studentsRes.success && studentsRes.data) setStudents(studentsRes.data.list);
    } catch (error) {
      console.error('Load data failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const previewDates = useMemo<SchedulePreview[]>(() => {
    if (!formData.startDate || !formData.endDate || !formData.daysOfWeek?.length) {
      return [];
    }
    const dates = generateWeekDates(formData.startDate, formData.endDate, formData.daysOfWeek);
    return dates.map((date) => ({
      date,
      dayOfWeek: new Date(date).getDay(),
      startTime: formData.startTime || '09:00',
      endTime: formData.endTime || '11:00',
    }));
  }, [formData.startDate, formData.endDate, formData.daysOfWeek, formData.startTime, formData.endTime]);

  const handleDayToggle = (day: number) => {
    const days = formData.daysOfWeek || [];
    const newDays = days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day];
    setFormData({ ...formData, daysOfWeek: newDays });
  };

  const handleStudentToggle = (studentId: number) => {
    const ids = formData.studentIds || [];
    const newIds = ids.includes(studentId)
      ? ids.filter((id) => id !== studentId)
      : [...ids, studentId];
    setFormData({ ...formData, studentIds: newIds });
  };

  const validateForm = (): boolean => {
    if (!formData.coachId) return false;
    if (!formData.venueId) return false;
    if (!formData.subject) return false;
    if (!formData.studentIds?.length) return false;
    if (!formData.startDate || !formData.endDate) return false;
    if (!formData.daysOfWeek?.length) return false;
    if (!formData.startTime || !formData.endTime) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.lessons.batchSchedule(formData as BatchScheduleRequest);
      if (res.success && res.data) {
        setResult({
          success: true,
          lessons: res.data.lessons,
          skipped: res.data.skipped,
        });
      }
    } catch (error) {
      console.error('Batch schedule failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getDayName = (day: number) => weekOptions.find((o) => o.value === day)?.label || '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">批量排课</h1>
          <p className="text-gray-500 mt-1">设置排课条件，批量生成课时安排</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">排课设置</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />教练
              </label>
              <select
                value={formData.coachId || ''}
                onChange={(e) => setFormData({ ...formData, coachId: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择教练</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>{coach.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />场地
              </label>
              <select
                value={formData.venueId || ''}
                onChange={(e) => setFormData({ ...formData, venueId: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择场地</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>{venue.name} ({venue.type === 'training' ? '训练' : '考试'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="w-4 h-4 inline mr-1" />科目
              </label>
              <select
                value={formData.subject || ''}
                onChange={(e) => setFormData({ ...formData, subject: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {subjectOptions.map((subject) => (
                  <option key={subject.value} value={subject.value}>{subject.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />学员（已选 {formData.studentIds?.length || 0} 人）
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                {students.map((student) => (
                  <label key={student.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={formData.studentIds?.includes(student.id)}
                      onChange={() => handleStudentToggle(student.id)}
                      className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{student.name}</span>
                    <span className="text-xs text-gray-400">{student.phone}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />开始日期
                </label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />结束日期
                </label>
                <input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />星期几
              </label>
              <div className="flex flex-wrap gap-2">
                {weekOptions.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => handleDayToggle(day.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      formData.daysOfWeek?.includes(day.value)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />开始时间
                </label>
                <input
                  type="time"
                  value={formData.startTime || ''}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />结束时间
                </label>
                <input
                  type="time"
                  value={formData.endTime || ''}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">自动顺延</span>
                <span className="text-xs text-gray-500">（遇到冲突或周末自动顺延）</span>
              </div>
              <button
                onClick={() => setFormData({ ...formData, autoPostpone: !formData.autoPostpone })}
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  formData.autoPostpone ? 'bg-blue-500' : 'bg-gray-300'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                    formData.autoPostpone ? 'translate-x-7' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full flex items-center justify-between text-lg font-semibold text-gray-800"
            >
              <span>课时预览（{previewDates.length} 个课时）</span>
              {showPreview ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {showPreview && (
              <div className="mt-4 max-h-96 overflow-y-auto">
                {previewDates.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">请选择日期范围和星期几以预览课时</p>
                ) : (
                  <div className="space-y-2">
                    {previewDates.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-800">{item.date}</span>
                          <span className="text-sm text-gray-500 ml-2">{getDayName(item.dayOfWeek)}</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {formatTime(item.startTime)} - {formatTime(item.endTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">排课摘要</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">教练</span>
                <span className="text-gray-800">{coaches.find((c) => c.id === formData.coachId)?.name || '未选择'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">场地</span>
                <span className="text-gray-800">{venues.find((v) => v.id === formData.venueId)?.name || '未选择'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">科目</span>
                <span className="text-gray-800">{getSubjectName(formData.subject || 1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">学员人数</span>
                <span className="text-gray-800">{formData.studentIds?.length || 0} 人</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">预计课时数</span>
                <span className="text-gray-800 font-semibold text-blue-600">{previewDates.length} 课时</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!validateForm() || submitting}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />提交中...</>
            ) : (
              <><CheckCircle className="w-5 h-5" />确认排课</>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">排课结果</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium text-green-800">成功生成</span>
              </div>
              <p className="text-3xl font-bold text-green-600">{result.lessons.length}</p>
              <p className="text-sm text-green-700 mt-1">个课时</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-orange-800">跳过</span>
              </div>
              <p className="text-3xl font-bold text-orange-600">{result.skipped.length}</p>
              <p className="text-sm text-orange-700 mt-1">个日期</p>
            </div>
          </div>

          {result.skipped.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">跳过的日期</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.skipped.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="text-gray-800">{item.date}</span>
                    <span className="text-sm text-orange-600">{item.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

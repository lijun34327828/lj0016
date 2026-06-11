import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import WeekView from '@/components/lessons/WeekView';
import LessonDetailModal from '@/components/lessons/LessonDetailModal';
import PostponeModal from '@/components/lessons/PostponeModal';
import { api } from '@/lib/api';
import { cn, formatDate, getSubjectName, getStatusColor } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { Lesson } from '../../shared/types';

type ViewMode = 'week' | 'month';

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'scheduled', label: '已排期' },
  { value: 'completed', label: '已完成' },
  { value: 'leave', label: '已请假' },
  { value: 'cancelled', label: '已取消' },
];

export default function LessonTimetable() {
  const { user, studentId, coachId } = useAuthStore();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [postponeModalOpen, setPostponeModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const loadLessons = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(currentDate);
      const end = new Date(currentDate);
      if (viewMode === 'week') {
        const day = start.getDay() || 7;
        start.setDate(start.getDate() - day + 1);
        end.setDate(start.getDate() + 6);
      } else {
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
      }
      const params: Record<string, string> = {
        startDate: formatDate(start),
        endDate: formatDate(end),
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (user?.role === 'student' && studentId) params.studentId = String(studentId);
      if (user?.role === 'coach' && coachId) params.coachId = String(coachId);
      const res = await api.lessons.list(params);
      if (res.success && res.data) setLessons(res.data);
    } catch (error) {
      console.error('Load lessons failed:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode, statusFilter, studentId, coachId, user?.role]);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  const filteredLessons = useMemo(() => {
    return statusFilter === 'all' ? lessons : lessons.filter((l) => l.status === statusFilter);
  }, [lessons, statusFilter]);

  const lessonsByDate = useMemo(() => {
    const grouped: Record<string, Lesson[]> = {};
    filteredLessons.forEach((lesson) => {
      if (!grouped[lesson.date]) grouped[lesson.date] = [];
      grouped[lesson.date].push(lesson);
    });
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [filteredLessons]);

  const monthDates = useMemo(() => {
    const dates: Date[] = [];
    const start = new Date(currentDate);
    start.setDate(1);
    start.setDate(start.getDate() - ((start.getDay() || 7) - 1));
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [currentDate]);

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setDetailModalOpen(true);
  };

  const handlePostpone = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setDetailModalOpen(false);
    setPostponeModalOpen(true);
  };

  const goToPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  };

  const goToNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  };

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">课表查看</h1>
        <p className="text-gray-500 mt-1">查看和管理课时安排</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button onClick={goToPrev} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg">
              今天
            </button>
            <button onClick={goToNext} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 ml-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-lg font-semibold text-gray-800">{formatDate(currentDate, 'YYYY年MM月')}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('week')}
                className={cn('px-3 py-1.5 text-sm font-medium rounded-md', viewMode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600')}
              >
                周视图
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={cn('px-3 py-1.5 text-sm font-medium rounded-md', viewMode === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600')}
              >
                <CalendarDays className="w-4 h-4 inline mr-1" />月视图
              </button>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">状态：</span>
          {statusOptions.slice(1).map((opt) => (
            <div key={opt.value} className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', getStatusColor(opt.value).split(' ')[0])} />
              <span className="text-xs text-gray-600">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : viewMode === 'week' ? (
        <WeekView lessons={filteredLessons} currentDate={currentDate} onDateChange={setCurrentDate} onLessonClick={handleLessonClick} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {['一', '二', '三', '四', '五', '六', '日'].map((day, i) => (
              <div key={day} className={cn('p-3 text-center font-medium text-sm', i >= 5 ? 'text-blue-600' : 'text-gray-600')}>
                周{day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDates.map((date, i) => {
              const dayLessons = lessonsByDate[formatDate(date)] || [];
              const inMonth = date.getMonth() === currentDate.getMonth();
              return (
                <div key={date.toISOString()} className={cn('min-h-[100px] border-r border-b border-gray-100 last:border-r-0 p-1', !inMonth && 'bg-gray-50', isToday(date) && 'bg-blue-50/30')}>
                  <div className={cn(
                    'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 mx-auto',
                    isToday(date) && 'bg-blue-500 text-white',
                    !isToday(date) && !inMonth && 'text-gray-400',
                    !isToday(date) && inMonth && i % 7 >= 5 && 'text-blue-600',
                    !isToday(date) && inMonth && i % 7 < 5 && 'text-gray-700'
                  )}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayLessons.slice(0, 2).map((lesson) => (
                      <div
                        key={lesson.id}
                        onClick={() => handleLessonClick(lesson)}
                        className={cn('px-1.5 py-0.5 rounded text-[10px] cursor-pointer truncate', getStatusColor(lesson.status))}
                      >
                        {lesson.startTime.substring(0, 5)} {getSubjectName(lesson.subject)}
                      </div>
                    ))}
                    {dayLessons.length > 2 && <div className="text-[10px] text-gray-500 text-center">+{dayLessons.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <LessonDetailModal lesson={selectedLesson} open={detailModalOpen} onClose={() => setDetailModalOpen(false)} onPostpone={handlePostpone} onUpdated={loadLessons} />
      <PostponeModal lesson={selectedLesson} open={postponeModalOpen} onClose={() => setPostponeModalOpen(false)} onPostponed={loadLessons} />
    </div>
  );
}

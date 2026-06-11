import { ChevronLeft, ChevronRight } from 'lucide-react';
import LessonCard from './LessonCard';
import { cn, formatDate } from '@/lib/utils';
import type { Lesson } from '../../../shared/types';

interface WeekViewProps {
  lessons: Lesson[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onLessonClick?: (lesson: Lesson) => void;
}

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

export default function WeekView({ lessons, currentDate, onDateChange, onLessonClick }: WeekViewProps) {
  const getWeekDates = (date: Date) => {
    const dates: Date[] = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay() || 7;
    startOfWeek.setDate(startOfWeek.getDate() - day + 1);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentDate);
  const today = new Date();

  const getLessonsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return lessons.filter((l) => l.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const goToPrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    onDateChange(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            本周
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="text-lg font-semibold text-gray-800">
          {formatDate(weekDates[0], 'YYYY年MM月DD日')} - {formatDate(weekDates[6], 'MM月DD日')}
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={cn(
              'p-3 text-center font-medium text-sm',
              index === 5 || index === 6 ? 'text-blue-600' : 'text-gray-600'
            )}
          >
            周{day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {weekDates.map((date, index) => {
          const dayLessons = getLessonsForDate(date);
          const isWeekend = index === 5 || index === 6;
          return (
            <div
              key={date.toISOString()}
              className={cn(
                'min-h-[120px] border-r border-b border-gray-100 last:border-r-0',
                isToday(date) && 'bg-blue-50/30',
                isWeekend && 'bg-gray-50/50'
              )}
            >
              <div className="p-2 border-b border-gray-100">
                <div className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mx-auto',
                  isToday(date) && 'bg-blue-500 text-white',
                  !isToday(date) && isWeekend && 'text-blue-600',
                  !isToday(date) && !isWeekend && 'text-gray-700'
                )}>
                  {date.getDate()}
                </div>
              </div>
              <div className="p-2 space-y-2">
                {dayLessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onClick={() => onLessonClick?.(lesson)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

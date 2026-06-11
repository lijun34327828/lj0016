import { MapPin, User, Users, Clock } from 'lucide-react';
import { cn, getSubjectName, getStatusName, formatTime } from '@/lib/utils';
import type { Lesson } from '../../../shared/types';

interface LessonCardProps {
  lesson: Lesson;
  onClick?: () => void;
  className?: string;
}

const statusBgColors: Record<string, string> = {
  scheduled: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-400',
  leave: 'bg-orange-500',
};

const statusBorderColors: Record<string, string> = {
  scheduled: 'border-blue-200 bg-blue-50',
  completed: 'border-green-200 bg-green-50',
  cancelled: 'border-gray-200 bg-gray-50',
  leave: 'border-orange-200 bg-orange-50',
};

export default function LessonCard({ lesson, onClick, className }: LessonCardProps) {
  const bgColor = statusBgColors[lesson.status] || 'bg-gray-400';
  const borderColor = statusBorderColors[lesson.status] || 'border-gray-200 bg-gray-50';

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]',
        borderColor,
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full flex-shrink-0', bgColor)} />
            <span className="font-medium text-sm text-gray-800 truncate">
              {getSubjectName(lesson.subject)}
            </span>
          </div>
          <span className={cn(
            'inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1',
            bgColor,
            'text-white'
          )}>
            {getStatusName(lesson.status)}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{lesson.coachName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{lesson.venueName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>{formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {lesson.studentNames?.slice(0, 2).join('、')}
            {lesson.studentNames && lesson.studentNames.length > 2 && ` 等${lesson.studentNames.length}人`}
          </span>
        </div>
      </div>
    </div>
  );
}

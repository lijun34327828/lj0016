import { AlertTriangle, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Reminder } from '../../../shared/types';

interface ReminderListProps {
  data: Reminder[];
}

const priorityConfig = {
  high: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
    text: 'text-red-700',
  },
  medium: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    text: 'text-orange-700',
  },
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    text: 'text-blue-700',
  },
};

const typeIcons = {
  license_expiry: AlertTriangle,
  exam_due: Calendar,
  lesson_today: Clock,
};

export default function ReminderList({ data }: ReminderListProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">到期提醒</h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {data.length === 0 ? (
          <p className="text-center text-gray-400 py-8">暂无提醒</p>
        ) : (
          data.map((reminder) => {
            const config = priorityConfig[reminder.priority];
            const Icon = typeIcons[reminder.type];
            return (
              <div
                key={reminder.id}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border',
                  config.bg,
                  config.border
                )}
              >
                <div className={cn('w-2 h-2 rounded-full mt-2', config.dot)}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('w-4 h-4', config.text)} />
                    <h4 className={cn('font-medium text-sm', config.text)}>
                      {reminder.title}
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{reminder.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{reminder.date}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

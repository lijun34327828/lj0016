import { useState } from 'react';
import { X, Calendar, Clock, Plus, Minus, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { getSubjectName, formatDate, formatTime } from '@/lib/utils';
import type { Lesson } from '../../../shared/types';

interface PostponeModalProps {
  lesson: Lesson | null;
  open: boolean;
  onClose: () => void;
  onPostponed?: () => void;
}

export default function PostponeModal({ lesson, open, onClose, onPostponed }: PostponeModalProps) {
  const [days, setDays] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!open || !lesson) return null;

  const newDate = new Date(lesson.date);
  newDate.setDate(newDate.getDate() + days);

  const handlePostpone = async () => {
    setLoading(true);
    try {
      const res = await api.lessons.postpone(lesson.id, days);
      if (res.success) {
        onPostponed?.();
        onClose();
        setDays(1);
      }
    } catch (error) {
      console.error('Postpone failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementDays = () => setDays((d) => Math.min(d + 1, 30));
  const decrementDays = () => setDays((d) => Math.max(d - 1, 1));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">顺延课时</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-blue-800">当前课时信息</span>
            </div>
            <div className="space-y-2 text-sm text-blue-700">
              <p>科目：{getSubjectName(lesson.subject)}</p>
              <p className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                原日期：{lesson.date}
              </p>
              <p className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                时间：{formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              顺延天数
            </label>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={decrementDays}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <Minus className="w-5 h-5 text-gray-600" />
              </button>
              <div className="text-center">
                <span className="text-4xl font-bold text-gray-800">{days}</span>
                <p className="text-sm text-gray-500 mt-1">天</p>
              </div>
              <button
                onClick={incrementDays}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-green-500" />
              <span className="font-medium text-green-800">顺延结果</span>
            </div>
            <p className="text-sm text-green-700">
              新日期：{formatDate(newDate)} {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handlePostpone}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />顺延中...</>
            ) : '确认顺延'}
          </button>
        </div>
      </div>
    </div>
  );
}

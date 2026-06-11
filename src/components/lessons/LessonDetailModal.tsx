import { useState } from 'react';
import { X, Calendar, Clock, MapPin, User, Users, BookOpen, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, getSubjectName, getStatusName, formatTime, getStatusColor } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { Lesson } from '../../../shared/types';

interface LessonDetailModalProps {
  lesson: Lesson | null;
  open: boolean;
  onClose: () => void;
  onPostpone?: (lesson: Lesson) => void;
  onUpdated?: () => void;
}

export default function LessonDetailModal({ lesson, open, onClose, onPostpone, onUpdated }: LessonDetailModalProps) {
  const { user } = useAuthStore();
  const [leaveReason, setLeaveReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);

  if (!open || !lesson) return null;

  const canEdit = user?.role === 'admin' || user?.role === 'coach';
  const isStudent = user?.role === 'student';

  const handleUpdateStatus = async (status: string) => {
    setLoading(true);
    try {
      const res = await api.lessons.updateStatus(lesson.id, status);
      if (res.success) {
        onUpdated?.();
        onClose();
      }
    } catch (error) {
      console.error('Update status failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveApply = async () => {
    if (!leaveReason.trim()) return;
    setLoading(true);
    try {
      const res = await api.leaves.create({ lessonId: lesson.id, reason: leaveReason });
      if (res.success) {
        onUpdated?.();
        onClose();
        setLeaveReason('');
        setShowLeaveForm(false);
      }
    } catch (error) {
      console.error('Leave apply failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">课时详情</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="flex items-center gap-3 mb-6">
            <div className={cn('w-3 h-3 rounded-full', getStatusColor(lesson.status).replace('bg-', 'bg-').replace('text-', ''))} />
            <div>
              <h3 className="text-lg font-medium text-gray-800">{getSubjectName(lesson.subject)}</h3>
              <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(lesson.status))}>
                {getStatusName(lesson.status)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">日期</p>
                <p className="text-gray-800">{lesson.date}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">时间</p>
                <p className="text-gray-800">{formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">教练</p>
                <p className="text-gray-800">{lesson.coachName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">场地</p>
                <p className="text-gray-800">{lesson.venueName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">学员</p>
                <p className="text-gray-800">{lesson.studentNames?.join('、')}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">科目</p>
                <p className="text-gray-800">{getSubjectName(lesson.subject)}</p>
              </div>
            </div>
          </div>

          {showLeaveForm && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                请假原因
              </label>
              <textarea
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                rows={3}
                placeholder="请输入请假原因..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            关闭
          </button>

          {isStudent && lesson.status === 'scheduled' && !showLeaveForm && (
            <button
              onClick={() => setShowLeaveForm(true)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              申请请假
            </button>
          )}

          {isStudent && showLeaveForm && (
            <button
              onClick={handleLeaveApply}
              disabled={loading || !leaveReason.trim()}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />提交中...</>
              ) : '确认请假'}
            </button>
          )}

          {canEdit && (
            <>
              <button
                onClick={() => onPostpone?.(lesson)}
                disabled={lesson.status !== 'scheduled'}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                顺延课时
              </button>

              {lesson.status === 'scheduled' && (
                <button
                  onClick={() => handleUpdateStatus('completed')}
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  标记完成
                </button>
              )}

              {lesson.status === 'scheduled' && (
                <button
                  onClick={() => handleUpdateStatus('cancelled')}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  取消课时
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

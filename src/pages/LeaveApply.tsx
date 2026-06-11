import { useState, useEffect } from 'react';
import { Calendar, Clock, FileText, Send, X, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, formatTime, getSubjectName, getStatusColor, getStatusName, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { Lesson, Leave } from '../../shared/types';

export default function LeaveApply() {
  const { studentId } = useAuthStore();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lessonsRes, leavesRes] = await Promise.all([
        api.lessons.list({ status: 'scheduled' }),
        api.leaves.list(),
      ]);
      if (lessonsRes.success && lessonsRes.data) {
        const filteredLessons = lessonsRes.data.filter(
          (lesson) => studentId && lesson.studentIds?.includes(studentId)
        );
        setLessons(filteredLessons);
      }
      if (leavesRes.success && leavesRes.data) {
        setLeaves(leavesRes.data);
      }
    } catch (error) {
      console.error('Fetch data failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const handleApply = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setReason('');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedLesson || !reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.leaves.create({
        lessonId: selectedLesson.id,
        reason: reason.trim(),
      });
      if (res.success) {
        setModalOpen(false);
        setReason('');
        fetchData();
      }
    } catch (error) {
      console.error('Submit leave failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">请假申请</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          可请假课时
        </h2>
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-gray-500 mt-2">加载中...</p>
          </div>
        ) : lessons.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无待上的课时</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {getSubjectName(lesson.subject)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                      getStatusColor(lesson.status)
                    )}
                  >
                    {getStatusName(lesson.status)}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{formatDate(lesson.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>
                      {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span>{lesson.venueName}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleApply(lesson)}
                  className="mt-4 w-full py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  请假
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          历史请假记录
        </h2>
        {leaves.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无请假记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    申请时间
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    课时信息
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    请假原因
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    状态
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    审核备注
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr
                    key={leave.id}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(leave.createdAt, 'YYYY-MM-DD HH:mm')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {leave.lessonInfo}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                      {leave.reason}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                          getStatusColor(leave.status)
                        )}
                      >
                        {getStatusIcon(leave.status)}
                        {getStatusName(leave.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {leave.auditRemark || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && selectedLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">请假申请</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-2">
              <p className="text-sm">
                <span className="text-gray-500">科目：</span>
                {getSubjectName(selectedLesson.subject)}
              </p>
              <p className="text-sm">
                <span className="text-gray-500">时间：</span>
                {formatDate(selectedLesson.date)} {formatTime(selectedLesson.startTime)} -{' '}
                {formatTime(selectedLesson.endTime)}
              </p>
              <p className="text-sm">
                <span className="text-gray-500">场地：</span>
                {selectedLesson.venueName}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                请假原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="请输入请假原因"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason.trim() || submitting}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

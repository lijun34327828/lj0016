import { useState, useEffect } from 'react';
import { User, Calendar, Clock, BookOpen, AlertCircle, Loader2, X, Check, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, getSubjectName, getMakeupStatusColor, getMakeupStatusName, formatDate } from '@/lib/utils';
import type { MakeupLesson } from '../../../shared/types';

interface MakeupListProps {
  onSchedule: (makeupLesson: MakeupLesson) => void;
  refreshTrigger?: number;
}

export default function MakeupList({ onSchedule, refreshTrigger }: MakeupListProps) {
  const [makeupLessons, setMakeupLessons] = useState<MakeupLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'scheduled'>('pending');
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const loadMakeupLessons = async () => {
    setLoading(true);
    try {
      const res = await api.makeup.list();
      if (res.success && res.data) {
        setMakeupLessons(res.data);
      }
    } catch (error) {
      console.error('Load makeup lessons failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMakeupLessons();
  }, [refreshTrigger]);

  const handleCancel = async (id: number) => {
    setCancellingId(id);
    try {
      const res = await api.makeup.cancel(id);
      if (res.success) {
        localStorage.setItem('dataRefresh', Date.now().toString());
        loadMakeupLessons();
      }
    } catch (error) {
      console.error('Cancel makeup failed:', error);
    } finally {
      setCancellingId(null);
    }
  };

  const pendingLessons = makeupLessons.filter((m) => m.status === 'pending');
  const scheduledLessons = makeupLessons.filter((m) => m.status === 'scheduled');
  const displayedLessons = activeTab === 'pending' ? pendingLessons : scheduledLessons;

  const renderMakeupCard = (makeup: MakeupLesson) => (
    <div
      key={makeup.id}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{makeup.studentName}</h3>
            <p className="text-xs text-gray-500">
              创建时间：{formatDate(makeup.createdAt, 'YYYY-MM-DD HH:mm')}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
            getMakeupStatusColor(makeup.status)
          )}
        >
          <AlertCircle className="w-3 h-3" />
          {getMakeupStatusName(makeup.status)}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-400" />
          <span>科目：{getSubjectName(makeup.subject)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>原课时：{makeup.originalLessonInfo}</span>
        </div>
        {makeup.makeupLessonInfo && (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="w-4 h-4" />
            <span>已安排：{makeup.makeupLessonInfo}</span>
          </div>
        )}
      </div>

      {makeup.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onSchedule(makeup)}
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Calendar className="w-4 h-4" />
            安排补课
          </button>
          <button
            onClick={() => handleCancel(makeup.id)}
            disabled={cancellingId === makeup.id}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            {cancellingId === makeup.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            取消
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">待补课管理</h2>
        <button
          onClick={loadMakeupLessons}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="刷新"
        >
          <RefreshCw className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mx-4 mt-4">
        <button
          onClick={() => setActiveTab('pending')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'pending'
              ? 'bg-white text-yellow-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          )}
        >
          待补课 ({pendingLessons.length})
        </button>
        <button
          onClick={() => setActiveTab('scheduled')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'scheduled'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          )}
        >
          已安排 ({scheduledLessons.length})
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-gray-500 mt-2">加载中...</p>
          </div>
        ) : displayedLessons.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>
              {activeTab === 'pending'
                ? '暂无待补课的学员'
                : '暂无已安排的补课'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayedLessons.map(renderMakeupCard)}
          </div>
        )}
      </div>
    </div>
  );
}

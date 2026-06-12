import { useState, useEffect, useCallback } from 'react';
import { Users, Clock, CalendarCheck, BookOpen, UserCheck, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import StatCard from '@/components/dashboard/StatCard';
import SkeletonCard from '@/components/dashboard/SkeletonCard';
import TrendChart from '@/components/dashboard/TrendChart';
import PassRateChart from '@/components/dashboard/PassRateChart';
import ReminderList from '@/components/dashboard/ReminderList';
import type { DashboardStats, Reminder } from '../../shared/types';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, remindersRes] = await Promise.all([
        api.dashboard.stats(),
        api.dashboard.reminders(),
      ]);
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (remindersRes.success && remindersRes.data) {
        setReminders(remindersRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dataRefresh') {
        fetchData();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const checkLocalRefresh = () => {
      const lastRefresh = localStorage.getItem('dataRefresh');
      if (lastRefresh) {
        fetchData();
        localStorage.removeItem('dataRefresh');
      }
    };
    const interval = setInterval(checkLocalRefresh, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [fetchData]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">仪表盘</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              title="总学员数"
              value={stats?.totalStudents || 0}
              icon={Users}
              color="blue"
            />
            <StatCard
              title="待审核"
              value={stats?.pendingStudents || 0}
              icon={Clock}
              color="yellow"
            />
            <StatCard
              title="今日预约"
              value={stats?.todayBookings || 0}
              icon={CalendarCheck}
              color="green"
            />
            <StatCard
              title="今日课时"
              value={stats?.todayLessons || 0}
              icon={BookOpen}
              color="orange"
            />
            <StatCard
              title="今日上课人次"
              value={stats?.todayStudentCount || 0}
              icon={UserCheck}
              color="purple"
            />
          </>
        )}
      </div>

      {(stats?.pendingMakeupCount ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">
              待补课学员 {stats?.pendingMakeupCount} 人
            </p>
            <p className="text-sm text-amber-600">请及时在课表页面安排补课</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="h-80 bg-gray-100 rounded-lg"></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="h-80 bg-gray-100 rounded-lg"></div>
            </div>
          </>
        ) : (
          <>
            <TrendChart data={stats?.monthlyTrend || []} />
            <PassRateChart data={stats?.passRate || []} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : (
          <ReminderList data={reminders} />
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Lock, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '../../shared/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user, checkAuth, loading } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verify = async () => {
      if (isAuthenticated) {
        await checkAuth();
      }
      setChecking(false);
    };
    verify();
  }, [isAuthenticated, checkAuth]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">无权限访问</h1>
          <p className="text-slate-500 mb-6">
            您的账户没有权限访问此页面。如需访问，请联系管理员。
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400 mb-6">
            <Lock className="w-4 h-4" />
            <span>需要以下角色之一: {roles.join('、')}</span>
          </div>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

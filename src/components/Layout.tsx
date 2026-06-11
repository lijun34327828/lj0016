import { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  CalendarClock,
  FileText,
  Clock,
  CalendarDays,
  FileCheck,
  Award,
  FolderKanban,
  UserCog,
  MapPin,
  Download,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Shield,
  UserCheck,
  GraduationCap,
  Menu,
  Bell,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '../../shared/types';

interface MenuItem {
  key: string;
  label: string;
  path: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  { key: 'dashboard', label: '仪表盘', path: '/', icon: LayoutDashboard, roles: ['admin', 'coach', 'student'] },
  { key: 'enroll', label: '学员报名', path: '/enroll', icon: UserPlus, roles: ['admin'] },
  { key: 'students', label: '学员列表', path: '/students', icon: Users, roles: ['admin', 'coach'] },
  { key: 'practice', label: '练车预约', path: '/practice', icon: CalendarClock, roles: ['admin', 'coach', 'student'] },
  { key: 'exam', label: '考试预约', path: '/exam', icon: FileText, roles: ['admin', 'coach', 'student'] },
  { key: 'schedule', label: '课时编排', path: '/schedule', icon: Clock, roles: ['admin', 'coach'] },
  { key: 'timetable', label: '课表查看', path: '/timetable', icon: CalendarDays, roles: ['admin', 'coach', 'student'] },
  { key: 'leave-audit', label: '请假审核', path: '/leave-audit', icon: FileCheck, roles: ['admin', 'coach'] },
  { key: 'leave-apply', label: '请假申请', path: '/leave-apply', icon: FileText, roles: ['student'] },
  { key: 'scores', label: '成绩录入', path: '/scores', icon: Award, roles: ['admin', 'coach'] },
  { key: 'archives', label: '档案管理', path: '/archives', icon: FolderKanban, roles: ['admin'] },
  { key: 'users', label: '用户管理', path: '/users', icon: UserCog, roles: ['admin'] },
  { key: 'venues', label: '场地管理', path: '/venues', icon: MapPin, roles: ['admin'] },
  { key: 'export', label: '数据导出', path: '/export', icon: Download, roles: ['admin'] },
];

const roleLabels: Record<UserRole, string> = {
  admin: '管理员',
  coach: '教练',
  student: '学员',
};

const roleIcons: Record<UserRole, React.ElementType> = {
  admin: Shield,
  coach: UserCheck,
  student: GraduationCap,
};

const breadcrumbMap: Record<string, string> = {
  '/': '仪表盘',
  '/enroll': '学员报名',
  '/students': '学员列表',
  '/practice': '练车预约',
  '/exam': '考试预约',
  '/schedule': '课时编排',
  '/timetable': '课表查看',
  '/leave-audit': '请假审核',
  '/leave-apply': '请假申请',
  '/scores': '成绩录入',
  '/archives': '档案管理',
  '/users': '用户管理',
  '/venues': '场地管理',
  '/export': '数据导出',
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const role = user?.role;
  const filteredMenuItems = role ? menuItems.filter((item) => item.roles.includes(role)) : [];
  const RoleIcon = role ? roleIcons[role] : User;
  const currentBreadcrumb = breadcrumbMap[location.pathname] || '首页';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={`bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-lg leading-tight">驾校管理</h1>
                <p className="text-xs text-slate-400">DRIVING SCHOOL</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-3 border-t border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">首页</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 font-medium">{currentBreadcrumb}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 pl-3 pr-2 py-1.5 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-700">{user?.name}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                    <RoleIcon className="w-3 h-3" />
                    {role ? roleLabels[role] : ''}
                  </p>
                </div>
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-700">{user?.name}</p>
                      <p className="text-xs text-slate-400">{user?.username}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

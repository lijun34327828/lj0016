import { useState, useEffect } from 'react';
import { UserCog, Plus, Edit2, Trash2, Loader2, AlertTriangle, X, Shield, UserCheck, GraduationCap } from 'lucide-react';
import { api } from '@/lib/api';
import { getRoleName, cn, formatDate } from '@/lib/utils';
import type { User, UserRole } from '../../shared/types';

const roleIcons: Record<UserRole, React.ElementType> = { admin: Shield, coach: UserCheck, student: GraduationCap };
const roleColors: Record<UserRole, string> = { admin: 'bg-red-100 text-red-800', coach: 'bg-blue-100 text-blue-800', student: 'bg-green-100 text-green-800' };

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; user?: User }>({ open: false });
  const [formData, setFormData] = useState({ username: '', password: '', role: 'student' as UserRole, name: '', phone: '' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.system.users();
      if (res.success && res.data) setUsers(res.data);
    } catch (error) {
      console.error('Fetch users failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingUser(null);
    setFormData({ username: '', password: '', role: 'student', name: '', phone: '' });
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setModalMode('edit');
    setEditingUser(user);
    setFormData({ username: user.username, password: '', role: user.role, name: user.name, phone: user.phone });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create' && (!formData.username || !formData.password)) return;
    if (!formData.role || !formData.name || !formData.phone) return;
    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const res = await api.system.createUser(formData);
        if (res.success) { setModalOpen(false); fetchUsers(); }
      } else if (editingUser) {
        const res = await api.system.updateUser(editingUser.id, { role: formData.role, name: formData.name, phone: formData.phone });
        if (res.success) { setModalOpen(false); fetchUsers(); }
      }
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.user) return;
    try {
      const res = await api.system.deleteUser(deleteConfirm.user.id);
      if (res.success) { setDeleteConfirm({ open: false }); fetchUsers(); }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          <Plus className="w-4 h-4" />新增用户
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-gray-500 mt-2">加载中...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <UserCog className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无用户数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">用户名</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">姓名</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">角色</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">手机号</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">创建时间</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const RoleIcon = roleIcons[user.role];
                  return (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center', roleColors[user.role])}>
                            <RoleIcon className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-gray-800">{user.username}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{user.name}</td>
                      <td className="py-4 px-4">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', roleColors[user.role])}>
                          <RoleIcon className="w-3 h-3" />{getRoleName(user.role)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{user.phone}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{formatDate(user.createdAt, 'YYYY-MM-DD HH:mm')}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEditModal(user)} className="p-2 text-gray-500 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="编辑">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm({ open: true, user })} disabled={user.username === 'admin'} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="删除">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{modalMode === 'create' ? '新增用户' : '编辑用户'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名 <span className="text-red-500">*</span></label>
                <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} disabled={modalMode === 'edit'} placeholder="请输入用户名" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed" />
              </div>
              {modalMode === 'create' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">密码 <span className="text-red-500">*</span></label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="请输入密码" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色 <span className="text-red-500">*</span></label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} disabled={editingUser?.username === 'admin'} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed">
                  <option value="admin">管理员</option>
                  <option value="coach">教练</option>
                  <option value="student">学员</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 <span className="text-red-500">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="请输入姓名" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号 <span className="text-red-500">*</span></label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="请输入手机号" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {modalMode === 'create' ? '创建' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm.open && deleteConfirm.user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">确认删除</h3>
                <p className="text-sm text-gray-500">此操作不可撤销</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">确定要删除用户 <span className="font-semibold">{deleteConfirm.user.name}</span> 吗？</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm({ open: false })} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={handleDelete} className="px-6 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

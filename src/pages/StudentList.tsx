import { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit2, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { getStatusName, getStatusColor, getLicenseTypeName, cn } from '@/lib/utils';
import Pagination from '@/components/common/Pagination';
import StudentModal from '@/components/students/StudentModal';
import type { Student } from '../../shared/types';

const statusTabs = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'completed', label: '已完成' },
];

export default function StudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [selectedStudent, setSelectedStudent] = useState<number | undefined>();

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: number; name?: string }>({
    open: false,
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.students.list({
        page,
        pageSize,
        search: search.trim() || undefined,
        status: status || undefined,
      });
      if (res.success && res.data) {
        setStudents(res.data.list);
        setTotal(res.data.total);
      }
    } catch (error) {
      console.error('Fetch students failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const handleView = (id: number) => {
    setSelectedStudent(id);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleEdit = (id: number) => {
    setSelectedStudent(id);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteConfirm({ open: true, id, name });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      const res = await api.students.delete(deleteConfirm.id);
      if (res.success) {
        setDeleteConfirm({ open: false });
        fetchStudents();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">学员管理</h1>
        <Link
          to="/enroll"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增学员
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索姓名、身份证号、手机号"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </form>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleStatusChange(tab.key)}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  status === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">姓名</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">身份证号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">手机号</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">准驾车型</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">报名日期</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">状态</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                    <p className="text-gray-500 mt-2">加载中...</p>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <p className="text-gray-400">暂无学员数据</p>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">
                            {student.name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{student.name}</p>
                          <p className="text-xs text-gray-400">
                            {student.gender === 'male' ? '男' : '女'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">{student.idCard}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{student.phone}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {getLicenseTypeName(student.licenseType)}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">{student.enrollDate}</td>
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          'inline-block px-2.5 py-1 rounded-full text-xs font-medium',
                          getStatusColor(student.status)
                        )}
                      >
                        {getStatusName(student.status)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleView(student.id)}
                          className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(student.id)}
                          className="p-2 text-gray-500 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(student.id, student.name)}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          current={page}
          pageSize={pageSize}
          total={total}
          onChange={setPage}
        />
      </div>

      <StudentModal
        studentId={selectedStudent}
        mode={modalMode}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchStudents}
      />

      {deleteConfirm.open && (
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
            <p className="text-gray-600 mb-6">
              确定要删除学员 <span className="font-semibold">{deleteConfirm.name}</span> 吗？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false })}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

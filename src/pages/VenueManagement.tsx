import { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, Loader2, AlertTriangle, X, Users, Building } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Venue, VenueType } from '../../shared/types';

const venueTypeLabels: Record<VenueType, string> = { training: '训练场地', exam: '考试场地' };
const venueTypeColors: Record<VenueType, string> = { training: 'bg-blue-100 text-blue-800', exam: 'bg-purple-100 text-purple-800' };

export default function VenueManagement() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; venue?: Venue }>({ open: false });
  const [formData, setFormData] = useState({ name: '', type: 'training' as VenueType, capacity: '', address: '' });

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const res = await api.system.venues();
      if (res.success && res.data) setVenues(res.data);
    } catch (error) {
      console.error('Fetch venues failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVenues(); }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingVenue(null);
    setFormData({ name: '', type: 'training', capacity: '', address: '' });
    setModalOpen(true);
  };

  const openEditModal = (venue: Venue) => {
    setModalMode('edit');
    setEditingVenue(venue);
    setFormData({ name: venue.name, type: venue.type, capacity: String(venue.capacity), address: venue.address });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.type || !formData.capacity || !formData.address) return;
    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const res = await api.system.createVenue({ name: formData.name, type: formData.type, capacity: parseInt(formData.capacity), address: formData.address });
        if (res.success) { setModalOpen(false); fetchVenues(); }
      } else if (editingVenue) {
        const res = await api.system.updateVenue(editingVenue.id, { name: formData.name, type: formData.type, capacity: parseInt(formData.capacity), address: formData.address });
        if (res.success) { setModalOpen(false); fetchVenues(); }
      }
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.venue) return;
    try {
      const res = await api.system.deleteVenue(deleteConfirm.venue.id);
      if (res.success) { setDeleteConfirm({ open: false }); fetchVenues(); }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">场地管理</h1>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          <Plus className="w-4 h-4" />新增场地
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-gray-500 mt-2">加载中...</p>
          </div>
        ) : venues.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无场地数据</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <div key={venue.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Building className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{venue.name}</h3>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', venueTypeColors[venue.type])}>
                        {venueTypeLabels[venue.type]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>容量：{venue.capacity} 人</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="flex-1">{venue.address}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(venue)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                    <Edit2 className="w-4 h-4" />编辑
                  </button>
                  <button onClick={() => setDeleteConfirm({ open: true, venue })} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" />删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{modalMode === 'create' ? '新增场地' : '编辑场地'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称 <span className="text-red-500">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="请输入场地名称" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型 <span className="text-red-500">*</span></label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as VenueType })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                  <option value="training">训练场地</option>
                  <option value="exam">考试场地</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">容量 <span className="text-red-500">*</span></label>
                <input type="number" min="1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} placeholder="请输入容量" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地址 <span className="text-red-500">*</span></label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="请输入地址" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
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

      {deleteConfirm.open && deleteConfirm.venue && (
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
            <p className="text-gray-600 mb-6">确定要删除场地 <span className="font-semibold">{deleteConfirm.venue.name}</span> 吗？</p>
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

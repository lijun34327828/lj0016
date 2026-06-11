import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { validateIdCard, validatePhone, getStatusName, getStatusColor, getLicenseTypeName, cn } from '@/lib/utils';
import type { Student } from '../../../shared/types';

interface StudentModalProps {
  studentId?: number;
  mode: 'view' | 'edit';
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type FormErrors = Partial<Record<keyof Student, string>>;

export default function StudentModal({ studentId, mode, open, onClose, onSaved }: StudentModalProps) {
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const isView = mode === 'view';

  useEffect(() => {
    if (open && studentId) {
      fetchStudent();
    } else if (open) {
      setFormData({});
      setErrors({});
    }
  }, [open, studentId]);

  const fetchStudent = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await api.students.get(studentId);
      if (res.success && res.data) {
        setFormData(res.data);
      }
    } catch (error) {
      console.error('Fetch student failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (data: Partial<Student>) => {
    setFormData({ ...formData, ...data });
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = '请输入姓名';
    }
    if (!formData.idCard) {
      newErrors.idCard = '请输入身份证号';
    } else {
      const idValidation = validateIdCard(formData.idCard);
      if (!idValidation.valid) {
        newErrors.idCard = idValidation.message;
      }
    }
    if (!formData.phone) {
      newErrors.phone = '请输入手机号';
    } else {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.valid) {
        newErrors.phone = phoneValidation.message;
      }
    }
    if (!formData.gender) {
      newErrors.gender = '请选择性别';
    }
    if (!formData.birthday) {
      newErrors.birthday = '请输入出生日期';
    }
    if (!formData.address?.trim()) {
      newErrors.address = '请输入住址';
    }
    if (!formData.licenseType) {
      newErrors.licenseType = '请选择准驾车型';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (studentId) {
        const res = await api.students.update(studentId, formData);
        if (res.success) {
          onSaved?.();
          onClose();
        }
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">
            {isView ? '学员详情' : '编辑学员'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : isView ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {formData.name?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{formData.name}</h3>
                  <span className={cn('inline-block px-2 py-1 rounded-full text-xs font-medium mt-1', getStatusColor(formData.status || ''))}>
                    {getStatusName(formData.status || '')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">身份证号</p>
                  <p className="text-gray-800">{formData.idCard}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">手机号</p>
                  <p className="text-gray-800">{formData.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">性别</p>
                  <p className="text-gray-800">{formData.gender === 'male' ? '男' : '女'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">出生日期</p>
                  <p className="text-gray-800">{formData.birthday}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">准驾车型</p>
                  <p className="text-gray-800">{formData.licenseType && getLicenseTypeName(formData.licenseType)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">报名日期</p>
                  <p className="text-gray-800">{formData.enrollDate}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-400">住址</p>
                  <p className="text-gray-800">{formData.address}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleChange({ name: e.target.value })}
                    className={cn('w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500', errors.name && 'border-red-500')}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => handleChange({ gender: e.target.value as 'male' | 'female' })}
                    className={cn('w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500', errors.gender && 'border-red-500')}
                  >
                    <option value="">请选择</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                  {errors.gender && <p className="text-xs text-red-500 mt-1">{errors.gender}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">身份证号</label>
                  <input
                    type="text"
                    value={formData.idCard || ''}
                    onChange={(e) => handleChange({ idCard: e.target.value })}
                    className={cn('w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500', errors.idCard && 'border-red-500')}
                  />
                  {errors.idCard && <p className="text-xs text-red-500 mt-1">{errors.idCard}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange({ phone: e.target.value })}
                    className={cn('w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500', errors.phone && 'border-red-500')}
                  />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">出生日期</label>
                  <input
                    type="date"
                    value={formData.birthday || ''}
                    onChange={(e) => handleChange({ birthday: e.target.value })}
                    className={cn('w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500', errors.birthday && 'border-red-500')}
                  />
                  {errors.birthday && <p className="text-xs text-red-500 mt-1">{errors.birthday}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">准驾车型</label>
                  <select
                    value={formData.licenseType || ''}
                    onChange={(e) => handleChange({ licenseType: e.target.value as Student['licenseType'] })}
                    className={cn('w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500', errors.licenseType && 'border-red-500')}
                  >
                    <option value="">请选择</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                  </select>
                  {errors.licenseType && <p className="text-xs text-red-500 mt-1">{errors.licenseType}</p>}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">住址</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleChange({ address: e.target.value })}
                    className={cn('w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500', errors.address && 'border-red-500')}
                  />
                  {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {isView ? '关闭' : '取消'}
          </button>
          {!isView && (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { validateIdCard, validatePhone, cn } from '@/lib/utils';
import type { Student } from '../../../shared/types';

interface EnrollStep1Props {
  formData: Partial<Student>;
  onChange: (data: Partial<Student>) => void;
  onValidChange: (valid: boolean) => void;
}

type FormErrors = Partial<Record<keyof Student, string>>;

export default function EnrollStep1({ formData, onChange, onValidChange }: EnrollStep1Props) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [checkingIdCard, setCheckingIdCard] = useState(false);
  const [idCardError, setIdCardError] = useState<string | null>(null);

  const extractIdCardInfo = (idCard: string) => {
    if (idCard.length === 18) {
      const year = idCard.slice(6, 10);
      const month = idCard.slice(10, 12);
      const day = idCard.slice(12, 14);
      const genderCode = parseInt(idCard.slice(16, 17));
      const gender = genderCode % 2 === 1 ? 'male' : 'female';
      const birthday = `${year}-${month}-${day}`;
      return { gender, birthday };
    }
    return null;
  };

  const handleIdCardChange = async (idCard: string) => {
    onChange({ idCard });
    setIdCardError(null);

    const idValidation = validateIdCard(idCard);
    if (!idValidation.valid) {
      setIdCardError(idValidation.message || '身份证号格式不正确');
      return;
    }

    const info = extractIdCardInfo(idCard);
    if (info) {
      onChange({ ...formData, idCard, gender: info.gender as 'male' | 'female', birthday: info.birthday });
    }

    if (idCard.length === 18) {
      setCheckingIdCard(true);
      try {
        const res = await api.students.checkDuplicate(idCard);
        if (res.data?.exists) {
          setIdCardError('该身份证号已存在');
        }
      } catch (error) {
        console.error('Check duplicate failed:', error);
      } finally {
        setCheckingIdCard(false);
      }
    }
  };

  const handlePhoneChange = (phone: string) => {
    onChange({ phone });
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid && phone.length > 0) {
      setErrors({ ...errors, phone: phoneValidation.message });
    } else {
      const newErrors = { ...errors };
      delete newErrors.phone;
      setErrors(newErrors);
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = '请输入姓名';
    }
    if (!formData.idCard) {
      newErrors.idCard = '请输入身份证号';
    }
    if (!formData.phone) {
      newErrors.phone = '请输入手机号';
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
    const isValid = Object.keys(newErrors).length === 0 && !idCardError;
    onValidChange(isValid);
    return isValid;
  };

  useEffect(() => {
    validateForm();
  }, [formData, idCardError]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">基本信息</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
            className={cn(
              'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none',
              errors.name ? 'border-red-500' : 'border-gray-300'
            )}
            placeholder="请输入姓名"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            身份证号 * {checkingIdCard && <span className="text-gray-400">校验中...</span>}
          </label>
          <input
            type="text"
            value={formData.idCard || ''}
            onChange={(e) => handleIdCardChange(e.target.value.toUpperCase())}
            maxLength={18}
            className={cn(
              'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none',
              idCardError ? 'border-red-500' : 'border-gray-300'
            )}
            placeholder="请输入18位身份证号"
          />
          {idCardError && <p className="text-red-500 text-xs mt-1">{idCardError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">手机号 *</label>
          <input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => handlePhoneChange(e.target.value)}
            maxLength={11}
            className={cn(
              'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none',
              errors.phone ? 'border-red-500' : 'border-gray-300'
            )}
            placeholder="请输入11位手机号"
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">性别 *</label>
          <select
            value={formData.gender || ''}
            onChange={(e) => onChange({ gender: e.target.value as 'male' | 'female' })}
            className={cn(
              'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none',
              errors.gender ? 'border-red-500' : 'border-gray-300'
            )}
          >
            <option value="">请选择</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
          {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">出生日期 *</label>
          <input
            type="date"
            value={formData.birthday || ''}
            onChange={(e) => onChange({ birthday: e.target.value })}
            className={cn(
              'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none',
              errors.birthday ? 'border-red-500' : 'border-gray-300'
            )}
          />
          {errors.birthday && <p className="text-red-500 text-xs mt-1">{errors.birthday}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">准驾车型 *</label>
          <select
            value={formData.licenseType || ''}
            onChange={(e) => onChange({ licenseType: e.target.value as Student['licenseType'] })}
            className={cn(
              'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none',
              errors.licenseType ? 'border-red-500' : 'border-gray-300'
            )}
          >
            <option value="">请选择</option>
            <option value="C1">C1 手动挡</option>
            <option value="C2">C2 自动挡</option>
            <option value="B1">B1 中型客车</option>
            <option value="B2">B2 大型货车</option>
            <option value="A1">A1 大型客车</option>
            <option value="A2">A2 牵引车</option>
          </select>
          {errors.licenseType && <p className="text-red-500 text-xs mt-1">{errors.licenseType}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">住址 *</label>
          <input
            type="text"
            value={formData.address || ''}
            onChange={(e) => onChange({ address: e.target.value })}
            className={cn(
              'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none',
              errors.address ? 'border-red-500' : 'border-gray-300'
            )}
            placeholder="请输入详细住址"
          />
          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
        </div>
      </div>
    </div>
  );
}

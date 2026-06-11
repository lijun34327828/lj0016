import { CheckCircle, FileText, User, Phone, MapPin, Calendar, Car } from 'lucide-react';
import { getLicenseTypeName } from '@/lib/utils';
import type { Student } from '../../../shared/types';

interface EnrollStep3Props {
  formData: Partial<Student>;
}

export default function EnrollStep3({ formData }: EnrollStep3Props) {
  const infoItems = [
    { icon: User, label: '姓名', value: formData.name },
    { icon: FileText, label: '身份证号', value: formData.idCard?.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2') },
    { icon: Phone, label: '手机号', value: formData.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') },
    { icon: User, label: '性别', value: formData.gender === 'male' ? '男' : '女' },
    { icon: Calendar, label: '出生日期', value: formData.birthday },
    { icon: MapPin, label: '住址', value: formData.address },
    { icon: Car, label: '准驾车型', value: formData.licenseType && getLicenseTypeName(formData.licenseType) },
  ];

  const fileItems = [
    { label: '身份证正面', value: formData.idCardFront },
    { label: '身份证反面', value: formData.idCardBack },
    { label: '一寸照片', value: formData.photo },
    { label: '体检报告', value: formData.medicalReport },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">确认报名信息</h2>
        <p className="text-sm text-gray-500 mt-1">请仔细核对以下信息，确认无误后提交</p>
      </div>

      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-medium text-gray-800 mb-4">基本信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {infoItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="text-sm font-medium text-gray-800">{item.value || '-'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-medium text-gray-800 mb-4">上传证件</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {fileItems.map((item) => (
            <div key={item.label} className="text-center">
              <div
                className={`w-full h-20 rounded-lg flex items-center justify-center mb-2 ${
                  item.value ? 'bg-green-100' : 'bg-gray-200'
                }`}
              >
                {item.value ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : (
                  <span className="text-gray-400">未上传</span>
                )}
              </div>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <p className="text-sm text-blue-700">
          <span className="font-medium">提示：</span>
          提交后将进入待审核状态，审核通过后即可开始预约练车。
        </p>
      </div>
    </div>
  );
}

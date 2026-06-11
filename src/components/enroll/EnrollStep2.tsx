import { useState, useEffect } from 'react';
import FileUpload from './FileUpload';
import { api } from '@/lib/api';
import type { Student } from '../../../shared/types';

interface EnrollStep2Props {
  formData: Partial<Student>;
  onChange: (data: Partial<Student>) => void;
  onValidChange: (valid: boolean) => void;
}

export default function EnrollStep2({ formData, onChange, onValidChange }: EnrollStep2Props) {
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});

  const handleUpload = async (file: File, field: keyof Student): Promise<string> => {
    setUploadProgress({ ...uploadProgress, [field]: true });
    try {
      const res = await api.students.upload(file);
      if (res.success && res.data) {
        onChange({ ...formData, [field]: res.data.filePath });
        return res.data.filePath;
      }
      throw new Error('Upload failed');
    } finally {
      setUploadProgress({ ...uploadProgress, [field]: false });
    }
  };

  const validateForm = () => {
    const isValid = !!(
      formData.idCardFront &&
      formData.idCardBack &&
      formData.photo &&
      formData.medicalReport
    );
    onValidChange(isValid);
    return isValid;
  };

  useEffect(() => {
    validateForm();
  }, [formData]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">证件上传</h2>
      <p className="text-sm text-gray-500 mb-6">请上传以下证件的清晰照片，支持拖拽或点击上传</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FileUpload
          label="身份证正面 *"
          accept="image/*"
          icon="id"
          value={formData.idCardFront}
          onChange={(path) => onChange({ idCardFront: path })}
          onUpload={(file) => handleUpload(file, 'idCardFront')}
        />

        <FileUpload
          label="身份证反面 *"
          accept="image/*"
          icon="id"
          value={formData.idCardBack}
          onChange={(path) => onChange({ idCardBack: path })}
          onUpload={(file) => handleUpload(file, 'idCardBack')}
        />

        <FileUpload
          label="一寸照片 *"
          accept="image/*"
          icon="photo"
          value={formData.photo}
          onChange={(path) => onChange({ photo: path })}
          onUpload={(file) => handleUpload(file, 'photo')}
        />

        <FileUpload
          label="体检报告 *"
          accept="image/*,.pdf"
          icon="medical"
          value={formData.medicalReport}
          onChange={(path) => onChange({ medicalReport: path })}
          onUpload={(file) => handleUpload(file, 'medicalReport')}
        />
      </div>
    </div>
  );
}

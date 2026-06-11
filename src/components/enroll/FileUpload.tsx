import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, FileText, Image, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  label: string;
  accept: string;
  value?: string;
  onChange: (filePath: string) => void;
  onUpload: (file: File) => Promise<string>;
  icon?: 'id' | 'photo' | 'medical';
}

const iconMap = {
  id: FileText,
  photo: Image,
  medical: FileCheck,
};

export default function FileUpload({
  label,
  accept,
  value,
  onChange,
  onUpload,
  icon = 'id',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = iconMap[icon];

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const filePath = await onUpload(file);
      setPreview(filePath);
      onChange(filePath);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview('');
    onChange('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  if (preview) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="relative">
          {accept.includes('image') && preview ? (
            <img
              src={preview}
              alt={label}
              className="w-full h-40 object-cover rounded-lg border border-gray-200"
            />
          ) : (
            <div className="w-full h-40 bg-green-50 rounded-lg border border-green-200 flex items-center justify-center">
              <div className="text-center">
                <FileCheck className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-600">已上传</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
        {uploading ? (
          <div className="animate-pulse">
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">上传中...</p>
          </div>
        ) : (
          <>
            <Icon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">点击或拖拽上传</p>
            <p className="text-xs text-gray-400 mt-1">支持 {accept}</p>
          </>
        )}
      </div>
    </div>
  );
}

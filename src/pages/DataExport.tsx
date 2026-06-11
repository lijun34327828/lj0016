import { useState } from 'react';
import { Download, FileText, Calendar, Filter, Users, CalendarCheck, Clock, Award } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ExportOption {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  statusOptions: { value: string; label: string }[];
}

const exportOptions: ExportOption[] = [
  {
    key: 'students',
    label: '学员数据',
    icon: Users,
    color: 'bg-blue-500',
    statusOptions: [
      { value: '', label: '全部状态' },
      { value: 'pending', label: '待审核' },
      { value: 'approved', label: '已通过' },
      { value: 'rejected', label: '已驳回' },
      { value: 'completed', label: '已完成' },
    ],
  },
  {
    key: 'bookings',
    label: '预约数据',
    icon: CalendarCheck,
    color: 'bg-green-500',
    statusOptions: [
      { value: '', label: '全部状态' },
      { value: 'pending', label: '待确认' },
      { value: 'confirmed', label: '已确认' },
      { value: 'cancelled', label: '已取消' },
      { value: 'completed', label: '已完成' },
    ],
  },
  {
    key: 'lessons',
    label: '课时数据',
    icon: Clock,
    color: 'bg-orange-500',
    statusOptions: [
      { value: '', label: '全部状态' },
      { value: 'scheduled', label: '已排期' },
      { value: 'completed', label: '已完成' },
      { value: 'cancelled', label: '已取消' },
      { value: 'leave', label: '已请假' },
    ],
  },
  {
    key: 'scores',
    label: '成绩数据',
    icon: Award,
    color: 'bg-purple-500',
    statusOptions: [],
  },
];

export default function DataExport() {
  const [selectedType, setSelectedType] = useState('students');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  const currentOption = exportOptions.find((o) => o.key === selectedType)!;

  const handleExport = () => {
    setExporting(true);
    try {
      const params: { type: string; startDate?: string; endDate?: string; status?: string } = {
        type: selectedType,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (status) params.status = status;
      api.system.export(params);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setTimeout(() => setExporting(false), 1000);
    }
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setStatus('');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">数据导出</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {exportOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.key;
          return (
            <button
              key={option.key}
              onClick={() => {
                setSelectedType(option.key);
                setStatus('');
              }}
              className={cn(
                'p-5 rounded-xl border-2 text-left transition-all',
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', option.color)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-800">{option.label}</h3>
              <p className="text-sm text-gray-500 mt-1">点击选择导出类型</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-500" />
          筛选条件
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              开始日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              结束日期
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          {currentOption.statusOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                状态筛选
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {currentOption.statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 mt-6 pt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileText className="w-4 h-4" />
            <span>
              导出类型：<span className="font-medium text-gray-700">{currentOption.label}</span>
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              重置
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  导出 Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h4 className="font-medium text-amber-800">导出说明</h4>
            <ul className="mt-1 text-sm text-amber-700 space-y-1">
              <li>• 学员数据按报名日期筛选，成绩数据按考试日期筛选</li>
              <li>• 预约和课时数据按日期字段筛选</li>
              <li>• 导出文件将自动下载到您的设备</li>
              <li>• 大数量导出可能需要几秒时间，请耐心等待</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

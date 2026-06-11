import { AlertTriangle, MapPin, User, Users, X } from 'lucide-react';
import type { ConflictInfo } from '../../../shared/types';

interface ConflictModalProps {
  open: boolean;
  conflictInfo: ConflictInfo | null;
  onClose: () => void;
}

const typeConfig = {
  venue: { icon: MapPin, label: '场地', color: 'text-orange-500 bg-orange-50' },
  coach: { icon: User, label: '教练', color: 'text-blue-500 bg-blue-50' },
  student: { icon: Users, label: '学员', color: 'text-green-500 bg-green-50' },
};

export default function ConflictModal({ open, conflictInfo, onClose }: ConflictModalProps) {
  if (!open || !conflictInfo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center gap-3 p-6 bg-red-50 border-b border-red-100">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-red-600">预约冲突</h2>
          <button
            onClick={onClose}
            className="ml-auto p-2 hover:bg-red-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-red-400" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
          <p className="text-gray-600">以下资源在所选时间段已被占用：</p>
          <div className="space-y-3">
            {conflictInfo.conflicts.map((conflict, index) => {
              const config = typeConfig[conflict.type];
              const Icon = config.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">
                        {config.label}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-800 truncate">
                      {conflict.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {conflict.startTime} - {conflict.endTime}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            重新选择
          </button>
        </div>
      </div>
    </div>
  );
}

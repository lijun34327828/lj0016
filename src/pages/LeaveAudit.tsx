import { useState, useEffect } from 'react';
import { User, Calendar, Clock, FileText, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, getStatusColor, getStatusName, cn } from '@/lib/utils';
import type { Leave } from '../../shared/types';

export default function LeaveAudit() {
  const [pendingLeaves, setPendingLeaves] = useState<Leave[]>([]);
  const [auditedLeaves, setAuditedLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; leaveId?: number }>({
    open: false,
  });
  const [auditRemark, setAuditRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'audited'>('pending');

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const [allRes, pendingRes] = await Promise.all([
        api.leaves.list(),
        api.leaves.list({ status: 'pending' }),
      ]);
      if (allRes.success && allRes.data) {
        const audited = allRes.data.filter((l) => l.status !== 'pending');
        setAuditedLeaves(audited);
      }
      if (pendingRes.success && pendingRes.data) {
        setPendingLeaves(pendingRes.data);
      }
    } catch (error) {
      console.error('Fetch leaves failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApprove = async (id: number) => {
    setSubmitting(true);
    try {
      const res = await api.leaves.audit(id, 'approved');
      if (res.success) {
        fetchLeaves();
      }
    } catch (error) {
      console.error('Approve failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectClick = (id: number) => {
    setRejectModal({ open: true, leaveId: id });
    setAuditRemark('');
  };

  const handleReject = async () => {
    if (!rejectModal.leaveId || !auditRemark.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.leaves.audit(rejectModal.leaveId, 'rejected', auditRemark.trim());
      if (res.success) {
        setRejectModal({ open: false });
        setAuditRemark('');
        fetchLeaves();
      }
    } catch (error) {
      console.error('Reject failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderLeaveCard = (leave: Leave, showActions: boolean = false) => (
    <div
      key={leave.id}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{leave.studentName}</h3>
            <p className="text-xs text-gray-500">
              申请时间：{formatDate(leave.createdAt, 'YYYY-MM-DD HH:mm')}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
            getStatusColor(leave.status)
          )}
        >
          <AlertCircle className="w-3 h-3" />
          {getStatusName(leave.status)}
        </span>
      </div>
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>课时：{leave.lessonInfo}</span>
        </div>
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
          <span className="flex-1">请假原因：{leave.reason}</span>
        </div>
        {leave.auditRemark && (
          <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
            <span className="flex-1 text-gray-500">审核备注：{leave.auditRemark}</span>
          </div>
        )}
      </div>
      {showActions && (
        <div className="flex gap-3">
          <button
            onClick={() => handleApprove(leave.id)}
            disabled={submitting}
            className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            通过
          </button>
          <button
            onClick={() => handleRejectClick(leave.id)}
            disabled={submitting}
            className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            驳回
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">请假审核</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'pending'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            )}
          >
            待审核 ({pendingLeaves.length})
          </button>
          <button
            onClick={() => setActiveTab('audited')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'audited'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            )}
          >
            已审核 ({auditedLeaves.length})
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-gray-500 mt-2">加载中...</p>
          </div>
        ) : activeTab === 'pending' ? (
          pendingLeaves.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无待审核的请假申请</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingLeaves.map((leave) => renderLeaveCard(leave, true))}
            </div>
          )
        ) : auditedLeaves.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无已审核的请假记录</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {auditedLeaves.map((leave) => renderLeaveCard(leave))}
          </div>
        )}
      </div>

      {rejectModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">驳回申请</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                审核备注 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={auditRemark}
                onChange={(e) => setAuditRemark(e.target.value)}
                placeholder="请输入驳回原因"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejectModal({ open: false })}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={!auditRemark.trim() || submitting}
                className="px-6 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                确认驳回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

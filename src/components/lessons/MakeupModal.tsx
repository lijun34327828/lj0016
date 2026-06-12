import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, MapPin, AlertTriangle, Loader2, BookOpen, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDate, getSubjectName, getMakeupStatusColor, getMakeupStatusName } from '@/lib/utils';
import type { MakeupLesson, Coach, Venue, ConflictInfo } from '../../../shared/types';
import ConflictModal from '../booking/ConflictModal';

interface MakeupModalProps {
  open: boolean;
  makeupLesson: MakeupLesson | null;
  onClose: () => void;
  onScheduled?: () => void;
}

const timeOptions = [
  '08:00', '09:00', '10:00', '11:00',
  '13:00', '14:00', '15:00', '16:00', '17:00'
];

export default function MakeupModal({ open, makeupLesson, onClose, onScheduled }: MakeupModalProps) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<number | ''>('');
  const [selectedVenue, setSelectedVenue] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (open) {
      loadOptions();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    const startIndex = timeOptions.indexOf(startTime);
    if (startIndex >= 0 && startIndex < timeOptions.length - 1) {
      setEndTime(timeOptions[startIndex + 1]);
    } else if (!startTime) {
      setEndTime('');
    }
  }, [startTime]);

  const loadOptions = async () => {
    try {
      const [coachesRes, venuesRes] = await Promise.all([
        api.system.coaches(),
        api.system.venues(),
      ]);
      if (coachesRes.success && coachesRes.data) {
        setCoaches(coachesRes.data);
      }
      if (venuesRes.success && venuesRes.data) {
        setVenues(venuesRes.data.filter((v) => v.type === 'training'));
      }
    } catch (error) {
      console.error('Load options failed:', error);
    }
  };

  const resetForm = () => {
    setSelectedCoach('');
    setSelectedVenue('');
    setSelectedDate('');
    setStartTime('');
    setEndTime('');
    setSubmitting(false);
    setCheckingConflict(false);
    setConflictInfo(null);
    setShowConflictModal(false);
    setSuccessMessage('');
  };

  const isFormValid = selectedCoach && selectedVenue && selectedDate && startTime && endTime;

  const handleCheckConflict = async () => {
    if (!isFormValid || !makeupLesson) return;

    setCheckingConflict(true);
    try {
      const res = await api.makeup.checkConflict({
        coachId: selectedCoach as number,
        venueId: selectedVenue as number,
        date: selectedDate,
        startTime,
        endTime,
        studentId: makeupLesson.studentId,
      });
      if (res.success && res.data) {
        setConflictInfo(res.data);
        if (res.data.hasConflict) {
          setShowConflictModal(true);
        } else {
          setConflictInfo({ hasConflict: false, conflicts: [] });
        }
      }
    } catch (error) {
      console.error('Check conflict failed:', error);
    } finally {
      setCheckingConflict(false);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid || !makeupLesson || conflictInfo?.hasConflict) return;

    setSubmitting(true);
    try {
      const res = await api.makeup.schedule({
        makeupLessonId: makeupLesson.id,
        coachId: selectedCoach as number,
        venueId: selectedVenue as number,
        date: selectedDate,
        startTime,
        endTime,
      });
      if (res.success) {
        setSuccessMessage('补课安排成功！');
        localStorage.setItem('dataRefresh', Date.now().toString());
        setTimeout(() => {
          onScheduled?.();
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Schedule makeup failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !makeupLesson) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center gap-3 p-6 border-b border-gray-100">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">安排补课</h2>
              <p className="text-sm text-gray-500">为学员安排补课时段</p>
            </div>
            <button
              onClick={onClose}
              className="ml-auto p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={submitting}
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {successMessage ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-xl font-semibold text-green-600">{successMessage}</p>
            </div>
          ) : (
            <>
              <div className="p-6 space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-yellow-800 mb-2">补课信息</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-yellow-500" />
                          <span className="text-gray-600">学员：</span>
                          <span className="font-medium text-gray-800">{makeupLesson.studentName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-yellow-500" />
                          <span className="text-gray-600">科目：</span>
                          <span className="font-medium text-gray-800">{getSubjectName(makeupLesson.subject)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-yellow-500" />
                          <span className="text-gray-600">原课时：</span>
                          <span className="font-medium text-gray-800">{makeupLesson.originalLessonInfo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          <span className="text-gray-600">状态：</span>
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getMakeupStatusColor(makeupLesson.status))}>
                            {getMakeupStatusName(makeupLesson.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      选择教练 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedCoach}
                      onChange={(e) => setSelectedCoach(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      disabled={submitting}
                    >
                      <option value="">请选择教练</option>
                      {coaches.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.name} - {coach.subjects.map((s) => getSubjectName(s)).join(', ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      选择场地 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedVenue}
                      onChange={(e) => setSelectedVenue(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      disabled={submitting}
                    >
                      <option value="">请选择场地</option>
                      {venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                          {venue.name} (容量：{venue.capacity}人)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={formatDate(new Date())}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      开始时间 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      disabled={submitting}
                    >
                      <option value="">请选择开始时间</option>
                      {timeOptions.slice(0, -1).map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      结束时间 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50"
                      disabled
                    >
                      <option value="">自动计算</option>
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {conflictInfo && !conflictInfo.hasConflict && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <p className="text-green-700 font-medium">所选时间段无冲突，可以安排</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={submitting}
                >
                  取消
                </button>
                <button
                  onClick={handleCheckConflict}
                  disabled={!isFormValid || checkingConflict || submitting}
                  className="px-6 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                >
                  {checkingConflict ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  检查冲突
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!isFormValid || conflictInfo?.hasConflict || submitting || !conflictInfo}
                  className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  确认安排
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ConflictModal
        open={showConflictModal}
        conflictInfo={conflictInfo}
        onClose={() => setShowConflictModal(false)}
      />
    </>
  );
}

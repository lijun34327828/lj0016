import { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin, Check, Award, AlertCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, getSubjectName } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import ConflictModal from '@/components/booking/ConflictModal';
import type { Booking, Venue, ConflictInfo, ExamScore } from '../../shared/types';

const EXAM_SESSIONS = [
  { name: '上午', start: '09:00', end: '12:00' },
  { name: '下午', start: '14:00', end: '17:00' },
];

const SUBJECTS = [1, 2, 3, 4];

export default function BookingExam() {
  const { studentId } = useAuthStore();
  const [subject, setSubject] = useState<number | ''>('');
  const [examDate, setExamDate] = useState('');
  const [session, setSession] = useState<{ name: string; start: string; end: string } | null>(null);
  const [venueId, setVenueId] = useState<number | ''>('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [scores, setScores] = useState<ExamScore[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [conflictModal, setConflictModal] = useState({ open: false, info: null as ConflictInfo | null });
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);

  const examVenues = useMemo(() => venues.filter(v => v.type === 'exam'), [venues]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [venuesRes, bookingsRes, scoresRes] = await Promise.all([
          api.system.venues(),
          api.bookings.list({ type: 'exam' }),
          api.exams.scores.list(),
        ]);
        if (venuesRes.success && venuesRes.data) setVenues(venuesRes.data);
        if (bookingsRes.success && bookingsRes.data) setBookings(bookingsRes.data);
        if (scoresRes.success && scoresRes.data) setScores(scoresRes.data);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!examDate || !venueId) {
      setOccupiedSlots(new Set());
      return;
    }
    const selectedVenue = venues.find(v => v.id === venueId);
    const capacity = selectedVenue?.capacity ?? 1;
    const occupied = new Set<string>();
    const slotCounts: Record<string, number> = {};
    bookings.forEach(b => {
      if (b.date === examDate && b.venueId === venueId && b.status !== 'cancelled') {
        slotCounts[b.startTime] = (slotCounts[b.startTime] || 0) + 1;
      }
    });
    for (const [startTime, count] of Object.entries(slotCounts)) {
      if (count >= capacity) {
        occupied.add(startTime);
      }
    }
    setOccupiedSlots(occupied);
  }, [examDate, venueId, bookings, venues]);

  const handleSubmit = async () => {
    if (!subject || !examDate || !session || !venueId || !studentId) return;
    setSubmitting(true);
    setSuccessBooking(null);
    try {
      const conflictRes = await api.bookings.checkConflict({
        studentId, venueId,
        date: examDate, startTime: session.start, endTime: session.end,
      });
      if (conflictRes.success && conflictRes.data?.hasConflict) {
        setConflictModal({ open: true, info: conflictRes.data });
        setSubmitting(false);
        return;
      }
      const createRes = await api.bookings.create({
        studentId, type: 'exam', subject: subject as number, venueId,
        date: examDate, startTime: session.start, endTime: session.end,
      });
      if (createRes.success && createRes.data) {
        setBookings(prev => [createRes.data!, ...prev]);
        setSuccessBooking(createRes.data);
        setSession(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isPast = (date: string) => date < new Date().toISOString().split('T')[0];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">考试预约</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-800">预约信息</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">考试科目</label>
            <div className="grid grid-cols-4 gap-2">
              {SUBJECTS.map(s => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={cn(
                    'py-3 rounded-lg text-sm font-medium transition-all border',
                    subject === s ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                  )}
                >{getSubjectName(s).split('（')[0]}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> 考试日期
            </label>
            <input
              type="date"
              value={examDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => { setExamDate(e.target.value); setSession(null); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MapPin className="w-4 h-4" /> 考场选择
            </label>
            <select
              value={venueId}
              onChange={e => { setVenueId(e.target.value ? Number(e.target.value) : ''); setSession(null); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">请选择考场</option>
              {examVenues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Clock className="w-4 h-4" /> 考试场次
            </label>
            <div className="grid grid-cols-2 gap-3">
              {EXAM_SESSIONS.map(s => {
                const isOccupied = occupiedSlots.has(s.start);
                const isSelected = session?.name === s.name;
                const slotDisabled = !examDate || !venueId || isOccupied;
                return (
                  <button
                    key={s.name}
                    disabled={slotDisabled}
                    onClick={() => setSession(s)}
                    className={cn(
                      'py-4 rounded-lg text-sm font-medium transition-all border',
                      isSelected && 'bg-purple-500 text-white border-purple-500',
                      !isSelected && !isOccupied && !slotDisabled && 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50',
                      isOccupied && 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through',
                      slotDisabled && !isOccupied && 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                    )}
                  >
                    <div className="text-lg">{s.name}</div>
                    <div className="text-xs opacity-75 mt-1">{s.start} - {s.end}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!subject || !examDate || !session || !venueId || !studentId || submitting}
            className="w-full py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />提交中...</>
            ) : '确认预约'}
          </button>
        </div>

        <div className="space-y-6">
          {successBooking && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-700">预约成功！</h3>
                  <p className="text-sm text-green-600">请准时参加考试</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">科目</span>
                  <span className="font-medium text-gray-800">{successBooking.subject && getSubjectName(successBooking.subject)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">日期</span>
                  <span className="font-medium text-gray-800">{successBooking.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">时间</span>
                  <span className="font-medium text-gray-800">{successBooking.startTime} - {successBooking.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">考场</span>
                  <span className="font-medium text-gray-800">{successBooking.venueName}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              历史考试成绩
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
              </div>
            ) : scores.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无考试成绩</div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {scores.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{getSubjectName(s.subject)}</p>
                      <p className="text-sm text-gray-500">{s.examDate}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-lg font-bold', s.passed ? 'text-green-500' : 'text-red-500')}>
                        {s.score}分
                      </p>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', s.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                        {s.passed ? '通过' : '未通过'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-500" />
              考试预约记录
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">暂无预约记录</div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {bookings.map(b => (
                  <div key={b.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">
                        {b.subject && getSubjectName(b.subject)}
                      </span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full',
                        b.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                        b.status === 'completed' ? 'bg-green-100 text-green-700' :
                        b.status === 'cancelled' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                      )}>
                        {b.status === 'confirmed' ? '已确认' :
                         b.status === 'completed' ? '已完成' :
                         b.status === 'cancelled' ? '已取消' : b.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {b.date} {b.startTime}-{b.endTime} · {b.venueName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConflictModal
        open={conflictModal.open}
        conflictInfo={conflictModal.info}
        onClose={() => setConflictModal({ open: false, info: null })}
      />
    </div>
  );
}

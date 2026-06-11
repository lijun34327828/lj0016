import { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, User, Check, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, getStatusColor, getStatusName } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import ConflictModal from '@/components/booking/ConflictModal';
import type { Booking, Venue, Coach, ConflictInfo } from '../../shared/types';

const TIME_SLOTS = [
  { start: '08:00', end: '09:00' }, { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' }, { start: '11:00', end: '12:00' },
  { start: '14:00', end: '15:00' }, { start: '15:00', end: '16:00' },
  { start: '16:00', end: '17:00' }, { start: '17:00', end: '18:00' },
];

export default function BookingPractice() {
  const { studentId } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [venueId, setVenueId] = useState<number | ''>('');
  const [coachId, setCoachId] = useState<number | ''>('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [conflictModal, setConflictModal] = useState({ open: false, info: null as ConflictInfo | null });
  const [successMsg, setSuccessMsg] = useState('');

  const trainingVenues = useMemo(() => venues.filter(v => v.type === 'training'), [venues]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];
    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, day: d.getDate(), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`, day: i, isCurrentMonth: true });
    }
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, day: d.getDate(), isCurrentMonth: false });
    }
    return days;
  }, [currentMonth]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [venuesRes, coachesRes, bookingsRes] = await Promise.all([
          api.system.venues(), api.system.coaches(), api.bookings.list({ type: 'practice' }),
        ]);
        if (venuesRes.success && venuesRes.data) setVenues(venuesRes.data);
        if (coachesRes.success && coachesRes.data) setCoaches(coachesRes.data);
        if (bookingsRes.success && bookingsRes.data) setBookings(bookingsRes.data);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedDate || !venueId) {
      setOccupiedSlots(new Set());
      return;
    }
    const occupied = new Set<string>();
    bookings.forEach(b => {
      if (b.date === selectedDate && b.venueId === venueId && b.status !== 'cancelled') {
        occupied.add(`${b.startTime}-${b.endTime}`);
      }
    });
    setOccupiedSlots(occupied);
  }, [selectedDate, venueId, bookings]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot || !venueId || !studentId) return;
    setSubmitting(true);
    setSuccessMsg('');
    try {
      const conflictRes = await api.bookings.checkConflict({
        studentId, venueId, coachId: coachId || undefined,
        date: selectedDate, startTime: selectedSlot.start, endTime: selectedSlot.end,
      });
      if (conflictRes.success && conflictRes.data?.hasConflict) {
        setConflictModal({ open: true, info: conflictRes.data });
        setSubmitting(false);
        return;
      }
      const createRes = await api.bookings.create({
        studentId, type: 'practice', venueId, coachId: coachId || undefined,
        date: selectedDate, startTime: selectedSlot.start, endTime: selectedSlot.end,
      });
      if (createRes.success && createRes.data) {
        setBookings(prev => [createRes.data!, ...prev]);
        setSuccessMsg('预约成功！');
        setSelectedSlot(null);
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('确定要取消此预约吗？')) return;
    try {
      const res = await api.bookings.cancel(id);
      if (res.success && res.data) {
        setBookings(prev => prev.map(b => b.id === id ? res.data as Booking : b));
      }
    } catch (error) {
      console.error('Cancel failed:', error);
    }
  };

  const isPast = (date: string) => date < new Date().toISOString().split('T')[0];
  const isToday = (date: string) => date === new Date().toISOString().split('T')[0];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">练车预约</h1>
      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          <Check className="w-5 h-5" />{successMsg}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />选择日期
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium text-gray-700 min-w-[120px] text-center">
                {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
              </span>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="text-center text-sm font-medium text-gray-500 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, day, isCurrentMonth }) => {
              const disabled = isPast(date);
              const selected = selectedDate === date;
              return (
                <button
                  key={date}
                  disabled={disabled}
                  onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                  className={cn(
                    'py-3 rounded-lg text-sm font-medium transition-all',
                    !isCurrentMonth && 'text-gray-300',
                    isCurrentMonth && !disabled && !selected && 'hover:bg-blue-50 text-gray-700',
                    isCurrentMonth && isToday(date) && !selected && 'bg-blue-50 text-blue-600 font-bold',
                    selected && 'bg-blue-500 text-white hover:bg-blue-600',
                    disabled && 'text-gray-300 cursor-not-allowed'
                  )}
                >{day}</button>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <MapPin className="w-4 h-4" /> 训练场地
              </label>
              <select
                value={venueId}
                onChange={e => { setVenueId(e.target.value ? Number(e.target.value) : ''); setSelectedSlot(null); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择场地</option>
                {trainingVenues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <User className="w-4 h-4" /> 选择教练
              </label>
              <select
                value={coachId}
                onChange={e => setCoachId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">暂不指定</option>
                {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
              <Clock className="w-4 h-4" /> 选择时间段
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map(slot => {
                const slotKey = `${slot.start}-${slot.end}`;
                const isOccupied = occupiedSlots.has(slotKey);
                const isSelected = selectedSlot?.start === slot.start;
                const slotDisabled = !selectedDate || !venueId || isOccupied;
                return (
                  <button
                    key={slotKey}
                    disabled={slotDisabled}
                    onClick={() => setSelectedSlot(slot)}
                    className={cn(
                      'py-3 px-2 rounded-lg text-sm font-medium transition-all border',
                      isSelected && 'bg-blue-500 text-white border-blue-500',
                      !isSelected && !isOccupied && !slotDisabled && 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50',
                      isOccupied && 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through',
                      slotDisabled && !isOccupied && 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                    )}
                  >
                    <div>{slot.start}</div><div className="text-xs opacity-75">|</div><div>{slot.end}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              <span className="inline-block w-3 h-3 bg-gray-100 border border-gray-200 rounded mr-1 align-middle"></span> 已占用
              <span className="inline-block w-3 h-3 bg-white border border-gray-200 rounded ml-4 mr-1 align-middle"></span> 可选择
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedSlot || !venueId || !studentId || submitting}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />提交中...</>
            ) : '确认预约'}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">我的预约</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无预约记录</div>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{b.date}</p>
                    <p className="text-sm text-gray-500">
                      {b.startTime} - {b.endTime} · {b.venueName}
                      {b.coachName && ` · 教练: ${b.coachName}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('px-3 py-1 rounded-full text-xs font-medium', getStatusColor(b.status))}>
                    {getStatusName(b.status)}
                  </span>
                  {b.status !== 'cancelled' && (
                    <button onClick={() => handleCancel(b.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="取消预约">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConflictModal
        open={conflictModal.open}
        conflictInfo={conflictModal.info}
        onClose={() => setConflictModal({ open: false, info: null })}
      />
    </div>
  );
}

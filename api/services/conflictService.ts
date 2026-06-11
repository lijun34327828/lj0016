import db from '../db';
import type { ConflictInfo, Booking, Lesson } from '../../shared/types';

const TIME_OVERLAP_SQL = `
  AND start_time < ? 
  AND end_time > ?
`;

const BOOKING_STATUS_FILTER = "AND b.status IN ('pending', 'confirmed')";
const LESSON_STATUS_FILTER = "AND l.status IN ('scheduled', 'completed')";

function isTimeOverlap(
  newStartTime: string,
  newEndTime: string,
  existingStartTime: string,
  existingEndTime: string
): boolean {
  return newStartTime < existingEndTime && newEndTime > existingStartTime;
}

function mapBookingRow(row: {
  id: number;
  student_id: number;
  type: string;
  subject?: number;
  venue_id: number;
  coach_id?: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
} & { venueName?: string; coachName?: string; studentName?: string }): Booking {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.studentName,
    type: row.type as Booking['type'],
    subject: row.subject,
    venueId: row.venue_id,
    venueName: row.venueName,
    coachId: row.coach_id,
    coachName: row.coachName,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status as Booking['status'],
  };
}

function mapLessonRow(row: {
  id: number;
  coach_id: number;
  venue_id: number;
  student_ids: string;
  date: string;
  start_time: string;
  end_time: string;
  subject: number;
  status: string;
  group_id?: number;
} & { venueName?: string; coachName?: string }): Lesson {
  return {
    id: row.id,
    coachId: row.coach_id,
    coachName: row.coachName,
    venueId: row.venue_id,
    venueName: row.venueName,
    studentIds: JSON.parse(row.student_ids),
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    subject: row.subject,
    status: row.status as Lesson['status'],
    groupId: row.group_id,
  };
}

export function checkBookingConflict(
  studentId: number,
  venueId: number,
  coachId: number | null,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: number
): ConflictInfo {
  const conflicts: ConflictInfo['conflicts'] = [];

  const excludeSql = excludeId ? 'AND b.id != ?' : '';
  const excludeParams = excludeId ? [excludeId] : [];

  const venueBookingRows = db
    .prepare(
      `SELECT b.*, v.name as venueName 
       FROM bookings b 
       JOIN venues v ON b.venue_id = v.id 
       WHERE b.venue_id = ? AND b.date = ? ${excludeSql} ${BOOKING_STATUS_FILTER} ${TIME_OVERLAP_SQL}`
    )
    .all(venueId, date, ...excludeParams, endTime, startTime);

  for (const row of venueBookingRows) {
    const booking = mapBookingRow(row as Parameters<typeof mapBookingRow>[0]);
    if (isTimeOverlap(startTime, endTime, booking.startTime, booking.endTime)) {
      conflicts.push({
        type: 'venue',
        id: booking.venueId,
        name: booking.venueName || '',
        startTime: booking.startTime,
        endTime: booking.endTime,
      });
    }
  }

  if (coachId) {
    const coachBookingRows = db
      .prepare(
        `SELECT b.*, c.name as coachName 
         FROM bookings b 
         JOIN coaches c ON b.coach_id = c.id 
         WHERE b.coach_id = ? AND b.date = ? ${excludeSql} ${BOOKING_STATUS_FILTER} ${TIME_OVERLAP_SQL}`
      )
      .all(coachId, date, ...excludeParams, endTime, startTime);

    for (const row of coachBookingRows) {
      const booking = mapBookingRow(row as Parameters<typeof mapBookingRow>[0]);
      if (isTimeOverlap(startTime, endTime, booking.startTime, booking.endTime)) {
        conflicts.push({
          type: 'coach',
          id: booking.coachId!,
          name: booking.coachName || '',
          startTime: booking.startTime,
          endTime: booking.endTime,
        });
      }
    }
  }

  const studentBookingRows = db
    .prepare(
      `SELECT b.*, s.name as studentName 
       FROM bookings b 
       JOIN students s ON b.student_id = s.id 
       WHERE b.student_id = ? AND b.date = ? ${excludeSql} ${BOOKING_STATUS_FILTER} ${TIME_OVERLAP_SQL}`
    )
    .all(studentId, date, ...excludeParams, endTime, startTime);

  for (const row of studentBookingRows) {
    const booking = mapBookingRow(row as Parameters<typeof mapBookingRow>[0]);
    if (isTimeOverlap(startTime, endTime, booking.startTime, booking.endTime)) {
      conflicts.push({
        type: 'student',
        id: booking.studentId,
        name: booking.studentName || '',
        startTime: booking.startTime,
        endTime: booking.endTime,
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

export function checkLessonConflict(
  coachId: number,
  venueId: number,
  date: string,
  startTime: string,
  endTime: string,
  excludeId?: number
): ConflictInfo {
  const conflicts: ConflictInfo['conflicts'] = [];

  const excludeSql = excludeId ? 'AND l.id != ?' : '';
  const excludeParams = excludeId ? [excludeId] : [];

  const venueLessonRows = db
    .prepare(
      `SELECT l.*, v.name as venueName 
       FROM lessons l 
       JOIN venues v ON l.venue_id = v.id 
       WHERE l.venue_id = ? AND l.date = ? ${excludeSql} ${LESSON_STATUS_FILTER} ${TIME_OVERLAP_SQL}`
    )
    .all(venueId, date, ...excludeParams, endTime, startTime);

  for (const row of venueLessonRows) {
    const lesson = mapLessonRow(row as Parameters<typeof mapLessonRow>[0]);
    if (isTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) {
      conflicts.push({
        type: 'venue',
        id: lesson.venueId,
        name: lesson.venueName || '',
        startTime: lesson.startTime,
        endTime: lesson.endTime,
      });
    }
  }

  const coachLessonRows = db
    .prepare(
      `SELECT l.*, c.name as coachName 
       FROM lessons l 
       JOIN coaches c ON l.coach_id = c.id 
       WHERE l.coach_id = ? AND l.date = ? ${excludeSql} ${LESSON_STATUS_FILTER} ${TIME_OVERLAP_SQL}`
    )
    .all(coachId, date, ...excludeParams, endTime, startTime);

  for (const row of coachLessonRows) {
    const lesson = mapLessonRow(row as Parameters<typeof mapLessonRow>[0]);
    if (isTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) {
      conflicts.push({
        type: 'coach',
        id: lesson.coachId,
        name: lesson.coachName || '',
        startTime: lesson.startTime,
        endTime: lesson.endTime,
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

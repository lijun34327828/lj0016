import db from '../db';
import dayjs from 'dayjs';
import { checkLessonConflict } from './conflictService';
import type { BatchScheduleRequest, Lesson } from '../../shared/types';

const MAX_POSTPONE_DAYS = 30;

function isWeekend(date: dayjs.Dayjs): boolean {
  const day = date.day();
  return day === 0 || day === 6;
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
}): Lesson {
  return {
    id: row.id,
    coachId: row.coach_id,
    venueId: row.venue_id,
    studentIds: JSON.parse(row.student_ids),
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    subject: row.subject,
    status: row.status as Lesson['status'],
    groupId: row.group_id,
  };
}

function findNextAvailableDate(
  startDate: dayjs.Dayjs,
  coachId: number,
  venueId: number,
  startTime: string,
  endTime: string,
  autoPostpone: boolean
): { date: string; postponed: number } | null {
  let currentDate = startDate;
  let postponed = 0;

  while (postponed < MAX_POSTPONE_DAYS) {
    const dateStr = currentDate.format('YYYY-MM-DD');

    if (autoPostpone && isWeekend(currentDate)) {
      currentDate = currentDate.add(1, 'day');
      postponed++;
      continue;
    }

    const conflict = checkLessonConflict(coachId, venueId, dateStr, startTime, endTime);

    if (!conflict.hasConflict) {
      return { date: dateStr, postponed };
    }

    if (!autoPostpone) {
      return null;
    }

    currentDate = currentDate.add(1, 'day');
    postponed++;
  }

  return null;
}

export function generateBatchSchedule(params: BatchScheduleRequest): {
  success: boolean;
  lessons: Lesson[];
  skipped: { date: string; reason: string }[];
  message?: string;
} {
  const {
    coachId,
    venueId,
    studentIds,
    startDate,
    endDate,
    daysOfWeek,
    startTime,
    endTime,
    subject,
    autoPostpone,
  } = params;

  const lessons: Lesson[] = [];
  const skipped: { date: string; reason: string }[] = [];

  const start = dayjs(startDate);
  const end = dayjs(endDate);

  if (start.isAfter(end)) {
    return {
      success: false,
      lessons: [],
      skipped: [],
      message: '开始日期不能晚于结束日期',
    };
  }

  if (daysOfWeek.length === 0) {
    return {
      success: false,
      lessons: [],
      skipped: [],
      message: '请选择至少一个星期几',
    };
  }

  const coach = db
    .prepare('SELECT * FROM coaches WHERE id = ?')
    .get(coachId) as { name: string } | undefined;

  const venue = db
    .prepare('SELECT * FROM venues WHERE id = ?')
    .get(venueId) as { name: string } | undefined;

  if (!coach) {
    return {
      success: false,
      lessons: [],
      skipped: [],
      message: '教练不存在',
    };
  }

  if (!venue) {
    return {
      success: false,
      lessons: [],
      skipped: [],
      message: '场地不存在',
    };
  }

  const students = db
    .prepare(`SELECT * FROM students WHERE id IN (${studentIds.map(() => '?').join(',')})`)
    .all(...studentIds) as { id: number; name: string }[];

  if (students.length !== studentIds.length) {
    return {
      success: false,
      lessons: [],
      skipped: [],
      message: '部分学员不存在',
    };
  }

  const studentNames = students.map((s) => s.name);

  const insertLesson = db.prepare(`
    INSERT INTO lessons (coach_id, venue_id, student_ids, date, start_time, end_time, subject, status, group_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
  `);

  const getMaxGroupId = db.prepare('SELECT COALESCE(MAX(group_id), 0) as maxGroupId FROM lessons');
  const groupIdResult = getMaxGroupId.get() as { maxGroupId: number };
  const newGroupId = groupIdResult.maxGroupId + 1;

  const tx = db.transaction(() => {
    let currentDate = start;

    while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
      const dayOfWeek = currentDate.day();

      if (daysOfWeek.includes(dayOfWeek)) {
        const dateStr = currentDate.format('YYYY-MM-DD');
        const result = findNextAvailableDate(
          currentDate,
          coachId,
          venueId,
          startTime,
          endTime,
          autoPostpone
        );

        if (result) {
          const info = insertLesson.run(
            coachId,
            venueId,
            JSON.stringify(studentIds),
            result.date,
            startTime,
            endTime,
            subject,
            newGroupId
          );

          const lessonId = info.lastInsertRowid as number;
          const lessonRow = db
            .prepare('SELECT * FROM lessons WHERE id = ?')
            .get(lessonId);
          const lesson = mapLessonRow(lessonRow as Parameters<typeof mapLessonRow>[0]);

          lessons.push({
            ...lesson,
            coachName: coach.name,
            venueName: venue.name,
            studentNames,
          });

          if (result.postponed > 0) {
            skipped.push({
              date: dateStr,
              reason: `已顺延 ${result.postponed} 天至 ${result.date}`,
            });
          }

          if (result.postponed > 0) {
            currentDate = dayjs(result.date);
          }
        } else {
          skipped.push({
            date: dateStr,
            reason: '存在冲突且无法顺延',
          });
        }
      }

      currentDate = currentDate.add(1, 'day');
    }
  });

  try {
    tx();
    return {
      success: true,
      lessons,
      skipped,
      message: `成功生成 ${lessons.length} 个课时${skipped.length > 0 ? `，${skipped.length} 个日期被跳过` : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      lessons: [],
      skipped: [],
      message: error instanceof Error ? error.message : '批量排课失败',
    };
  }
}

export function postponeLesson(
  lessonId: number,
  days: number
): {
  success: boolean;
  lesson?: Lesson;
  message?: string;
} {
  const lessonRow = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);

  if (!lessonRow) {
    return {
      success: false,
      message: '课时不存在',
    };
  }

  const lesson = mapLessonRow(lessonRow as Parameters<typeof mapLessonRow>[0]);

  if (lesson.status !== 'scheduled') {
    return {
      success: false,
      message: '只能顺延期的课时',
    };
  }

  if (days <= 0) {
    return {
      success: false,
      message: '顺延天数必须大于0',
    };
  }

  const currentDate = dayjs(lesson.date);
  let newDate = currentDate.add(days, 'day');
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    const dateStr = newDate.format('YYYY-MM-DD');
    const conflict = checkLessonConflict(
      lesson.coachId,
      lesson.venueId,
      dateStr,
      lesson.startTime,
      lesson.endTime,
      lessonId
    );

    if (!conflict.hasConflict) {
      const updateStmt = db.prepare('UPDATE lessons SET date = ? WHERE id = ?');
      updateStmt.run(dateStr, lessonId);

      const updatedLessonRow = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
      const updatedLesson = mapLessonRow(updatedLessonRow as Parameters<typeof mapLessonRow>[0]);

      const coach = db
        .prepare('SELECT name FROM coaches WHERE id = ?')
        .get(lesson.coachId) as { name: string } | undefined;

      const venue = db
        .prepare('SELECT name FROM venues WHERE id = ?')
        .get(lesson.venueId) as { name: string } | undefined;

      const students = db
        .prepare(
          `SELECT name FROM students WHERE id IN (${lesson.studentIds.map(() => '?').join(',')})`
        )
        .all(...lesson.studentIds) as { name: string }[];

      return {
        success: true,
        lesson: {
          ...updatedLesson,
          coachName: coach?.name,
          venueName: venue?.name,
          studentNames: students.map((s) => s.name),
        },
        message: `已将课时顺延至 ${dateStr}`,
      };
    }

    newDate = newDate.add(1, 'day');
    attempts++;
  }

  return {
    success: false,
    message: '顺延失败，在尝试的30天内均存在冲突',
  };
}

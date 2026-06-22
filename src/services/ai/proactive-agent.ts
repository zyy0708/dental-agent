import { query } from '@/lib/db';

export interface Reminder {
  id: number;
  user_id: number;
  reminder_type: string;
  title: string;
  content: string;
  scheduled_at: Date;
  sent_at: Date | null;
  status: string;
  metadata: any;
  created_at: Date;
}

export interface BookingProgress {
  id: number;
  user_id: number;
  session_id: string;
  step: string;
  data: any;
  created_at: Date;
  updated_at: Date;
}

export async function createAppointmentReminders(
  userId: number,
  appointmentId: string,
  appointmentTime: string,
  patientName: string,
  hospitalName: string
): Promise<void> {
  try {
    const aptDate = parseAppointmentTime(appointmentTime);
    if (!aptDate) {
      console.log('[PROACTIVE] Could not parse appointment time:', appointmentTime);
      return;
    }

    const oneDayBefore = new Date(aptDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(10, 0, 0, 0);

    if (oneDayBefore > new Date()) {
      await query(
        `INSERT INTO reminders (user_id, reminder_type, title, content, scheduled_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          'appointment_1day',
          '预约提醒',
          `您明天（${formatDate(aptDate)}）有一个预约：\n\n患者：${patientName}\n医院：${hospitalName}\n时间：${appointmentTime}\n\n请提前准备好相关资料，准时到达。`,
          oneDayBefore,
          JSON.stringify({ appointment_id: appointmentId, type: '1day' })
        ]
      );
      console.log('[PROACTIVE] Created 1-day reminder for appointment:', appointmentId);
    }

    const twoHoursBefore = new Date(aptDate);
    twoHoursBefore.setHours(twoHoursBefore.getHours() - 2);

    if (twoHoursBefore > new Date()) {
      await query(
        `INSERT INTO reminders (user_id, reminder_type, title, content, scheduled_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          'appointment_2hours',
          '就诊提醒',
          `您还有 2 小时就到预约时间了！\n\n患者：${patientName}\n医院：${hospitalName}\n时间：${appointmentTime}\n\n请准备出发，祝您就诊顺利！`,
          twoHoursBefore,
          JSON.stringify({ appointment_id: appointmentId, type: '2hours' })
        ]
      );
      console.log('[PROACTIVE] Created 2-hour reminder for appointment:', appointmentId);
    }
  } catch (error) {
    console.error('[PROACTIVE] Failed to create appointment reminders:', error);
  }
}

export async function createCheckupReminder(
  userId: number,
  serviceType: string,
  lastAppointmentDate: Date
): Promise<void> {
  try {
    let intervalMonths = 6;
    if (serviceType.includes('洗牙')) intervalMonths = 6;
    else if (serviceType.includes('检查')) intervalMonths = 12;
    else if (serviceType.includes('治疗') || serviceType.includes('根管')) intervalMonths = 3;
    else if (serviceType.includes('矫正')) intervalMonths = 1;

    const nextCheckup = new Date(lastAppointmentDate);
    nextCheckup.setMonth(nextCheckup.getMonth() + intervalMonths);
    nextCheckup.setHours(10, 0, 0, 0);

    if (nextCheckup > new Date()) {
      await query(
        `INSERT INTO reminders (user_id, reminder_type, title, content, scheduled_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [
          userId,
          'checkup',
          '复查提醒',
          `距离您上次的${serviceType}已经过去 ${intervalMonths} 个月了，建议您进行复查。如有需要，请随时联系我们预约。`,
          nextCheckup,
          JSON.stringify({ service_type: serviceType, interval_months: intervalMonths })
        ]
      );
      console.log('[PROACTIVE] Created checkup reminder:', serviceType, 'interval:', intervalMonths, 'months');
    }
  } catch (error) {
    console.error('[PROACTIVE] Failed to create checkup reminder:', error);
  }
}

export async function trackBookingProgress(
  userId: number,
  sessionId: string,
  step: string,
  data?: any
): Promise<void> {
  try {
    await query(
      `INSERT INTO booking_progress (user_id, session_id, step, data, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, session_id) 
       DO UPDATE SET step = $3, data = $4, updated_at = NOW()`,
      [userId, sessionId, step, data ? JSON.stringify(data) : null]
    );
  } catch (error) {
    try {
      const existing = await query(
        'SELECT id FROM booking_progress WHERE user_id = $1 AND session_id = $2',
        [userId, sessionId]
      );
      
      if (existing.rows.length > 0) {
        await query(
          'UPDATE booking_progress SET step = $1, data = $2, updated_at = NOW() WHERE user_id = $3 AND session_id = $4',
          [step, data ? JSON.stringify(data) : null, userId, sessionId]
        );
      } else {
        await query(
          'INSERT INTO booking_progress (user_id, session_id, step, data) VALUES ($1, $2, $3, $4)',
          [userId, sessionId, step, data ? JSON.stringify(data) : null]
        );
      }
    } catch (e) {
      console.error('[PROACTIVE] Failed to track booking progress:', e);
    }
  }
}

export async function detectAbandonedBookings(): Promise<Array<{
  user_id: number;
  session_id: string;
  last_step: string;
  data: any;
  last_activity: Date;
}>> {
  try {
    const result = await query(
      `SELECT user_id, session_id, step as last_step, data, updated_at as last_activity
       FROM booking_progress
       WHERE step != 'completed'
       AND updated_at < NOW() - INTERVAL '4 hours'
       AND updated_at > NOW() - INTERVAL '7 days'
       AND NOT EXISTS (
         SELECT 1 FROM reminders r
         WHERE r.user_id = booking_progress.user_id
         AND r.reminder_type = 'abandoned_followup'
         AND r.metadata->>'session_id' = booking_progress.session_id
       )
       ORDER BY updated_at DESC
       LIMIT 10`
    );
    return result.rows;
  } catch (error) {
    console.error('[PROACTIVE] Failed to detect abandoned bookings:', error);
    return [];
  }
}

export async function createAbandonedBookingReminder(
  userId: number,
  sessionId: string,
  lastStep: string,
  data: any
): Promise<void> {
  try {
    let content = '';
    const stepMessages: Record<string, string> = {
      'city_selected': '您之前选择了城市，还需要选择医院并填写预约信息。',
      'hospital_selected': '您已经选好了医院，还需要填写姓名、手机号和就诊时间来完成预约。',
      'name_collected': '我们已经记录了您的姓名，还需要手机号和就诊时间来完成预约。',
      'phone_collected': '我们已经记录了您的联系方式，还需要就诊时间来完成预约。',
    };

    content = stepMessages[lastStep] || '您的预约还未完成，如需帮助请随时联系我们。';

    await query(
      `INSERT INTO reminders (user_id, reminder_type, title, content, scheduled_at, metadata)
       VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [
        userId,
        'abandoned_followup',
        '预约未完成提醒',
        content,
        JSON.stringify({ session_id: sessionId, last_step: lastStep, data })
      ]
    );
    console.log('[PROACTIVE] Created abandoned booking reminder for user:', userId);
  } catch (error) {
    console.error('[PROACTIVE] Failed to create abandoned booking reminder:', error);
  }
}

export async function getPendingReminders(): Promise<Reminder[]> {
  try {
    const result = await query(
      `SELECT r.*, u.username, u.nickname
       FROM reminders r
       JOIN users u ON r.user_id = u.id
       WHERE r.status = 'pending'
       AND r.scheduled_at <= NOW()
       ORDER BY r.scheduled_at ASC
       LIMIT 50`
    );
    return result.rows;
  } catch (error) {
    console.error('[PROACTIVE] Failed to get pending reminders:', error);
    return [];
  }
}

export async function markReminderSent(reminderId: number): Promise<void> {
  try {
    await query(
      'UPDATE reminders SET status = $1, sent_at = NOW() WHERE id = $2',
      ['sent', reminderId]
    );
  } catch (error) {
    console.error('[PROACTIVE] Failed to mark reminder sent:', error);
  }
}

export async function markReminderFailed(reminderId: number): Promise<void> {
  try {
    await query(
      'UPDATE reminders SET status = $1 WHERE id = $2',
      ['failed', reminderId]
    );
  } catch (error) {
    console.error('[PROACTIVE] Failed to mark reminder failed:', error);
  }
}

export async function getUserPreferences(userId: number): Promise<{
  appointment_reminders: boolean;
  checkup_reminders: boolean;
  followup_reminders: boolean;
  reminder_days_before: number;
  checkup_interval_months: number;
}> {
  try {
    const result = await query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    await query(
      'INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [userId]
    );
    
    return {
      appointment_reminders: true,
      checkup_reminders: true,
      followup_reminders: true,
      reminder_days_before: 1,
      checkup_interval_months: 6,
    };
  } catch (error) {
    console.error('[PROACTIVE] Failed to get user preferences:', error);
    return {
      appointment_reminders: true,
      checkup_reminders: true,
      followup_reminders: true,
      reminder_days_before: 1,
      checkup_interval_months: 6,
    };
  }
}

function parseAppointmentTime(timeStr: string): Date | null {
  try {
    const now = new Date();
    
    const tomorrowMatch = timeStr.match(/明天|明日/);
    const todayMatch = timeStr.match(/今天|今日/);
    
    let targetDate = new Date(now);
    
    if (tomorrowMatch) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (todayMatch) {
    } else {
      const dateMatch = timeStr.match(/(\d{1,2})[月\-/](\d{1,2})[日号]?/);
      if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1;
        const day = parseInt(dateMatch[2]);
        targetDate.setMonth(month, day);
        if (targetDate < now) {
          targetDate.setFullYear(targetDate.getFullYear() + 1);
        }
      }
    }
    
    const timeMatch = timeStr.match(/(\d{1,2})[点时:：](\d{0,2})/);
    if (timeMatch) {
      targetDate.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]) || 0, 0, 0);
    } else {
      targetDate.setHours(10, 0, 0, 0);
    }
    
    return targetDate;
  } catch (error) {
    console.error('[PROACTIVE] Failed to parse appointment time:', timeStr, error);
    return null;
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
}

export async function cleanupOldReminders(): Promise<void> {
  try {
    await query(
      `DELETE FROM reminders 
       WHERE status IN ('sent', 'failed', 'cancelled')
       AND created_at < NOW() - INTERVAL '30 days'`
    );
    console.log('[PROACTIVE] Cleaned up old reminders');
  } catch (error) {
    console.error('[PROACTIVE] Failed to cleanup old reminders:', error);
  }
}

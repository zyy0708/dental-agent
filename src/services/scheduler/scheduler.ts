import { query } from '@/lib/db';
import {
  getPendingReminders,
  markReminderSent,
  markReminderFailed,
  detectAbandonedBookings,
  createAbandonedBookingReminder,
  cleanupOldReminders,
} from '@/services/ai/proactive-agent';

let schedulerInterval: NodeJS.Timeout | null = null;

export function startScheduler(): void {
  if (schedulerInterval) {
    console.log('[SCHEDULER] Already running');
    return;
  }

  console.log('[SCHEDULER] Starting proactive agent scheduler...');
  
  schedulerInterval = setInterval(async () => {
    await processReminders();
    await processAbandonedBookings();
  }, 5 * 60 * 1000);

  setInterval(async () => {
    await cleanupOldReminders();
  }, 24 * 60 * 60 * 1000);

  processReminders();
  processAbandonedBookings();
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[SCHEDULER] Stopped');
  }
}

async function processReminders(): Promise<void> {
  try {
    const pendingReminders = await getPendingReminders();
    console.log(`[SCHEDULER] Processing ${pendingReminders.length} pending reminders`);

    for (const reminder of pendingReminders) {
      try {
        await query(
          `INSERT INTO chat_history (user_id, role, content, session_id, agent_metadata)
           VALUES ($1, 'assistant', $2, $3, $4)`,
          [
            reminder.user_id,
            `[系统提醒] ${reminder.title}\n\n${reminder.content}`,
            `reminder_${reminder.id}`,
            JSON.stringify({
              is_system_reminder: true,
              reminder_type: reminder.reminder_type,
              reminder_id: reminder.id,
            })
          ]
        );

        await markReminderSent(reminder.id);
        console.log(`[SCHEDULER] Sent reminder ${reminder.id} to user ${reminder.user_id}`);
      } catch (error) {
        console.error(`[SCHEDULER] Failed to send reminder ${reminder.id}:`, error);
        await markReminderFailed(reminder.id);
      }
    }
  } catch (error) {
    console.error('[SCHEDULER] Failed to process reminders:', error);
  }
}

async function processAbandonedBookings(): Promise<void> {
  try {
    const abandonedBookings = await detectAbandonedBookings();
    console.log(`[SCHEDULER] Found ${abandonedBookings.length} abandoned bookings`);

    for (const booking of abandonedBookings) {
      try {
        await createAbandonedBookingReminder(
          booking.user_id,
          booking.session_id,
          booking.last_step,
          booking.data
        );
      } catch (error) {
        console.error(`[SCHEDULER] Failed to create reminder for abandoned booking:`, error);
      }
    }
  } catch (error) {
    console.error('[SCHEDULER] Failed to process abandoned bookings:', error);
  }
}

export async function triggerReminderCheck(): Promise<{ processed: number }> {
  const pendingReminders = await getPendingReminders();
  await processReminders();
  return { processed: pendingReminders.length };
}

export async function triggerAbandonedCheck(): Promise<{ found: number }> {
  const abandoned = await detectAbandonedBookings();
  await processAbandonedBookings();
  return { found: abandoned.length };
}

import cron from 'node-cron'
import { config } from '../config.js'
import { processGameReminders } from './turn-reminder.js'

export const startScheduler = (): void => {
  const { cronSchedule } = config.reminder

  cron.schedule(cronSchedule, async () => {
    console.log(`[scheduler] Running turn reminders at ${new Date().toISOString()}`)
    try {
      await processGameReminders()
    } catch (err) {
      console.error('[scheduler] Error processing reminders:', err)
    }
  })

  console.log(`[scheduler] Started with schedule: ${cronSchedule}`)
}

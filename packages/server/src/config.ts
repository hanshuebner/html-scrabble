export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000/',
  databaseUrl: process.env.DATABASE_URL || 'postgres://localhost:5432/scrabble',
  reminder: {
    cronSchedule: process.env.REMINDER_CRON || '0 9 * * *',
    reminderAfterDays: parseInt(process.env.REMINDER_AFTER_DAYS || '2', 10),
    timeoutAfterDays: parseInt(process.env.TIMEOUT_AFTER_DAYS || '14', 10),
  },
  mail: {
    sender: process.env.MAIL_SENDER || 'scrabble@localhost',
    smtp: process.env.SMTP_HOST
      ? {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
          },
        }
      : null,
  },
}

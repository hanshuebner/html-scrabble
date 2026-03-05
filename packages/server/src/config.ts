export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000/',
  databaseUrl: process.env.DATABASE_URL || 'postgres://localhost:5432/scrabble',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  magicLinkExpiry: 15 * 60, // 15 minutes in seconds
  sessionExpiry: 30 * 24 * 60 * 60, // 30 days in seconds
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

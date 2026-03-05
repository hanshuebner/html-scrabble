import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { config } from '../config.js'

let transporter: Transporter | null = null

if (config.mail.smtp) {
  transporter = nodemailer.createTransport(config.mail.smtp)
}

const joinProse = (array: string[]): string => {
  const length = array.length
  if (length === 0) return ''
  if (length === 1) return array[0]
  return array.slice(0, -1).join(', ') + ' and ' + array[length - 1]
}

export const sendEmail = async (to: string, subject: string, text: string, html: string): Promise<void> => {
  if (!transporter) {
    console.log(`[email] No transport configured. Would send to ${to}: ${subject}`)
    return
  }

  try {
    const result = await transporter.sendMail({
      from: config.mail.sender,
      to,
      subject,
      text,
      html,
    })
    console.log(`[email] Sent to ${to}: ${result.response}`)
  } catch (e) {
    console.error('[email] Failed to send:', e)
  }
}

export const sendGameInvitation = async (
  playerEmail: string,
  playerName: string,
  gameLink: string,
  otherPlayerNames: string[],
): Promise<void> => {
  const subject = `You have been invited to play Scrabble with ${joinProse(otherPlayerNames)}`
  const text = `Make your move:\n\n${gameLink}`
  const html = `Click <a href="${gameLink}">here</a> to make your move.`
  await sendEmail(playerEmail, subject, text, html)
}

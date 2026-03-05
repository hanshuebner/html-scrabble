import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useGameState } from '../hooks/useGameState.js'
import { sendMessage } from '../../api/socket.js'

export const ChatPanel = () => {
  const { t } = useTranslation()
  const chatMessages = useGameState((s) => s.chatMessages)
  const gameKey = useGameState((s) => s.gameKey)
  const players = useGameState((s) => s.players)
  const playerIndex = useGameState((s) => s.playerIndex)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages.length])

  const handleSend = () => {
    if (!input.trim() || !gameKey || playerIndex === null) return
    const name = players[playerIndex]?.name || 'Anonymous'
    sendMessage(gameKey, name, input.trim())
    setInput('')
  }

  return (
    <div className="bg-[#F7F7E3] border border-[#DCDCC6] rounded-md p-3">
      <h3 className="font-bold text-sm text-[#474633] mb-2">{t('Chat')}</h3>
      <div ref={scrollRef} className="h-24 overflow-auto text-xs space-y-1 mb-2">
        {chatMessages.length === 0 && <div className="text-[#AAA38E] italic">{t('No messages')}</div>}
        {chatMessages.map((msg, i) => (
          <div key={i}>
            <span className="font-medium">{msg.playerName}:</span> {msg.message}
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t('Type a message...')}
          className="flex-1 text-xs px-2 py-1 border border-[#DCDCC6] rounded bg-white"
        />
        <button onClick={handleSend} className="text-xs px-2 py-1 bg-[#474633] text-white rounded hover:bg-[#626258]">
          {t('Send')}
        </button>
      </div>
    </div>
  )
}

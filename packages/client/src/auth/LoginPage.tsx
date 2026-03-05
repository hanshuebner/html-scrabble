import { useState } from 'react'
import { useAuth } from './AuthContext.js'

export const LoginPage = () => {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email)
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-woodgrain flex items-center justify-center p-4">
        <div className="bg-[#F7F7E3] rounded-lg p-8 max-w-sm w-full shadow-lg text-center">
          <h2 className="text-xl font-bold text-[#474633] mb-4">Check your email</h2>
          <p className="text-sm text-[#626258]">
            We sent a login link to <strong>{email}</strong>. Click the link to sign in.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-woodgrain flex items-center justify-center p-4">
      <div className="bg-[#F7F7E3] rounded-lg p-8 max-w-sm w-full shadow-lg">
        <h1 className="text-2xl font-bold text-[#474633] mb-6 text-center">Scrabble</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#474633] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[#DCDCC6] rounded bg-white text-sm"
              placeholder="you@example.com"
            />
          </div>
          {error && <div className="text-red-600 text-xs">{error}</div>}
          <button
            type="submit"
            className="w-full py-2 bg-[#474633] text-white rounded hover:bg-[#626258] text-sm font-medium"
          >
            Send Login Link
          </button>
        </form>
        <p className="text-xs text-[#AAA38E] mt-4 text-center">No password needed. We'll send you a magic link.</p>
      </div>
    </div>
  )
}

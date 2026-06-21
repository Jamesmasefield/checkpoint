import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    const { error } = await signInWithMagicLink(email)

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    setStatus('sent')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f6fa]">
      <div className="w-full max-w-sm rounded-lg border border-[#e5e7eb] bg-white p-8 shadow-sm">
        <h1 className="text-lg font-medium text-slate-900">Checkpoint</h1>
        <p className="mt-1 text-sm text-slate-500">St Edwards College — sign in with your school email</p>

        {status === 'sent' ? (
          <p className="mt-6 text-sm text-slate-700">
            Check <span className="font-medium">{email}</span> for a magic link to sign in.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@stedwards.nsw.edu.au"
              className="w-full rounded-md border border-[#e5e7eb] px-3 py-2 text-sm outline-none focus:border-[#4f6ef7]"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {status === 'error' && <p className="text-sm text-red-500">{errorMessage}</p>}
          </form>
        )}
      </div>
    </div>
  )
}

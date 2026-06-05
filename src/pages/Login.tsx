import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import Logo from '../components/Logo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [magic, setMagic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      if (magic) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin }
        })
        if (error) throw error
        setInfo('Check your email for a magic sign-in link.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-500 to-brand-700 dark:from-zinc-900 dark:to-zinc-950 px-6 py-10 transition-all duration-300">
      <div className="mb-8 flex flex-col items-center text-white">
        <Logo size={90} className="drop-shadow-lg" />
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white dark:text-zinc-100">Lekha-Jokha</h1>
        <p className="mt-1 text-xs text-brand-100 text-center uppercase tracking-wider font-semibold">Account for every penny, settle with ease.</p>
      </div>

      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <h2 className="text-xl font-bold text-ink dark:text-zinc-100">Welcome back</h2>

        {!isSupabaseConfigured && (
          <p className="rounded-lg bg-orange-50 dark:bg-orange-950/20 p-3 text-sm text-owe">
            Supabase isn't configured. Create a <code>.env</code> file from{' '}
            <code>.env.example</code> and restart.
          </p>
        )}

        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {!magic && (
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        )}

        {error && <p className="text-sm font-medium text-owe">{error}</p>}
        {info && <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{info}</p>}

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Please wait…' : magic ? 'Send magic link' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMagic((m) => !m)
            setError(null)
            setInfo(null)
          }}
          className="w-full text-center text-sm font-semibold text-brand-600 dark:text-brand-400"
        >
          {magic ? 'Use email & password instead' : 'Email me a magic link instead'}
        </button>

        <p className="border-t border-gray-100 dark:border-zinc-800 pt-3 text-center text-xs text-muted dark:text-zinc-400">
          Accounts are created by your administrator in Supabase Auth.
        </p>
      </form>
    </div>
  )
}

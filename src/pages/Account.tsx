import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { updateProfile } from '../lib/api'
import { Avatar } from '../components/ui'
import { LogoutIcon } from '../components/icons'
import { uploadFile } from '../lib/supabase'

export default function Account() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [upiId, setUpiId] = useState(profile?.upi_id ?? '')
  const [dob, setDob] = useState(profile?.dob ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Keep state in sync with profile if it loads later
  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? '')
      setUpiId(profile.upi_id ?? '')
      setDob(profile.dob ?? '')
    }
  }, [profile])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaved(false)
    try {
      await updateProfile(user.id, { 
        full_name: name.trim(), 
        upi_id: upiId.trim(), 
        dob: dob || null 
      })
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`
      const url = await uploadFile('avatars', path, file)
      await updateProfile(user.id, { avatar_url: url })
      await refreshProfile()
    } catch (err) {
      console.error(err)
      alert('Failed to upload avatar picture')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const installed = window.matchMedia('(display-mode: standalone)').matches

  return (
    <div>
      <header className="safe-top bg-gradient-to-b from-brand-500 to-brand-600 dark:from-zinc-900 dark:to-zinc-950 px-5 pb-10 pt-8 text-center text-white transition-all duration-300">
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar profile={profile} size={84} />
            <label className="absolute bottom-0 right-0 p-1.5 bg-brand-500 dark:bg-zinc-850 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm cursor-pointer hover:bg-brand-600 dark:hover:bg-zinc-700 transition active:scale-95">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
            </label>
          </div>
          {uploadingAvatar && <p className="text-xs mt-2 text-brand-100 animate-pulse">Uploading photo...</p>}
        </div>
        <h1 className="mt-3 text-xl font-extrabold text-white dark:text-zinc-100">{profile?.full_name || 'Your account'}</h1>
        <p className="text-sm text-brand-50 dark:text-zinc-400">{profile?.email}</p>
      </header>

      <div className="-mt-5 space-y-5 rounded-t-3xl bg-[#f4f6f8] dark:bg-zinc-950 px-5 pt-6 pb-24 transition-colors duration-300">
        <form onSubmit={handleSave} className="card space-y-4 p-5">
          <h2 className="font-bold text-ink dark:text-zinc-100">Profile Settings</h2>
          <div>
            <label className="label">Display name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-gray-50 dark:bg-zinc-950 text-muted dark:text-zinc-500" value={profile?.email ?? ''} disabled />
          </div>
          <div>
            <label className="label">Date of birth</label>
            <input type="date" className="input" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div>
            <label className="label">UPI ID (for payments)</label>
            <input className="input" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="e.g. yourname@upi" />
            <p className="mt-1 text-[11px] text-muted dark:text-zinc-500">This will be used to generate payment QR codes for group members.</p>
          </div>
          <button className="btn-primary w-full shadow-sm" disabled={saving || uploadingAvatar}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
          </button>
        </form>

        {/* Theme Settings Card */}
        <div className="card p-5 space-y-3">
          <h2 className="font-bold text-ink dark:text-zinc-100">App Theme</h2>
          <p className="text-xs text-muted dark:text-zinc-400">Choose your preferred visual style for Lekha-Jokha.</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border transition active:scale-[0.98] ${
                theme === 'light'
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-ink dark:text-zinc-300 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border transition active:scale-[0.98] ${
                theme === 'dark'
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-ink dark:text-zinc-300 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              Dark
            </button>
          </div>
        </div>

        {!installed && (
          <div className="card p-5">
            <h2 className="font-bold text-ink dark:text-zinc-100">Install the app</h2>
            <p className="mt-1 text-sm text-muted dark:text-zinc-400">
              Add Lekha-Jokha to your home screen for a native-like experience.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted dark:text-zinc-400">
              <li>
                <span className="font-semibold text-ink dark:text-zinc-200">iPhone/iPad:</span> Share → “Add to Home Screen”.
              </li>
              <li>
                <span className="font-semibold text-ink dark:text-zinc-200">Android/Chrome:</span> menu ⋮ → “Install app”.
              </li>
              <li>
                <span className="font-semibold text-ink dark:text-zinc-200">Desktop:</span> install icon in the address bar.
              </li>
            </ul>
          </div>
        )}

        <button onClick={signOut} className="btn bg-white dark:bg-zinc-900 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/15 w-full transition shadow-sm">
          <LogoutIcon width={18} height={18} /> Sign out
        </button>

        <p className="text-center text-xs text-muted dark:text-zinc-500">Lekha-Jokha · v1.0.0</p>
      </div>
    </div>
  )
}

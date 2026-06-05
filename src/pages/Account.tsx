import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfile } from '../lib/api'
import { Avatar } from '../components/ui'
import { LogoutIcon } from '../components/icons'

export default function Account() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [upiId, setUpiId] = useState(profile?.upi_id ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaved(false)
    try {
      await updateProfile(user.id, { full_name: name.trim(), upi_id: upiId.trim() })
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const installed = window.matchMedia('(display-mode: standalone)').matches

  return (
    <div>
      <header className="safe-top bg-gradient-to-b from-brand-500 to-brand-600 px-5 pb-10 pt-8 text-center text-white">
        <div className="mx-auto w-fit">
          <Avatar profile={profile} size={84} />
        </div>
        <h1 className="mt-3 text-xl font-extrabold">{profile?.full_name || 'Your account'}</h1>
        <p className="text-sm text-brand-50">{profile?.email}</p>
      </header>

      <div className="-mt-5 space-y-5 rounded-t-3xl bg-[#f4f6f8] px-5 pt-6">
        <form onSubmit={handleSave} className="card space-y-4 p-5">
          <h2 className="font-bold text-ink">Profile Settings</h2>
          <div>
            <label className="label">Display name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-gray-50 text-muted" value={profile?.email ?? ''} disabled />
          </div>
          <div>
            <label className="label">UPI ID (for payments)</label>
            <input className="input" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="e.g. yourname@upi" />
            <p className="mt-1 text-[11px] text-muted">This will be used to generate payment QR codes for group members.</p>
          </div>
          <button className="btn-primary w-full shadow-sm" disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
          </button>
        </form>

        {!installed && (
          <div className="card p-5">
            <h2 className="font-bold text-ink">Install the app</h2>
            <p className="mt-1 text-sm text-muted">
              Add Lekha-Jokha to your home screen for a native-like experience.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              <li>
                <span className="font-semibold text-ink">iPhone/iPad:</span> Share → “Add to Home Screen”.
              </li>
              <li>
                <span className="font-semibold text-ink">Android/Chrome:</span> menu ⋮ → “Install app”.
              </li>
              <li>
                <span className="font-semibold text-ink">Desktop:</span> install icon in the address bar.
              </li>
            </ul>
          </div>
        )}

        <button onClick={signOut} className="btn-ghost w-full text-owe border border-rose-100 hover:bg-rose-50/30 transition">
          <LogoutIcon width={18} height={18} /> Sign out
        </button>

        <p className="pb-6 text-center text-xs text-muted">Lekha-Jokha · v1.0.0</p>
      </div>
    </div>
  )
}

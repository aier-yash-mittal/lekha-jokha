import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createGroup, getMyGroups } from '../lib/api'
import type { Group } from '../lib/types'
import { EmptyState, Modal, Spinner } from '../components/ui'
import { ChevronRight, GroupIcon, PlusIcon } from '../components/icons'

const EMOJIS = ['🧾', '🏠', '✈️', '🍕', '🎉', '🚗', '🏖️', '🛒', '💡', '🎬']

export default function Groups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  // create form
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🧾')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!user) return
    setLoading(true)
    try {
      setGroups(await getMyGroups(user.id))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      await createGroup({ name: name.trim(), description: desc.trim() || undefined, emoji, createdBy: user.id })
      setOpen(false)
      setName('')
      setDesc('')
      setEmoji('🧾')
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create group.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <header className="safe-top flex items-center justify-between bg-white dark:bg-zinc-900 border-b border-transparent dark:border-zinc-800/60 px-5 pb-4 pt-6 shadow-card dark:shadow-none transition-colors duration-300">
        <h1 className="text-2xl font-extrabold text-ink dark:text-zinc-100">Groups</h1>
        <button onClick={() => setOpen(true)} className="btn-primary px-3 py-2">
          <PlusIcon width={18} height={18} /> New
        </button>
      </header>

      <div className="px-5 pt-4">
        {loading ? (
          <Spinner className="py-16" />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<GroupIcon width={56} height={56} />}
            title="No groups yet"
            subtitle="Create your first group to split expenses."
            action={
              <button onClick={() => setOpen(true)} className="btn-primary">
                <PlusIcon width={18} height={18} /> Create a group
              </button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {groups.map((g) => (
              <li key={g.id}>
                <Link to={`/groups/${g.id}`} className="card flex items-center gap-3 p-4 active:scale-[0.99]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-zinc-800/80 text-2xl">
                    {g.emoji ?? '🧾'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink dark:text-zinc-100">{g.name}</p>
                    {g.description && <p className="truncate text-xs text-muted dark:text-zinc-400">{g.description}</p>}
                  </div>
                  <ChevronRight width={18} height={18} className="text-gray-300 dark:text-zinc-600" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create a group">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Group name</label>
            <input
              className="input"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Goa Trip, Apartment 4B…"
            />
          </div>
          <div>
            <label className="label">Pick an icon</label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((em) => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setEmoji(em)}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition ${
                    emoji === em ? 'bg-brand-100 dark:bg-brand-950/20 ring-2 ring-brand-500' : 'bg-gray-100 dark:bg-zinc-800'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <input
              className="input"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What's this group for?"
            />
          </div>
          {error && <p className="text-sm font-medium text-owe">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">
              Cancel
            </button>
            <button className="btn-primary flex-1" disabled={saving || !name.trim()}>
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

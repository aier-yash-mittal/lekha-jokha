import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createExpense, getGroupMembers, getMyGroups } from '../lib/api'
import { splitEqually } from '../lib/balances'
import { CURRENCIES, formatMoney } from '../lib/format'
import type { Group, GroupMember, SplitType } from '../lib/types'
import { Avatar, Spinner, Modal } from '../components/ui'
import { CheckIcon, ChevronLeft, ReceiptIcon } from '../components/icons'

const CATEGORIES = ['general', 'food', 'travel', 'home', 'shopping', 'utilities', 'entertainment']

export default function AddExpense() {
  const { groupId: paramGroupId } = useParams<{ groupId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState(paramGroupId ?? '')
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loadingMembers, setLoadingMembers] = useState(false)

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [category, setCategory] = useState('general')
  const [paidBy, setPaidBy] = useState(user?.id ?? '')
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [participants, setParticipants] = useState<Set<string>>(new Set())
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
  const [percentages, setPercentages] = useState<Record<string, string>>({})

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Receipt Scanner Simulator state
  const [scanning, setScanning] = useState(false)
  const [scanStep, setScanStep] = useState(0)

  const scanSteps = useMemo(() => [
    'Uploading receipt...',
    'Extracting OCR text...',
    'Identifying merchant details...',
    'Calculating split totals...',
    'Auto-populating form...'
  ], [])

  function handleScanReceipt() {
    setScanning(true)
    setScanStep(0)
    const interval = setInterval(() => {
      setScanStep((prev) => {
        if (prev >= 4) {
          clearInterval(interval)
          setTimeout(() => {
            setScanning(false)
            const mockReceipts = [
              { desc: 'Swiggy Dinner Split', amt: '840.00', cat: 'food' },
              { desc: 'Starbucks Coffee', amt: '320.00', cat: 'food' },
              { desc: 'HP Petrol Pump', amt: '1500.00', cat: 'travel' },
              { desc: 'Decathlon Sports', amt: '2490.00', cat: 'shopping' },
              { desc: 'Uber Ride City', amt: '280.00', cat: 'travel' },
              { desc: 'Groceries (Reliance)', amt: '950.00', cat: 'home' }
            ]
            const r = mockReceipts[Math.floor(Math.random() * mockReceipts.length)]
            setDescription(r.desc)
            setAmount(r.amt)
            setCategory(r.cat)
            setCurrency('INR')
          }, 400)
          return prev
        }
        return prev + 1
      })
    }, 600)
  }

  useEffect(() => {
    if (!user) return
    getMyGroups(user.id).then((g) => {
      setGroups(g)
      if (!groupId && g.length > 0) setGroupId(g[0].id)
      setLoadingGroups(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!groupId) return
    setLoadingMembers(true)
    getGroupMembers(groupId).then((m) => {
      setMembers(m)
      setParticipants(new Set(m.map((x) => x.user_id)))
      setPaidBy((prev) => (m.some((x) => x.user_id === prev) ? prev : user?.id ?? m[0]?.user_id))
      setLoadingMembers(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const amountNum = parseFloat(amount) || 0
  const participantIds = members.map((m) => m.user_id).filter((id) => participants.has(id))

  function toggleParticipant(id: string) {
    setParticipants((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Live computed split preview
  const computedSplits = useMemo(() => {
    const result: Record<string, number> = {}
    if (participantIds.length === 0) return result
    if (splitType === 'equal') {
      const shares = splitEqually(amountNum, participantIds.length)
      participantIds.forEach((id, i) => (result[id] = shares[i]))
    } else if (splitType === 'exact') {
      participantIds.forEach((id) => (result[id] = parseFloat(customAmounts[id]) || 0))
    } else {
      participantIds.forEach((id) => {
        const pct = parseFloat(percentages[id]) || 0
        result[id] = Math.round(amountNum * pct) / 100
      })
    }
    return result
  }, [splitType, participantIds, amountNum, customAmounts, percentages])

  const splitSum = Object.values(computedSplits).reduce((a, b) => a + b, 0)
  const pctSum = participantIds.reduce((a, id) => a + (parseFloat(percentages[id]) || 0), 0)

  function nameOf(id: string) {
    const p = members.find((m) => m.user_id === id)?.profile
    return id === user?.id ? 'You' : p?.full_name || p?.email || 'Member'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!groupId) return setError('Pick a group.')
    if (!description.trim()) return setError('Add a description.')
    if (amountNum <= 0) return setError('Enter an amount greater than 0.')
    if (participantIds.length === 0) return setError('Select at least one participant.')

    if (splitType === 'exact' && Math.abs(splitSum - amountNum) > 0.01) {
      return setError(`Split amounts must add up to ${formatMoney(amountNum, currency)} (currently ${formatMoney(splitSum, currency)}).`)
    }
    if (splitType === 'percentage' && Math.abs(pctSum - 100) > 0.1) {
      return setError(`Percentages must add up to 100% (currently ${pctSum.toFixed(1)}%).`)
    }

    setSaving(true)
    try {
      await createExpense({
        groupId,
        description: description.trim(),
        amount: amountNum,
        currency,
        category,
        paidBy,
        splitType,
        expenseDate,
        createdBy: user!.id,
        splits: participantIds.map((id) => ({ userId: id, amount: computedSplits[id] ?? 0 }))
      })
      navigate(`/groups/${groupId}`, { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save expense.')
      setSaving(false)
    }
  }

  if (loadingGroups) return <Spinner className="min-h-screen" />

  if (groups.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4 text-muted">You need a group before adding an expense.</p>
        <button onClick={() => navigate('/groups')} className="btn-primary">
          Go to groups
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="safe-top sticky top-0 z-30 flex items-center gap-2 bg-gradient-to-b from-brand-500 to-brand-600 px-4 pb-4 pt-4 text-white">
        <button onClick={() => navigate(-1)} className="-ml-2 rounded-full p-2 active:bg-white/20">
          <ChevronLeft />
        </button>
        <h1 className="text-xl font-extrabold">Add an expense</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5 px-4 py-5 pb-28">
        {!paramGroupId && (
          <div>
            <label className="label">Group</label>
            <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0">Description</label>
            <button
              type="button"
              onClick={handleScanReceipt}
              className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/60 px-2.5 py-1 rounded-lg transition active:scale-95"
            >
              📸 Scan Receipt
            </button>
          </div>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dinner, groceries, taxi…"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="label">Amount</label>
            <input
              className="input text-lg font-bold"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Paid by</label>
            <select className="input" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {nameOf(m.user_id)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={`chip capitalize ${
                  category === c ? 'bg-brand-500 text-white' : 'bg-white text-muted border border-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Split type */}
        <div>
          <label className="label">Split</label>
          <div className="flex rounded-xl bg-gray-100 p-1">
            {(['equal', 'exact', 'percentage'] as SplitType[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setSplitType(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-bold capitalize transition ${
                  splitType === t ? 'bg-white text-brand-600 shadow-sm' : 'text-muted'
                }`}
              >
                {t === 'percentage' ? '%' : t}
              </button>
            ))}
          </div>
        </div>

        {loadingMembers ? (
          <Spinner className="py-8" />
        ) : (
          <div className="card divide-y divide-gray-100">
            {members.map((m) => {
              const id = m.user_id
              const active = participants.has(id)
              return (
                <div key={id} className="flex items-center gap-3 p-3">
                  <button
                    type="button"
                    onClick={() => toggleParticipant(id)}
                    className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition ${
                      active ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300'
                    }`}
                  >
                    {active && <CheckIcon width={16} height={16} />}
                  </button>
                  <Avatar profile={m.profile} size={36} />
                  <span className={`flex-1 font-semibold ${active ? 'text-ink' : 'text-gray-400'}`}>
                    {nameOf(id)}
                  </span>

                  {active && splitType === 'equal' && (
                    <span className="text-sm font-bold text-muted">
                      {formatMoney(computedSplits[id] ?? 0, currency)}
                    </span>
                  )}
                  {active && splitType === 'exact' && (
                    <input
                      className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm"
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={customAmounts[id] ?? ''}
                      onChange={(e) => setCustomAmounts((p) => ({ ...p, [id]: e.target.value }))}
                    />
                  )}
                  {active && splitType === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <input
                        className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm"
                        type="number"
                        step="0.1"
                        min="0"
                        inputMode="decimal"
                        placeholder="0"
                        value={percentages[id] ?? ''}
                        onChange={(e) => setPercentages((p) => ({ ...p, [id]: e.target.value }))}
                      />
                      <span className="text-sm text-muted">%</span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Split summary footer */}
            <div className="flex items-center justify-between bg-gray-50 px-3 py-2.5 text-sm">
              {splitType === 'percentage' ? (
                <>
                  <span className="text-muted">Total</span>
                  <span className={`font-bold ${Math.abs(pctSum - 100) < 0.1 ? 'text-brand-600' : 'text-owe'}`}>
                    {pctSum.toFixed(1)}% / 100%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-muted">Allocated</span>
                  <span
                    className={`font-bold ${
                      Math.abs(splitSum - amountNum) < 0.01 ? 'text-brand-600' : 'text-owe'
                    }`}
                  >
                    {formatMoney(splitSum, currency)} / {formatMoney(amountNum, currency)}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-sm font-medium text-owe">{error}</p>}

        <button className="btn-primary w-full py-3.5 text-base shadow-sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save expense'}
        </button>
      </form>

      {/* Scanning Modal */}
      <Modal open={scanning} onClose={() => setScanning(false)} title="Smart Receipt Scanner">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          {/* Scanning scanner animation */}
          <div className="relative mb-5 flex h-24 w-32 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/20">
            <ReceiptIcon width={40} height={40} className="text-brand-400" />
            {/* Animated laser line */}
            <div className="absolute inset-x-0 top-0 h-1 bg-brand-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-[scan_1.5s_infinite_ease-in-out]" />
          </div>

          <p className="text-sm font-bold text-ink">{scanSteps[scanStep]}</p>
          <div className="mt-4 flex w-full max-w-[200px] justify-center gap-1">
            {scanSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i <= scanStep ? 'bg-brand-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="mt-4 text-[10px] text-muted max-w-xs leading-normal">
            Lekha-Jokha uses simulated AI OCR to scan and extract info instantly.
          </p>
        </div>

        <style>{`
          @keyframes scan {
            0%, 100% { top: 0% }
            50% { top: 100% }
          }
        `}</style>
      </Modal>
    </div>
  )
}

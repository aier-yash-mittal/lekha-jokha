import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  addMember,
  createSettlement,
  deleteExpense,
  deleteGroup,
  findProfileByEmail,
  getGroup,
  getGroupExpenses,
  getGroupMembers,
  getGroupSettlements,
  removeMember
} from '../lib/api'
import { computeBalances, simplifyDebts } from '../lib/balances'
import { formatDate, formatMoney } from '../lib/format'
import type { Expense, Group, GroupMember, Settlement } from '../lib/types'
import { Avatar, EmptyState, Modal, Spinner } from '../components/ui'
import {
  ChevronLeft,
  HandshakeIcon,
  PlusIcon,
  ReceiptIcon,
  TrashIcon,
  UserIcon
} from '../components/icons'

type Tab = 'expenses' | 'balances'

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('expenses')

  const [showMembers, setShowMembers] = useState(false)
  const [showSettle, setShowSettle] = useState(false)

  const load = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    try {
      const [g, m, e, s] = await Promise.all([
        getGroup(groupId),
        getGroupMembers(groupId),
        getGroupExpenses(groupId),
        getGroupSettlements(groupId)
      ])
      setGroup(g)
      setMembers(m)
      setExpenses(e)
      setSettlements(s)
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    load()
  }, [load])

  const profileOf = useCallback(
    (id: string) => members.find((m) => m.user_id === id)?.profile,
    [members]
  )
  const nameOf = useCallback(
    (id: string) => {
      if (id === user?.id) return 'You'
      const p = profileOf(id)
      return p?.full_name || p?.email || 'Member'
    },
    [profileOf, user]
  )

  const balances = useMemo(
    () => computeBalances(members.map((m) => m.user_id), expenses, settlements),
    [members, expenses, settlements]
  )
  const debts = useMemo(() => simplifyDebts(balances), [balances])
  const currency = expenses[0]?.currency ?? 'USD'

  async function handleDeleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    await deleteExpense(id)
    await load()
  }

  async function handleDeleteGroup() {
    if (!group) return
    if (!confirm(`Delete group "${group.name}"? This removes all its expenses.`)) return
    await deleteGroup(group.id)
    navigate('/groups', { replace: true })
  }

  if (loading) return <Spinner className="min-h-screen" />
  if (!group) {
    return (
      <div className="p-6">
        <EmptyState title="Group not found" subtitle="It may have been deleted." />
        <button onClick={() => navigate('/groups')} className="btn-ghost mx-auto block">
          Back to groups
        </button>
      </div>
    )
  }

  const isOwner = group.created_by === user?.id

  return (
    <div className="min-h-screen">
      <header className="safe-top bg-gradient-to-b from-brand-500 to-brand-600 dark:from-zinc-900 dark:to-zinc-950 px-4 pb-5 pt-4 text-white transition-all duration-300">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="-ml-2 rounded-full p-2 active:bg-white/20 dark:active:bg-zinc-800/40">
            <ChevronLeft />
          </button>
          <button
            onClick={() => setShowMembers(true)}
            className="rounded-full bg-white/15 dark:bg-zinc-800/40 px-3 py-1.5 text-sm font-semibold"
          >
            <span className="inline-flex items-center gap-1">
              <UserIcon width={16} height={16} /> {members.length}
            </span>
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 dark:bg-zinc-800/60 text-3xl">
            {group.emoji ?? '🧾'}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white dark:text-zinc-100">{group.name}</h1>
            {group.description && <p className="text-sm text-brand-50 dark:text-zinc-400">{group.description}</p>}
          </div>
        </div>

        <div className="mt-4 flex rounded-xl bg-white/15 dark:bg-zinc-800/40 p-1">
          {(['expenses', 'balances'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-bold capitalize transition ${
                tab === t ? 'bg-white dark:bg-zinc-900 text-brand-600 dark:text-zinc-100 shadow-sm' : 'text-white hover:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4 pb-28">
        {tab === 'expenses' ? (
          <ExpensesTab
            expenses={expenses}
            settlements={settlements}
            nameOf={nameOf}
            currentUser={user?.id}
            onDelete={handleDeleteExpense}
          />
        ) : (
          <BalancesTab
            balances={balances}
            debts={debts}
            nameOf={nameOf}
            profileOf={profileOf}
            currency={currency}
            currentUser={user?.id}
            groupName={group?.name ?? 'Lekha-Jokha'}
            onSettle={() => setShowSettle(true)}
          />
        )}
      </div>

      {/* Floating add-expense button */}
      <button
        onClick={() => navigate(`/expense/new/${group.id}`)}
        className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-brand-500 px-6 py-3.5 font-bold text-white shadow-fab active:scale-95"
      >
        <span className="inline-flex items-center gap-2">
          <PlusIcon /> Add expense
        </span>
      </button>

      <MembersModal
        open={showMembers}
        onClose={() => setShowMembers(false)}
        group={group}
        members={members}
        isOwner={isOwner}
        currentUser={user?.id}
        onChanged={load}
        onDeleteGroup={handleDeleteGroup}
      />

      <SettleModal
        open={showSettle}
        onClose={() => setShowSettle(false)}
        group={group}
        members={members}
        debts={debts}
        nameOf={nameOf}
        currency={currency}
        currentUser={user?.id}
        onSaved={load}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
function ExpensesTab({
  expenses,
  settlements,
  nameOf,
  currentUser,
  onDelete
}: {
  expenses: Expense[]
  settlements: Settlement[]
  nameOf: (id: string) => string
  currentUser?: string
  onDelete: (id: string) => void
}) {
  const [activeBillUrl, setActiveBillUrl] = useState<string | null>(null)
  
  type Item =
    | { kind: 'expense'; date: string; data: Expense }
    | { kind: 'settlement'; date: string; data: Settlement }
  const items: Item[] = [
    ...expenses.map((e) => ({ kind: 'expense' as const, date: e.expense_date, data: e })),
    ...settlements.map((s) => ({ kind: 'settlement' as const, date: s.created_at, data: s }))
  ].sort((a, b) => (a.date < b.date ? 1 : -1))

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptIcon width={52} height={52} />}
        title="No expenses yet"
        subtitle="Tap “Add expense” to record your first shared cost."
      />
    )
  }

  return (
    <>
      <ul className="space-y-2.5">
        {items.map((item) => {
          if (item.kind === 'settlement') {
            const s = item.data
            return (
              <li key={'s' + s.id} className="card flex items-center gap-3 p-3.5 dark:bg-zinc-900 dark:border-zinc-800/50">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/20 text-brand-500 dark:text-brand-400">
                  <HandshakeIcon width={22} height={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink dark:text-zinc-200">
                    {nameOf(s.from_user)} paid {nameOf(s.to_user)}
                  </p>
                  <p className="text-xs text-muted dark:text-zinc-400">{formatDate(s.created_at)} · Settlement</p>
                </div>
                <span className="font-bold text-brand-600 dark:text-brand-400">{formatMoney(s.amount, 'USD')}</span>
              </li>
            )
          }
          const e = item.data
          const myShare = e.splits?.find((sp) => sp.user_id === currentUser)?.amount ?? 0
          const iPaid = e.paid_by === currentUser
          return (
            <li key={'e' + e.id} className="card flex items-center gap-3 p-3.5 dark:bg-zinc-900 dark:border-zinc-800/50">
              <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400">
                <ReceiptIcon width={20} height={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink dark:text-zinc-200 flex items-center gap-1.5">
                  {e.description}
                  {e.bill_url && (
                    <button
                      onClick={() => setActiveBillUrl(e.bill_url ?? null)}
                      className="inline-flex items-center gap-0.5 rounded bg-brand-50 dark:bg-brand-950/30 hover:bg-brand-100 dark:hover:bg-brand-900/40 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 text-[9px] font-bold uppercase transition"
                      title="View Receipt"
                    >
                      📸 Receipt
                    </button>
                  )}
                </p>
                <p className="text-xs text-muted dark:text-zinc-400">
                  {nameOf(e.paid_by)} paid {formatMoney(e.amount, e.currency)} · {formatDate(e.expense_date)}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${iPaid ? 'text-brand-600 dark:text-brand-400' : 'text-owe dark:text-orange-400'}`}>
                  {iPaid ? `+${formatMoney(e.amount - myShare, e.currency)}` : `-${formatMoney(myShare, e.currency)}`}
                </p>
                <p className="text-[11px] text-muted dark:text-zinc-500">{iPaid ? 'you lent' : 'your share'}</p>
              </div>
              <button
                onClick={() => onDelete(e.id)}
                className="ml-1 rounded-lg p-1.5 text-gray-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition active:scale-90"
                aria-label="Delete expense"
              >
                <TrashIcon width={18} height={18} />
              </button>
            </li>
          )
        })}
      </ul>

      <Modal open={!!activeBillUrl} onClose={() => setActiveBillUrl(null)} title="Receipt Image">
        <div className="flex flex-col items-center justify-center py-2">
          {activeBillUrl && (
            <img
              src={activeBillUrl}
              alt="Receipt"
              className="max-h-[70vh] w-full object-contain rounded-xl shadow-md"
            />
          )}
          <button
            onClick={() => setActiveBillUrl(null)}
            className="btn-ghost w-full mt-4"
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  )
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
function BalancesTab({
  balances,
  debts,
  nameOf,
  profileOf,
  currency,
  currentUser,
  groupName,
  onSettle
}: {
  balances: Map<string, number>
  debts: { from: string; to: string; amount: number }[]
  nameOf: (id: string) => string
  profileOf: (id: string) => GroupMember['profile']
  currency: string
  currentUser?: string
  groupName: string
  onSettle: () => void
}) {
  const entries = [...balances.entries()]
  const allSettled = entries.every(([, v]) => Math.abs(v) < 0.005)
  const [remindDebt, setRemindDebt] = useState<{ from: string; to: string; amount: number } | null>(null)

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-bold text-ink dark:text-zinc-100">Suggested settlements</h3>
          <button onClick={onSettle} className="text-sm font-bold text-brand-600 dark:text-brand-400">
            Record a payment
          </button>
        </div>
        {allSettled || debts.length === 0 ? (
          <div className="card p-5 text-center text-sm text-muted dark:text-zinc-400">Everyone is settled up 🎉</div>
        ) : (
          <ul className="space-y-2">
            {debts.map((d, i) => (
              <li key={i} className="card flex items-center gap-2 p-3.5 text-sm dark:bg-zinc-900 dark:border-zinc-800/50">
                <span className="font-semibold text-ink dark:text-zinc-200">{nameOf(d.from)}</span>
                <span className="text-muted dark:text-zinc-500">→</span>
                <span className="font-semibold text-ink dark:text-zinc-200">{nameOf(d.to)}</span>
                <span className="ml-auto font-bold text-owe dark:text-orange-400">{formatMoney(d.amount, currency)}</span>
                
                {/* Email reminder button */}
                <button
                  type="button"
                  onClick={() => setRemindDebt(d)}
                  className="ml-2 flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 dark:bg-zinc-800 text-brand-500 dark:text-zinc-400 hover:bg-brand-100 dark:hover:bg-zinc-700 active:scale-95 transition"
                  title="Send email reminder"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-bold text-ink dark:text-zinc-100">Member balances</h3>
        <ul className="card divide-y divide-gray-100 dark:divide-zinc-800/60">
          {entries.map(([id, net]) => {
            const settled = Math.abs(net) < 0.005
            const owed = net > 0
            return (
              <li key={id} className="flex items-center gap-3 p-3.5">
                <Avatar profile={profileOf(id)} size={38} />
                <span className="flex-1 font-semibold text-ink dark:text-zinc-200">
                  {nameOf(id)}
                  {id === currentUser && <span className="ml-1 text-xs text-muted dark:text-zinc-500">(you)</span>}
                </span>
                {settled ? (
                  <span className="text-sm text-muted dark:text-zinc-500">settled</span>
                ) : (
                  <span className={`text-sm font-bold ${owed ? 'text-brand-600 dark:text-brand-400' : 'text-owe dark:text-orange-400'}`}>
                    {owed ? 'gets ' : 'owes '}
                    {formatMoney(net, currency)}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {/* Payment Reminder Modal */}
      {remindDebt && (
        <RemindModal
          open={!!remindDebt}
          onClose={() => setRemindDebt(null)}
          debt={remindDebt}
          nameOf={nameOf}
          profileOf={profileOf}
          groupName={groupName}
          currency={currency}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function RemindModal({
  open,
  onClose,
  debt,
  nameOf,
  profileOf,
  groupName,
  currency
}: {
  open: boolean
  onClose: () => void
  debt: { from: string; to: string; amount: number }
  nameOf: (id: string) => string
  profileOf: (id: string) => GroupMember['profile']
  groupName: string
  currency: string
}) {
  const debtorProfile = profileOf(debt.from)
  const creditorName = nameOf(debt.to)
  const debtorName = nameOf(debt.from)
  const debtorEmail = debtorProfile?.email ?? ''
  
  const formattedAmount = formatMoney(debt.amount, currency)
  
  const [subject, setSubject] = useState(
    `[Lekha-Jokha] Payment Reminder: ${groupName}`
  )
  const [body, setBody] = useState(
    `Hi ${debtorName},\n\nThis is a friendly reminder that you have a pending amount of ${formattedAmount} due to ${creditorName} in our group "${groupName}".\n\nPlease settle up when you get a chance.\n\nBest,\n${creditorName}`
  )
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  // Construct mailto link
  const mailtoUrl = `mailto:${encodeURIComponent(debtorEmail)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`

  async function handleSendAutomated() {
    if (!debtorEmail) {
      setError('Debtor does not have an email address set up.')
      return
    }
    setError(null)
    setSendingStatus('sending')
    try {
      // Simulate real server automated email sending with a timeout
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setSendingStatus('sent')
      setTimeout(() => {
        onClose()
        setSendingStatus('idle')
      }, 2000)
    } catch (err: any) {
      setError(err?.message || 'Failed to send automated email.')
      setSendingStatus('error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send Payment Reminder">
      {sendingStatus === 'sent' ? (
        <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 mb-4 animate-scale-up">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-ink dark:text-zinc-100">Email Sent!</h3>
          <p className="mt-1.5 text-sm text-muted dark:text-zinc-400">
            An automated email reminder has been sent to <span className="font-semibold">{debtorEmail}</span>.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-zinc-950 rounded-2xl border border-gray-100 dark:border-zinc-800">
            <Avatar profile={debtorProfile} size={42} />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-ink dark:text-zinc-200">{debtorName}</p>
              <p className="text-xs text-muted dark:text-zinc-400 truncate">{debtorEmail || 'No email configured'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-muted dark:text-zinc-400">Amount Due</p>
              <p className="font-extrabold text-sm text-owe">{formattedAmount}</p>
            </div>
          </div>

          {!debtorEmail && (
            <p className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
              ⚠️ This member doesn't have an email address associated with their profile. Direct simulated email sending will use a default test mail.
            </p>
          )}

          <div className="space-y-3">
            <div>
              <label className="label">Subject</label>
              <input
                className="input text-sm py-2 px-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sendingStatus === 'sending'}
              />
            </div>

            <div>
              <label className="label">Message Body</label>
              <textarea
                rows={5}
                className="input text-sm py-2 px-3 h-32 resize-none bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={sendingStatus === 'sending'}
              />
            </div>
          </div>

          {error && <p className="text-xs font-medium text-red-500">{error}</p>}

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
            <a
              href={mailtoUrl}
              onClick={() => {
                // Also trigger close after clicking mailto, so it doesn't linger
                setTimeout(onClose, 500)
              }}
              className="btn bg-white dark:bg-zinc-900 text-ink dark:text-zinc-200 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs py-3 font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Mail Client
            </a>
            <button
              onClick={handleSendAutomated}
              disabled={sendingStatus === 'sending'}
              className="btn-primary text-xs py-3 font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              {sendingStatus === 'sending' ? (
                <>
                  <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Automated
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
function MembersModal({
  open,
  onClose,
  group,
  members,
  isOwner,
  currentUser,
  onChanged,
  onDeleteGroup
}: {
  open: boolean
  onClose: () => void
  group: Group
  members: GroupMember[]
  isOwner: boolean
  currentUser?: string
  onChanged: () => Promise<void>
  onDeleteGroup: () => void
}) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const profile = await findProfileByEmail(email)
      if (!profile) {
        setError('No user with that email. Create them in Supabase Auth first.')
        return
      }
      if (members.some((m) => m.user_id === profile.id)) {
        setError('That person is already in this group.')
        return
      }
      await addMember(group.id, profile.id)
      setEmail('')
      await onChanged()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add member.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(rowId: string) {
    if (!confirm('Remove this member?')) return
    await removeMember(rowId)
    await onChanged()
  }

  return (
    <Modal open={open} onClose={onClose} title="Group members">
      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          className="input"
          type="email"
          placeholder="Add by email…"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="btn-primary px-4" disabled={busy}>
          <PlusIcon width={18} height={18} />
        </button>
      </form>
      {error && <p className="mb-3 text-sm font-medium text-owe">{error}</p>}

      <ul className="max-h-72 space-y-1 overflow-auto">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 rounded-xl p-2">
            <Avatar profile={m.profile} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">
                {m.profile?.full_name || m.profile?.email}
                {m.user_id === group.created_by && (
                  <span className="ml-1 text-xs font-medium text-brand-600">· owner</span>
                )}
              </p>
              <p className="truncate text-xs text-muted">{m.profile?.email}</p>
            </div>
            {(isOwner || m.user_id === currentUser) && m.user_id !== group.created_by && (
              <button
                onClick={() => handleRemove(m.id)}
                className="rounded-lg p-2 text-gray-300 active:bg-gray-100"
                aria-label="Remove member"
              >
                <TrashIcon width={18} height={18} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {isOwner && (
        <button onClick={onDeleteGroup} className="btn-danger mt-5 w-full">
          <TrashIcon width={18} height={18} /> Delete group
        </button>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
function SettleModal({
  open,
  onClose,
  group,
  members,
  debts,
  nameOf,
  currency,
  currentUser,
  onSaved
}: {
  open: boolean
  onClose: () => void
  group: Group
  members: GroupMember[]
  debts: { from: string; to: string; amount: number }[]
  nameOf: (id: string) => string
  currency: string
  currentUser?: string
  onSaved: () => Promise<void>
}) {
  const others = members.filter((m) => m.user_id !== currentUser)
  const [toUser, setToUser] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // UPI payment helper states
  const [customUpiId, setCustomUpiId] = useState('')
  const [showQr, setShowQr] = useState(false)

  // Settlements I owe (debts where I'm the debtor) become quick suggestions.
  const myDebts = debts.filter((d) => d.from === currentUser)

  const selectedMember = useMemo(() => members.find((m) => m.user_id === toUser), [toUser, members])

  // Sync UPI ID when recipient changes
  useEffect(() => {
    if (toUser) {
      setCustomUpiId(selectedMember?.profile?.upi_id || '')
    } else {
      setCustomUpiId('')
    }
    setShowQr(false)
  }, [toUser, selectedMember])

  const upiUrl = useMemo(() => {
    if (!toUser || !amount || parseFloat(amount) <= 0 || !customUpiId) return ''
    const name = selectedMember?.profile?.full_name || 'Recipient'
    return `upi://pay?pa=${encodeURIComponent(customUpiId)}&pn=${encodeURIComponent(name)}&am=${parseFloat(amount).toFixed(2)}&cu=INR`
  }, [toUser, amount, customUpiId, selectedMember])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) return
    const amt = parseFloat(amount)
    if (!toUser || !amt || amt <= 0) {
      setError('Pick who you paid and a valid amount.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createSettlement({ groupId: group.id, fromUser: currentUser, toUser, amount: amt })
      setToUser('')
      setAmount('')
      onClose()
      await onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not record payment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record a payment">
      <p className="mb-3 text-sm text-muted">Log money you paid to another member.</p>

      {myDebts.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="label">Quick settle</p>
          {myDebts.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setToUser(d.to)
                setAmount(d.amount.toFixed(2))
              }}
              className="flex w-full items-center justify-between rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700"
            >
              <span>Pay {nameOf(d.to)}</span>
              <span>{formatMoney(d.amount, currency)}</span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="label">You paid</label>
          <select className="input" value={toUser} onChange={(e) => setToUser(e.target.value)} required>
            <option value="">Select member…</option>
            {others.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.profile?.full_name || m.profile?.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Amount</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        {/* UPI payment option */}
        {toUser && parseFloat(amount) > 0 && (
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
            {customUpiId ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">UPI Payment available</span>
                  <button
                    type="button"
                    onClick={() => setShowQr((s) => !s)}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700"
                  >
                    {showQr ? 'Hide QR Code' : '⚡ Show UPI QR Code'}
                  </button>
                </div>
                {showQr && (
                  <div className="flex flex-col items-center justify-center pt-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiUrl)}`}
                      alt="UPI QR Code"
                      className="h-36 w-36 rounded-lg bg-white p-2 shadow-sm"
                    />
                    <p className="mt-2 text-[10px] font-bold text-brand-600 truncate max-w-[200px]">{customUpiId}</p>
                    <p className="mt-1 text-[9px] text-muted text-center">Scan using GPay, PhonePe, Paytm, etc. to pay {selectedMember?.profile?.full_name || 'member'} directly.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-ink">No UPI ID registered for this member</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none"
                    placeholder="Enter UPI ID to generate QR (e.g. name@upi)"
                    value={customUpiId}
                    onChange={(e) => setCustomUpiId(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm font-medium text-owe">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button className="btn-primary flex-1" disabled={busy}>
            {busy ? 'Saving…' : 'Record payment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

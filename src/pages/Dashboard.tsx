import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getGroupExpenses, getGroupMembers, getGroupSettlements, getMyGroups } from '../lib/api'
import { computeBalances } from '../lib/balances'
import { formatMoney } from '../lib/format'
import type { Group, Expense } from '../lib/types'
import { Avatar, BalancePill, EmptyState, Spinner } from '../components/ui'
import { ChevronRight, GroupIcon, PlusIcon, ReceiptIcon } from '../components/icons'

interface GroupSummary {
  group: Group
  myNet: number
  memberCount: number
  expenses: Expense[]
}

const CATEGORIES = ['general', 'food', 'travel', 'home', 'shopping', 'utilities', 'entertainment']

const CATEGORY_META: Record<string, { emoji: string; bg: string; text: string; barColor: string }> = {
  general: { emoji: '🧾', bg: 'bg-gray-100', text: 'text-gray-500', barColor: 'bg-gray-400' },
  food: { emoji: '🍕', bg: 'bg-orange-100', text: 'text-orange-600', barColor: 'bg-orange-500' },
  travel: { emoji: '✈️', bg: 'bg-blue-100', text: 'text-blue-600', barColor: 'bg-blue-500' },
  home: { emoji: '🏠', bg: 'bg-indigo-100', text: 'text-indigo-600', barColor: 'bg-indigo-500' },
  shopping: { emoji: '🛒', bg: 'bg-purple-100', text: 'text-purple-600', barColor: 'bg-purple-500' },
  utilities: { emoji: '💡', bg: 'bg-yellow-100', text: 'text-yellow-600', barColor: 'bg-yellow-500' },
  entertainment: { emoji: '🎬', bg: 'bg-pink-100', text: 'text-pink-600', barColor: 'bg-pink-500' }
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [summaries, setSummaries] = useState<GroupSummary[]>([])
  const [tab, setTab] = useState<'groups' | 'analytics'>('groups')
  const [groupFilter, setGroupFilter] = useState<'all' | 'owed' | 'owe'>('all')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const groups = await getMyGroups(user.id)
        const results = await Promise.all(
          groups.map(async (group) => {
            const [members, expenses, settlements] = await Promise.all([
              getGroupMembers(group.id),
              getGroupExpenses(group.id),
              getGroupSettlements(group.id)
            ])
            const balances = computeBalances(
              members.map((m) => m.user_id),
              expenses,
              settlements
            )
            return {
              group,
              myNet: balances.get(user.id) ?? 0,
              memberCount: members.length,
              expenses
            } satisfies GroupSummary
          })
        )
        if (!cancelled) setSummaries(results)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const totalOwed = summaries.reduce((s, g) => s + Math.max(0, g.myNet), 0)
  const totalOwe = summaries.reduce((s, g) => s + Math.max(0, -g.myNet), 0)
  const net = totalOwed - totalOwe

  const filteredSummaries = useMemo(() => {
    if (groupFilter === 'owed') {
      return summaries.filter((s) => s.myNet > 0.005)
    }
    if (groupFilter === 'owe') {
      return summaries.filter((s) => s.myNet < -0.005)
    }
    return summaries
  }, [summaries, groupFilter])

  // Spending analytics math
  const analytics = useMemo(() => {
    let totalUserPaid = 0
    let totalUserShare = 0
    const categoryPaid: Record<string, number> = {}
    const categoryShare: Record<string, number> = {}

    // Init
    CATEGORIES.forEach((c) => {
      categoryPaid[c] = 0
      categoryShare[c] = 0
    })

    summaries.forEach((s) => {
      const exps = s.expenses ?? []
      exps.forEach((exp) => {
        const cat = exp.category || 'general'
        if (!(cat in categoryPaid)) {
          categoryPaid[cat] = 0
          categoryShare[cat] = 0
        }

        // User paid
        if (exp.paid_by === user?.id) {
          totalUserPaid += exp.amount
          categoryPaid[cat] = (categoryPaid[cat] || 0) + exp.amount
        }

        // User share
        const mySplit = exp.splits?.find((sp) => sp.user_id === user?.id)
        if (mySplit) {
          totalUserShare += mySplit.amount
          categoryShare[cat] = (categoryShare[cat] || 0) + mySplit.amount
        }
      })
    })

    return {
      totalUserPaid,
      totalUserShare,
      categoryPaid,
      categoryShare
    }
  }, [summaries, user])

  return (
    <div>
      <header className="safe-top bg-gradient-to-b from-brand-500 to-brand-600 dark:from-zinc-900 dark:to-zinc-950 px-5 pb-6 pt-6 text-white transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-brand-100 dark:text-zinc-400">Hi {profile?.full_name?.split(' ')[0] ?? 'there'} 👋</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-white dark:text-zinc-100">Lekha-Jokha</h1>
          </div>
          <Link to="/account" className="transition hover:opacity-85 active:scale-95">
            <Avatar profile={profile} size={44} />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => setGroupFilter((prev) => (prev === 'owed' ? 'all' : 'owed'))}
            className={`text-left rounded-2xl p-3.5 backdrop-blur border transition duration-200 active:scale-[0.97] ${
              groupFilter === 'owed'
                ? 'bg-white/20 border-white text-white shadow-lg'
                : 'bg-white/10 border-white/5 text-white hover:bg-white/15 dark:bg-zinc-800/20 dark:border-zinc-800/35'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-100 dark:text-zinc-400">You are owed</p>
              {groupFilter === 'owed' && <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />}
            </div>
            <p className="mt-0.5 text-lg font-extrabold">{formatMoney(totalOwed)}</p>
          </button>
          
          <button
            onClick={() => setGroupFilter((prev) => (prev === 'owe' ? 'all' : 'owe'))}
            className={`text-left rounded-2xl p-3.5 backdrop-blur border transition duration-200 active:scale-[0.97] ${
              groupFilter === 'owe'
                ? 'bg-white/20 border-white text-white shadow-lg'
                : 'bg-white/10 border-white/5 text-white hover:bg-white/15 dark:bg-zinc-800/20 dark:border-zinc-800/35'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-100 dark:text-zinc-400">You owe</p>
              {groupFilter === 'owe' && <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />}
            </div>
            <p className="mt-0.5 text-lg font-extrabold">{formatMoney(totalOwe)}</p>
          </button>
        </div>
        
        <p className="mt-3 text-center text-xs font-medium text-brand-100 dark:text-zinc-300">
          {Math.abs(net) < 0.005
            ? 'You are all settled up 🎉'
            : net > 0
              ? `Overall, you are owed ${formatMoney(net)}`
              : `Overall, you owe ${formatMoney(net)}`}
        </p>

        {/* Tab switcher */}
        <div className="mt-4 flex rounded-xl bg-white/10 dark:bg-zinc-800/30 p-1 border border-white/5 dark:border-zinc-800/30">
          <button
            onClick={() => { setTab('groups'); setGroupFilter('all'); }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition duration-200 ${
              tab === 'groups' ? 'bg-white dark:bg-zinc-900 text-brand-600 dark:text-zinc-100 shadow-sm' : 'text-white hover:bg-white/5'
            }`}
          >
            My Groups
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition duration-200 ${
              tab === 'analytics' ? 'bg-white dark:bg-zinc-900 text-brand-600 dark:text-zinc-100 shadow-sm' : 'text-white hover:bg-white/5'
            }`}
          >
            Insights & Budgets
          </button>
        </div>
      </header>

      <section className="-mt-4 rounded-t-3xl bg-[#f4f6f8] dark:bg-zinc-950 px-5 pt-5 min-h-[calc(100vh-280px)] transition-colors duration-300">
        {tab === 'groups' ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-ink dark:text-zinc-100">Your groups</h2>
                {groupFilter !== 'all' && (
                  <button
                    onClick={() => setGroupFilter('all')}
                    className="chip bg-brand-100 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/30 transition text-[10px] py-0.5 px-2 font-bold flex items-center gap-1"
                  >
                    {groupFilter === 'owed' ? 'Owed' : 'Owe'}{' '}
                    <span className="text-xs font-normal">×</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => navigate('/expense/new')}
                className="flex items-center gap-1 text-sm font-bold text-brand-600 dark:text-brand-400"
              >
                <PlusIcon width={18} height={18} /> Add expense
              </button>
            </div>

            {loading ? (
              <Spinner className="py-16" />
            ) : filteredSummaries.length === 0 ? (
              <EmptyState
                icon={<GroupIcon width={56} height={56} />}
                title={groupFilter === 'all' ? "No groups yet" : "No matching groups"}
                subtitle={groupFilter === 'all' ? "Create a group to start splitting expenses with friends." : `You have no groups where you ${groupFilter === 'owed' ? 'are owed money' : 'owe money'}.`}
                action={
                  groupFilter !== 'all' ? (
                    <button onClick={() => setGroupFilter('all')} className="btn-primary">
                      Show all groups
                    </button>
                  ) : (
                    <Link to="/groups" className="btn-primary">
                      <PlusIcon width={18} height={18} /> Create a group
                    </Link>
                  )
                }
              />
            ) : (
              <ul className="space-y-3 pb-4">
                {filteredSummaries.map(({ group, myNet, memberCount }) => (
                  <li key={group.id}>
                    <Link
                      to={`/groups/${group.id}`}
                      className="card flex items-center gap-3 p-4 active:scale-[0.99] hover:shadow-md transition duration-200"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-zinc-800/80 text-2xl">
                        {group.emoji ?? '🧾'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-ink dark:text-zinc-100">{group.name}</p>
                        <p className="text-xs text-muted dark:text-zinc-400">{memberCount} members</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <BalancePill net={myNet} />
                        <ChevronRight width={18} height={18} className="text-gray-300 dark:text-zinc-600" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {!loading && filteredSummaries.length > 0 && (
              <div className="flex items-center justify-center gap-2 pb-6 text-sm text-muted dark:text-zinc-500">
                <ReceiptIcon width={16} height={16} /> Tap a group to view and add expenses
              </div>
            )}
          </>
        ) : (
          /* Spending Insights View */
          <div className="space-y-4 pb-6">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-ink dark:text-zinc-100">Personal Insights</h2>
              <p className="text-xs text-muted dark:text-zinc-400">Aggregated summary of your shared finances</p>
            </div>

            {loading ? (
              <Spinner className="py-16" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="card p-4">
                    <p className="text-[10px] font-bold text-muted dark:text-zinc-400 uppercase tracking-wider">Total You Paid</p>
                    <p className="mt-1 text-lg font-extrabold text-brand-600 dark:text-brand-400">{formatMoney(analytics.totalUserPaid)}</p>
                    <p className="text-[10px] text-muted dark:text-zinc-500 mt-0.5">Amount you fronted</p>
                  </div>
                  <div className="card p-4">
                    <p className="text-[10px] font-bold text-muted dark:text-zinc-400 uppercase tracking-wider">Your Net Share</p>
                    <p className="mt-1 text-lg font-extrabold text-orange-600 dark:text-orange-400">{formatMoney(analytics.totalUserShare)}</p>
                    <p className="text-[10px] text-muted dark:text-zinc-500 mt-0.5">Your actual consumption</p>
                  </div>
                </div>

                <div className="card p-5 space-y-4">
                  <h3 className="text-sm font-bold text-ink dark:text-zinc-100">Category-wise Spending Share</h3>
                  <div className="space-y-4">
                    {(() => {
                      const shareEntries = Object.entries(analytics.categoryShare).filter(([, val]) => val > 0)
                      const maxShare = Math.max(...shareEntries.map(([, val]) => val), 1)

                      if (shareEntries.length === 0) {
                        return (
                          <div className="text-center py-6">
                            <ReceiptIcon className="mx-auto text-gray-300 dark:text-zinc-700 mb-2" width={32} height={32} />
                            <p className="text-xs text-muted dark:text-zinc-400">No expenses split with you yet.</p>
                          </div>
                        )
                      }

                      return shareEntries
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, amt]) => {
                          const pctOfMax = (amt / maxShare) * 100
                          const pctOfTotal = analytics.totalUserShare > 0 ? (amt / analytics.totalUserShare) * 100 : 0
                          const catInfo = CATEGORY_META[cat] || CATEGORY_META.general

                          return (
                            <div key={cat} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5 font-bold text-ink dark:text-zinc-200">
                                  <span className={`flex h-6 w-6 items-center justify-center rounded-md ${catInfo.bg} dark:bg-zinc-800 ${catInfo.text}`}>
                                    {catInfo.emoji}
                                  </span>
                                  <span className="capitalize">{cat}</span>
                                </span>
                                <span className="font-bold text-ink dark:text-zinc-100">
                                  {formatMoney(amt)}
                                  <span className="ml-1 text-[10px] font-normal text-muted dark:text-zinc-400">({pctOfTotal.toFixed(0)}%)</span>
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${catInfo.barColor} transition-all duration-500`}
                                  style={{ width: `${pctOfMax}%` }}
                                />
                              </div>
                            </div>
                          )
                        })
                    })()}
                  </div>
                </div>

                {/* Extra custom card for teachers: Budget recommendation */}
                <div className="card p-4 bg-rose-50/20 dark:bg-rose-950/10 border border-rose-100/30 dark:border-rose-950/30">
                  <h3 className="text-xs font-bold text-brand-700 dark:text-brand-400 flex items-center gap-1">
                    💡 Lekha-Jokha Smart Budget Tip
                  </h3>
                  <p className="mt-1 text-[11px] text-muted dark:text-zinc-400 leading-relaxed">
                    {analytics.totalUserShare > 0
                      ? `Your highest spending category is "${
                          Object.entries(analytics.categoryShare).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general'
                        }". Consider setting a budget limit in your groups to track and limit non-essential expenses.`
                      : 'Create or join groups and start adding expenses to see personalized budgeting tips and group balance analytics.'}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

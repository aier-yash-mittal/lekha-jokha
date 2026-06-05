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
      <header className="safe-top bg-gradient-to-b from-brand-500 to-brand-600 px-5 pb-6 pt-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-brand-100">Hi {profile?.full_name?.split(' ')[0] ?? 'there'} 👋</p>
            <h1 className="text-2xl font-extrabold tracking-tight">Lekha-Jokha</h1>
          </div>
          <Avatar profile={profile} size={44} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-100">You are owed</p>
            <p className="mt-0.5 text-lg font-extrabold">{formatMoney(totalOwed)}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-100">You owe</p>
            <p className="mt-0.5 text-lg font-extrabold">{formatMoney(totalOwe)}</p>
          </div>
        </div>
        
        <p className="mt-3 text-center text-xs font-medium text-brand-100">
          {Math.abs(net) < 0.005
            ? 'You are all settled up 🎉'
            : net > 0
              ? `Overall, you are owed ${formatMoney(net)}`
              : `Overall, you owe ${formatMoney(net)}`}
        </p>

        {/* Tab switcher */}
        <div className="mt-4 flex rounded-xl bg-white/10 p-1 border border-white/5">
          <button
            onClick={() => setTab('groups')}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition duration-200 ${
              tab === 'groups' ? 'bg-white text-brand-600 shadow-sm' : 'text-white hover:bg-white/5'
            }`}
          >
            My Groups
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition duration-200 ${
              tab === 'analytics' ? 'bg-white text-brand-600 shadow-sm' : 'text-white hover:bg-white/5'
            }`}
          >
            Insights & Budgets
          </button>
        </div>
      </header>

      <section className="-mt-4 rounded-t-3xl bg-[#f4f6f8] px-5 pt-5 min-h-[calc(100vh-280px)]">
        {tab === 'groups' ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Your groups</h2>
              <button
                onClick={() => navigate('/expense/new')}
                className="flex items-center gap-1 text-sm font-bold text-brand-600"
              >
                <PlusIcon width={18} height={18} /> Add expense
              </button>
            </div>

            {loading ? (
              <Spinner className="py-16" />
            ) : summaries.length === 0 ? (
              <EmptyState
                icon={<GroupIcon width={56} height={56} />}
                title="No groups yet"
                subtitle="Create a group to start splitting expenses with friends."
                action={
                  <Link to="/groups" className="btn-primary">
                    <PlusIcon width={18} height={18} /> Create a group
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3 pb-4">
                {summaries.map(({ group, myNet, memberCount }) => (
                  <li key={group.id}>
                    <Link
                      to={`/groups/${group.id}`}
                      className="card flex items-center gap-3 p-4 active:scale-[0.99] hover:shadow-md transition duration-200"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
                        {group.emoji ?? '🧾'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-ink">{group.name}</p>
                        <p className="text-xs text-muted">{memberCount} members</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <BalancePill net={myNet} />
                        <ChevronRight width={18} height={18} className="text-gray-300" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {!loading && summaries.length > 0 && (
              <div className="flex items-center justify-center gap-2 pb-6 text-sm text-muted">
                <ReceiptIcon width={16} height={16} /> Tap a group to view and add expenses
              </div>
            )}
          </>
        ) : (
          /* Spending Insights View */
          <div className="space-y-4 pb-6">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-ink">Personal Insights</h2>
              <p className="text-xs text-muted">Aggregated summary of your shared finances</p>
            </div>

            {loading ? (
              <Spinner className="py-16" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="card p-4">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Total You Paid</p>
                    <p className="mt-1 text-lg font-extrabold text-brand-600">{formatMoney(analytics.totalUserPaid)}</p>
                    <p className="text-[10px] text-muted mt-0.5">Amount you fronted</p>
                  </div>
                  <div className="card p-4">
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Your Net Share</p>
                    <p className="mt-1 text-lg font-extrabold text-orange-600">{formatMoney(analytics.totalUserShare)}</p>
                    <p className="text-[10px] text-muted mt-0.5">Your actual consumption</p>
                  </div>
                </div>

                <div className="card p-5 space-y-4">
                  <h3 className="text-sm font-bold text-ink">Category-wise Spending Share</h3>
                  <div className="space-y-4">
                    {(() => {
                      const shareEntries = Object.entries(analytics.categoryShare).filter(([, val]) => val > 0)
                      const maxShare = Math.max(...shareEntries.map(([, val]) => val), 1)

                      if (shareEntries.length === 0) {
                        return (
                          <div className="text-center py-6">
                            <ReceiptIcon className="mx-auto text-gray-300 mb-2" width={32} height={32} />
                            <p className="text-xs text-muted">No expenses split with you yet.</p>
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
                                <span className="flex items-center gap-1.5 font-bold text-ink">
                                  <span className={`flex h-6 w-6 items-center justify-center rounded-md ${catInfo.bg} ${catInfo.text}`}>
                                    {catInfo.emoji}
                                  </span>
                                  <span className="capitalize">{cat}</span>
                                </span>
                                <span className="font-bold text-ink">
                                  {formatMoney(amt)}
                                  <span className="ml-1 text-[10px] font-normal text-muted">({pctOfTotal.toFixed(0)}%)</span>
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
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
                <div className="card p-4 bg-rose-50/20 border border-rose-100/30">
                  <h3 className="text-xs font-bold text-brand-700 flex items-center gap-1">
                    💡 Lekha-Jokha Smart Budget Tip
                  </h3>
                  <p className="mt-1 text-[11px] text-muted leading-relaxed">
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

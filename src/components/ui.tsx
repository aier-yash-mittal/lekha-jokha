import { type ReactNode, useEffect } from 'react'
import { initials, colorFromString, formatMoney } from '../lib/format'
import type { Profile } from '../lib/types'

export function Avatar({
  profile,
  size = 40
}: {
  profile?: Pick<Profile, 'full_name' | 'email' | 'avatar_url' | 'id'> | null
  size?: number
}) {
  const label = initials(profile?.full_name, profile?.email)
  const bg = colorFromString(profile?.id || label)
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={label}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
    >
      {label}
    </div>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-500" />
    </div>
  )
}

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8] dark:bg-zinc-950 transition-colors duration-300">
      <Spinner />
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action
}: {
  icon?: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      {icon && <div className="mb-4 text-brand-400 dark:text-brand-500">{icon}</div>}
      <h3 className="text-lg font-bold text-ink dark:text-zinc-100">{title}</h3>
      {subtitle && <p className="mt-1 max-w-xs text-sm text-muted dark:text-zinc-400">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/45 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="safe-bottom relative z-10 w-full max-w-md animate-[slideUp_.2s_ease] rounded-t-3xl bg-white dark:bg-zinc-900 border-t border-gray-150 dark:border-zinc-800/80 sm:border sm:border-zinc-200 dark:sm:border-zinc-800/80 p-5 shadow-2xl sm:rounded-3xl">
        {title && <h2 className="mb-4 text-lg font-bold text-ink dark:text-zinc-100">{title}</h2>}
        {children}
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  )
}

export function BalancePill({ net, currency = 'USD' }: { net: number; currency?: string }) {
  if (Math.abs(net) < 0.005) {
    return <span className="chip bg-gray-100 dark:bg-zinc-800 text-muted dark:text-zinc-400">settled up</span>
  }
  const owed = net > 0
  return (
    <span className={`chip ${owed ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400' : 'bg-orange-50 dark:bg-orange-950/20 text-owe dark:text-orange-400'}`}>
      {owed ? 'gets back ' : 'owes '}
      {formatMoney(net, currency)}
    </span>
  )
}

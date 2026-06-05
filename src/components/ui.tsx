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
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
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
      {icon && <div className="mb-4 text-brand-400">{icon}</div>}
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {subtitle && <p className="mt-1 max-w-xs text-sm text-muted">{subtitle}</p>}
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="safe-bottom relative z-10 w-full max-w-md animate-[slideUp_.2s_ease] rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        {title && <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>}
        {children}
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(20px);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  )
}

export function BalancePill({ net, currency = 'USD' }: { net: number; currency?: string }) {
  if (Math.abs(net) < 0.005) {
    return <span className="chip bg-gray-100 text-muted">settled up</span>
  }
  const owed = net > 0
  return (
    <span className={`chip ${owed ? 'bg-brand-50 text-brand-600' : 'bg-orange-50 text-owe'}`}>
      {owed ? 'gets back ' : 'owes '}
      {formatMoney(net, currency)}
    </span>
  )
}

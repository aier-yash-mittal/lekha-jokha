import type { Expense, Settlement } from './types'

export interface Balance {
  userId: string
  // > 0  => the group owes this person (they are owed)
  // < 0  => this person owes the group
  net: number
}

export interface Debt {
  from: string // debtor
  to: string // creditor
  amount: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Compute each member's net balance from expenses (with splits) and settlements.
 */
export function computeBalances(
  memberIds: string[],
  expenses: Expense[],
  settlements: Settlement[]
): Map<string, number> {
  const net = new Map<string, number>()
  for (const id of memberIds) net.set(id, 0)

  const add = (id: string, delta: number) => net.set(id, (net.get(id) ?? 0) + delta)

  for (const exp of expenses) {
    add(exp.paid_by, Number(exp.amount))
    for (const split of exp.splits ?? []) {
      add(split.user_id, -Number(split.amount))
    }
  }

  for (const s of settlements) {
    // payer (from) reduces their debt; receiver (to) reduces what they're owed
    add(s.from_user, Number(s.amount))
    add(s.to_user, -Number(s.amount))
  }

  for (const [id, v] of net) net.set(id, round2(v))
  return net
}

/**
 * Greedy debt simplification: minimal set of "who pays whom" transfers.
 */
export function simplifyDebts(balances: Map<string, number>): Debt[] {
  const creditors: { id: string; amt: number }[] = []
  const debtors: { id: string; amt: number }[] = []

  for (const [id, net] of balances) {
    if (net > 0.005) creditors.push({ id, amt: net })
    else if (net < -0.005) debtors.push({ id, amt: -net })
  }
  creditors.sort((a, b) => b.amt - a.amt)
  debtors.sort((a, b) => b.amt - a.amt)

  const debts: Debt[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = round2(Math.min(debtors[i].amt, creditors[j].amt))
    if (pay > 0) {
      debts.push({ from: debtors[i].id, to: creditors[j].id, amount: pay })
    }
    debtors[i].amt = round2(debtors[i].amt - pay)
    creditors[j].amt = round2(creditors[j].amt - pay)
    if (debtors[i].amt <= 0.005) i++
    if (creditors[j].amt <= 0.005) j++
  }
  return debts
}

/**
 * Split an amount across N participants into equal shares that still sum
 * exactly to the total (distribute leftover cents to the first members).
 */
export function splitEqually(amount: number, count: number): number[] {
  if (count <= 0) return []
  const cents = Math.round(amount * 100)
  const base = Math.floor(cents / count)
  let remainder = cents - base * count
  const shares: number[] = []
  for (let i = 0; i < count; i++) {
    let c = base
    if (remainder > 0) {
      c += 1
      remainder--
    }
    shares.push(c / 100)
  }
  return shares
}

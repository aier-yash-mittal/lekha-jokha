import { supabase } from './supabase'
import type { Expense, Group, GroupMember, Profile, Settlement, SplitType } from './types'

export async function getMyGroups(userId: string): Promise<Group[]> {
  const { data: memberships, error: mErr } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
  if (mErr) throw mErr
  const ids = (memberships ?? []).map((m) => m.group_id)
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle()
  if (error) throw error
  return data
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, profile:profiles(*)')
    .eq('group_id', groupId)
  if (error) throw error
  return (data ?? []) as unknown as GroupMember[]
}

export async function getGroupExpenses(groupId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, splits:expense_splits(*)')
    .eq('group_id', groupId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Expense[]
}

export async function getGroupSettlements(groupId: string): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createGroup(input: {
  name: string
  description?: string
  emoji?: string
  createdBy: string
}): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .insert({
      name: input.name,
      description: input.description ?? null,
      emoji: input.emoji ?? '🧾',
      created_by: input.createdBy
    })
    .select('*')
    .single()
  if (error) throw error
  // creator joins automatically
  const { error: memErr } = await supabase
    .from('group_members')
    .insert({ group_id: data.id, user_id: input.createdBy })
  if (memErr) throw memErr
  return data
}

export async function findProfileByEmail(email: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', email.trim())
    .maybeSingle()
  if (error) throw error
  return data
}

export async function addMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId })
  if (error) throw error
}

export async function removeMember(memberRowId: string): Promise<void> {
  const { error } = await supabase.from('group_members').delete().eq('id', memberRowId)
  if (error) throw error
}

export async function createExpense(input: {
  groupId: string
  description: string
  amount: number
  currency: string
  category?: string
  paidBy: string
  splitType: SplitType
  expenseDate: string
  createdBy: string
  splits: { userId: string; amount: number }[]
}): Promise<void> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      group_id: input.groupId,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      category: input.category ?? 'general',
      paid_by: input.paidBy,
      split_type: input.splitType,
      expense_date: input.expenseDate,
      created_by: input.createdBy
    })
    .select('id')
    .single()
  if (error) throw error

  const rows = input.splits
    .filter((s) => s.amount > 0)
    .map((s) => ({ expense_id: data.id, user_id: s.userId, amount: s.amount }))
  if (rows.length > 0) {
    const { error: splitErr } = await supabase.from('expense_splits').insert(rows)
    if (splitErr) throw splitErr
  }
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
  if (error) throw error
}

export async function createSettlement(input: {
  groupId: string
  fromUser: string
  toUser: string
  amount: number
  note?: string
}): Promise<void> {
  const { error } = await supabase.from('settlements').insert({
    group_id: input.groupId,
    from_user: input.fromUser,
    to_user: input.toUser,
    amount: input.amount,
    note: input.note ?? null
  })
  if (error) throw error
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId)
  if (error) throw error
}

export async function updateProfile(userId: string, fields: { full_name?: string; upi_id?: string }): Promise<void> {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId)
  if (error) throw error
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  upi_id?: string | null
  dob?: string | null
  created_at: string
}

export interface Group {
  id: string
  name: string
  description: string | null
  emoji: string | null
  created_by: string
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  joined_at: string
  profile?: Profile
}

export type SplitType = 'equal' | 'exact' | 'percentage'

export interface ExpenseSplit {
  id: string
  expense_id: string
  user_id: string
  amount: number
}

export interface Expense {
  id: string
  group_id: string
  description: string
  amount: number
  currency: string
  category: string | null
  paid_by: string
  split_type: SplitType
  expense_date: string
  bill_url?: string | null
  created_by: string
  created_at: string
  splits?: ExpenseSplit[]
}

export interface Settlement {
  id: string
  group_id: string
  from_user: string
  to_user: string
  amount: number
  note: string | null
  created_at: string
}

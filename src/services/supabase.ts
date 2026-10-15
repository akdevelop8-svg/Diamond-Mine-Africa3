import { createClient, type User } from '@supabase/supabase-js';
import type { UserProfile, UserRole, UserStatus } from '../types.ts';

const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const publishableKey = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
).trim();

export const isSupabaseConfigured = Boolean(url && publishableKey);
export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export interface DmaProfileRow {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  role: string | null;
  status: string | null;
  account_badge: string | null;
  referral_code: string;
  referred_by: string | null;
  demo_balance: number | string | null;
  total_recharged_demo: number | string | null;
  total_withdrawn_demo: number | string | null;
  has_completed_rules: boolean | null;
  created_at: string;
}

export function profileRowToUser(row: DmaProfileRow): UserProfile {
  const role: UserRole = row.role === 'admin' ? 'admin' : 'user';
  const validStatuses: UserStatus[] = ['active', 'suspended', 'warned'];
  const status: UserStatus = validStatuses.includes(row.status as UserStatus)
    ? (row.status as UserStatus)
    : 'active';
  return {
    id: row.id,
    name: row.name || 'Diamond Mine Member',
    phone: row.phone,
    role,
    accountBadge: row.account_badge || 'Standard Member',
    status,
    referralCode: row.referral_code,
    referredBy: row.referred_by ?? undefined,
    createdAt: row.created_at,
    // Never hydrate balances from profile demo columns; the trusted ledger RPC below is authoritative.
    demoBalance: 0,
    totalRechargedDemo: 0,
    totalWithdrawnDemo: 0,
    hasCompletedRules: Boolean(row.has_completed_rules),
  };
}

export async function fetchDmaProfile(user: User): Promise<UserProfile> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase
    .from('profiles')
    .select('id,user_id,name,phone,role,status,account_badge,referral_code,referred_by,demo_balance,total_recharged_demo,total_withdrawn_demo,has_completed_rules,created_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Your profile was not found. Confirm the database profile trigger was installed successfully.');
  const profile = profileRowToUser(data as DmaProfileRow);
  // Wallet balance is read from the server-side ledger foundation when its migration is installed.
  // Fall back to zero while running an older staging schema; never read a client-controlled balance.
  try {
    const { data: balance, error: balanceError } = await supabase.rpc('dma_wallet_balance');
    if (!balanceError && balance !== null && balance !== undefined) profile.demoBalance = Number(balance) || 0;
  } catch {
    profile.demoBalance = 0;
  }
  return profile;
}

export function normalizeEthiopianPhone(input: string): string {
  const compact = input.trim().replace(/[\s().-]/g, '');
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('00')) return `+${compact.slice(2)}`;
  if (compact.startsWith('251')) return `+${compact}`;
  if (/^0[79]\d{8}$/.test(compact)) return `+251${compact.slice(1)}`;
  if (/^[79]\d{8}$/.test(compact)) return `+251${compact}`;
  return compact;
}

/** Basic Ethiopian mobile-number validation after normalization. */
export function isValidEthiopianPhone(input: string): boolean {
  return /^\+251[79]\d{8}$/.test(normalizeEthiopianPhone(input));
}

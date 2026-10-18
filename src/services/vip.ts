import type { ClaimHistoryItem, UserOwnedProduct, VipProduct } from '../types.ts';
import { VIP_PRODUCTS } from '../data/constants.ts';
import { store } from './store.ts';
import { supabase } from './supabase.ts';

type ProductRow = {
  id: string;
  tier: number | string;
  name: string;
  price: number | string;
  daily_return: number | string;
  period_days: number | string | null;
  illustrative_total: number | string | null;
  cut_name: string | null;
  carat_equivalent: string | null;
  color_grade: string | null;
  clarity_grade: string | null;
  description: string | null;
  is_one_time: boolean | null;
  is_available: boolean | null;
};

type OwnedProductRow = {
  id: string;
  profile_id: string;
  product_id: string;
  tier: number | string;
  purchase_price: number | string;
  daily_return: number | string;
  period_days: number | string | null;
  total_claimed_days: number | string | null;
  last_claim_timestamp: string | null;
  status: 'active' | 'expired';
  created_at: string;
};

type ClaimRow = {
  id: string;
  profile_id: string;
  user_product_id: string;
  tier: number | string;
  amount: number | string;
  claimed_at: string;
};

function asNumber(value: number | string | null | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapProductRow(row: ProductRow, fallback: VipProduct): VipProduct {
  return {
    ...fallback,
    id: row.id,
    tier: asNumber(row.tier, fallback.tier),
    name: row.name || fallback.name,
    price: asNumber(row.price, fallback.price),
    dailyReturn: asNumber(row.daily_return, fallback.dailyReturn),
    periodDays: asNumber(row.period_days, fallback.periodDays),
    illustrativeTotal: asNumber(row.illustrative_total, fallback.illustrativeTotal),
    cutName: row.cut_name || fallback.cutName,
    caratEquivalent: row.carat_equivalent || fallback.caratEquivalent,
    colorGrade: row.color_grade || fallback.colorGrade,
    clarityGrade: row.clarity_grade || fallback.clarityGrade,
    description: row.description || fallback.description,
    isOneTime: row.is_one_time ?? fallback.isOneTime,
    isAvailable: row.is_available ?? fallback.isAvailable,
  };
}

function mapOwnedRow(row: OwnedProductRow): UserOwnedProduct {
  const catalogue = VIP_PRODUCTS.find((item) => item.id === row.product_id)
    ?? VIP_PRODUCTS.find((item) => item.tier === asNumber(row.tier));
  return {
    id: row.id,
    userId: row.profile_id,
    productId: row.product_id,
    tier: asNumber(row.tier, catalogue?.tier ?? 1),
    name: catalogue?.name ?? `VIP ${row.tier} Diamond Tier`,
    price: asNumber(row.purchase_price),
    dailyReturn: asNumber(row.daily_return),
    periodDays: asNumber(row.period_days, 365),
    purchaseDate: row.created_at,
    totalClaimedDays: asNumber(row.total_claimed_days),
    lastClaimTimestamp: row.last_claim_timestamp ?? undefined,
    status: row.status === 'expired' ? 'expired' : 'active',
    image: catalogue?.image,
  };
}

function mapClaimRow(row: ClaimRow): ClaimHistoryItem {
  return {
    id: row.id,
    userId: row.profile_id,
    userProductId: row.user_product_id,
    tier: asNumber(row.tier),
    amount: asNumber(row.amount),
    claimedAt: row.claimed_at,
  };
}

/** Load the product catalogue, member-owned products, claim history and trusted wallet balance. */
export async function refreshServerVipData(profileId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const [catalogueResult, ownedResult, claimsResult] = await Promise.all([
    supabase
      .from('products')
      .select('id,tier,name,price,daily_return,period_days,illustrative_total,cut_name,carat_equivalent,color_grade,clarity_grade,description,is_one_time,is_available')
      .order('tier', { ascending: true }),
    supabase
      .from('user_owned_products')
      .select('id,profile_id,product_id,tier,purchase_price,daily_return,period_days,total_claimed_days,last_claim_timestamp,status,created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false }),
    supabase
      .from('claim_history')
      .select('id,profile_id,user_product_id,tier,amount,claimed_at')
      .eq('profile_id', profileId)
      .order('claimed_at', { ascending: false }),
  ]);

  if (catalogueResult.error) throw catalogueResult.error;
  if (ownedResult.error) throw ownedResult.error;
  if (claimsResult.error) throw claimsResult.error;

  const catalogueRows = (catalogueResult.data ?? []) as ProductRow[];
  const catalogueById = new Map<string, ProductRow>(catalogueRows.map((row): [string, ProductRow] => [row.id, row]));
  const catalogueByTier = new Map<number, ProductRow>(catalogueRows.map((row): [number, ProductRow] => [asNumber(row.tier), row]));
  const products = VIP_PRODUCTS.map((fallback) => {
    const row = catalogueById.get(fallback.id) ?? catalogueByTier.get(fallback.tier);
    return row ? mapProductRow(row, fallback) : fallback;
  });
  store.setServerProducts(products);
  store.setServerVipData(
    profileId,
    ((ownedResult.data ?? []) as OwnedProductRow[]).map(mapOwnedRow),
    ((claimsResult.data ?? []) as ClaimRow[]).map(mapClaimRow),
  );

  // Do not fail a purchase/claim refresh only because the optional balance refresh failed.
  const { data: balance, error: balanceError } = await supabase.rpc('dma_wallet_balance');
  if (!balanceError && balance !== null && balance !== undefined) {
    store.updateServerWalletBalance(asNumber(balance));
  }
}

export async function purchaseVipProduct(productId: string): Promise<{
  price: number;
  walletBalance: number;
  message: string;
}> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('dma_purchase_vip_product', { p_product_id: productId });
  if (error) throw new Error(error.message || 'VIP purchase failed.');

  const result = data as { success?: boolean; price?: number | string; wallet_balance?: number | string; message?: string } | null;
  if (!result?.success) throw new Error(result?.message || 'VIP purchase was not completed.');
  return {
    price: asNumber(result.price),
    walletBalance: asNumber(result.wallet_balance),
    message: result.message || 'VIP purchase completed successfully.',
  };
}

export async function claimDailyMiningReward(userOwnedProductId: string): Promise<{
  reward: number;
  walletBalance: number;
  message: string;
}> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('dma_claim_daily_mining_reward', {
    p_user_product_id: userOwnedProductId,
  });
  if (error) throw new Error(error.message || 'Daily mining claim failed.');

  const result = data as { success?: boolean; reward?: number | string; wallet_balance?: number | string; message?: string } | null;
  if (!result?.success) throw new Error(result?.message || 'Daily mining claim was not completed.');
  return {
    reward: asNumber(result.reward),
    walletBalance: asNumber(result.wallet_balance),
    message: result.message || 'Daily mining reward credited.',
  };
}

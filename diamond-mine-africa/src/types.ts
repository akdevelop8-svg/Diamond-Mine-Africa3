export type UserRole = 'user' | 'admin';

export type WithdrawalMethod = 'CBE' | 'Telebirr' | 'Awash Bank' | 'Bank of Abyssinia';

export interface SavedWithdrawalDetails {
  method: WithdrawalMethod;
  accountName: string;
  accountNumber: string;
  updatedAt: string;
}

export type UserStatus = 'active' | 'suspended' | 'warned';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  passwordHash?: string;
  role: UserRole;
  accountBadge: string;
  status: UserStatus;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
  demoBalance: number;
  totalWithdrawnDemo: number;
  totalRechargedDemo: number;
  hasCompletedRules: boolean;
  internalNote?: string;
  warnings?: AccountWarning[];
  /** Demonstration-only: localStorage is not suitable for live banking data. */
  withdrawalDetails?: SavedWithdrawalDetails;
}

export interface AccountWarning {
  id: string;
  userId: string;
  reason: string;
  timestamp: string;
  issuedBy: string;
}

export interface VipProduct {
  id: string;
  tier: number;
  name: string;
  price: number;
  dailyReturn: number;
  periodDays: number;
  illustrativeTotal: number;
  description: string;
  cutName: string;
  caratEquivalent: string;
  colorGrade: string;
  clarityGrade: string;
  isOneTime: boolean;
  isAvailable: boolean;
  gemstoneColor: string;
  image?: string;
}

export interface UserOwnedProduct {
  id: string;
  userId: string;
  productId: string;
  tier: number;
  name: string;
  price: number;
  dailyReturn: number;
  periodDays: number;
  purchaseDate: string;
  totalClaimedDays: number;
  lastClaimTimestamp?: string;
  status: 'active' | 'expired';
  image?: string;
}

export interface ClaimHistoryItem {
  id: string;
  userId: string;
  userProductId: string;
  tier: number;
  amount: number;
  claimedAt: string;
}

export interface DailyCheckInRecord {
  userId: string;
  dateStr: string; // YYYY-MM-DD
  amount: number;
  claimedAt: string;
}

export interface PlatformTask {
  id: string;
  title: string;
  description: string;
  rewardETB: number;
  category: 'channel' | 'catalogue' | 'invite' | 'unallocated';
  isAvailable: boolean;
  actionLabel: string;
  actionType: 'external_link' | 'view_catalogue' | 'share_invite' | 'unassigned';
  targetUrl?: string;
}

export interface UserTaskCompletion {
  id: string;
  userId: string;
  taskId: string;
  isCompleted: boolean;
  isClaimed: boolean;
  completedAt?: string;
  claimedAt?: string;
}

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'pending_verification'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export interface RechargeRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  provider: string;
  txReference: string;
  evidenceFileName?: string;
  status: RequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  paymentConfigVersion: number;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  fee: number;
  netAmount: number;
  method: WithdrawalMethod;
  accountName: string;
  accountNumber: string;
  status: RequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface BusinessPaymentConfig {
  id: string;
  provider: string;
  accountHolder: string;
  accountNumber: string;
  instructions: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
}

export interface TeamRewardTierConfig {
  id: string;
  minRecharge: number;
  maxRecharge: number;
  rewardETB: number;
  label: string;
}

export interface CommissionRateConfig {
  level1Percent: number; // 10%
  level2Percent: number; // 3%
  level3Percent: number; // 2%
  level4Percent: number; // 1%
}

export interface ManagerRewardConfig {
  amount: number; // 25,000 ETB
  criteria: string;
  period: string;
  status: 'Active' | 'Under Review' | 'Configured';
  lastModified: string;
  modifiedBy: string;
  reviewHistory: Array<{
    date: string;
    note: string;
    reviewedBy: string;
  }>;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  category: 'question' | 'ideas' | 'feedback' | 'complaints' | 'payment' | 'product' | 'technical';
  message: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Rejected';
  adminResponse?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  relatedRequestId?: string;
}

export interface AuditLogItem {
  id: string;
  adminId: string;
  adminName: string;
  actionType: string;
  details: string;
  timestamp: string;
  reason?: string;
}

import {
  UserProfile,
  VipProduct,
  UserOwnedProduct,
  ClaimHistoryItem,
  DailyCheckInRecord,
  PlatformTask,
  UserTaskCompletion,
  RechargeRequest,
  WithdrawalRequest,
  BusinessPaymentConfig,
  TeamRewardTierConfig,
  CommissionRateConfig,
  ManagerRewardConfig,
  SupportTicket,
  InAppNotification,
  AuditLogItem,
  AccountWarning,
  RequestStatus,
  SavedWithdrawalDetails,
  WithdrawalMethod,
} from '../types.ts';
import {
  VIP_PRODUCTS,
  PLATFORM_TASKS,
  TEAM_RECHARGE_REWARDS,
  COMMISSION_RATES,
  INITIAL_PAYMENT_CONFIG,
  INITIAL_MANAGER_REWARD,
} from '../data/constants.ts';
import { isSupabaseConfigured } from './supabase.ts';

// v3 intentionally starts with no active session so the seeded customer is never auto-logged-in.
const STORAGE_KEY = 'dma_app_state_v3';

export interface AppState {
  currentUser: UserProfile | null;
  allUsers: UserProfile[];
  products: VipProduct[];
  userOwnedProducts: UserOwnedProduct[];
  claimHistory: ClaimHistoryItem[];
  dailyCheckIns: DailyCheckInRecord[];
  taskCompletions: UserTaskCompletion[];
  rechargeRequests: RechargeRequest[];
  withdrawalRequests: WithdrawalRequest[];
  paymentConfig: BusinessPaymentConfig;
  paymentConfigHistory: BusinessPaymentConfig[];
  teamRewards: TeamRewardTierConfig[];
  commissionRates: CommissionRateConfig;
  managerReward: ManagerRewardConfig;
  supportTickets: SupportTicket[];
  notifications: InAppNotification[];
  auditLogs: AuditLogItem[];
}

const SEED_USERS: UserProfile[] = [
  {
    id: 'USR-748921',
    name: 'Abebe Bekele',
    phone: '+251911234567',
    passwordHash: 'Password123!',
    role: 'user',
    accountBadge: 'VIP 1 Miner',
    status: 'active',
    referralCode: 'DMA-882190',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    demoBalance: 1540,
    totalWithdrawnDemo: 0,
    totalRechargedDemo: 2000,
    hasCompletedRules: true,
    internalNote: 'Pioneer community test user with 4-level team.',
  },
  {
    id: 'ADM-000001',
    name: 'DIAMOND MINE AFRICA',
    phone: '+251900000000',
    passwordHash: 'diamond mine Africa 1421$$$',
    role: 'admin',
    accountBadge: 'System Executive',
    status: 'active',
    referralCode: 'DMA-OFFICIAL',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    demoBalance: 0,
    totalWithdrawnDemo: 0,
    totalRechargedDemo: 0,
    hasCompletedRules: true,
    internalNote: 'Official Master Administrator for Diamond Mine Africa.',
  },
  // Level 1 Referrals of Abebe (USR-748921)
  {
    id: 'USR-810921',
    name: 'Tigist Haile',
    phone: '+251922345678',
    passwordHash: 'Password123!',
    role: 'user',
    accountBadge: 'VIP 2 Miner',
    status: 'active',
    referralCode: 'DMA-331201',
    referredBy: 'USR-748921',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    demoBalance: 500,
    totalWithdrawnDemo: 0,
    totalRechargedDemo: 500,
    hasCompletedRules: true,
  },
  {
    id: 'USR-810922',
    name: 'Dawit Tadesse',
    phone: '+251933456789',
    passwordHash: 'Password123!',
    role: 'user',
    accountBadge: 'VIP 1 Miner',
    status: 'active',
    referralCode: 'DMA-442302',
    referredBy: 'USR-748921',
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    demoBalance: 200,
    totalWithdrawnDemo: 0,
    totalRechargedDemo: 300,
    hasCompletedRules: true,
  },
  {
    id: 'USR-810923',
    name: 'Almaz Kebede',
    phone: '+251944567890',
    passwordHash: 'Password123!',
    role: 'user',
    accountBadge: 'Standard Member',
    status: 'active',
    referralCode: 'DMA-553403',
    referredBy: 'USR-748921',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    demoBalance: 0,
    totalWithdrawnDemo: 0,
    totalRechargedDemo: 0,
    hasCompletedRules: true,
  },
  // Level 2 Referrals (invited by Tigist USR-810921 or Dawit USR-810922)
  {
    id: 'USR-820101',
    name: 'Yonas Mengistu',
    phone: '+251955678901',
    passwordHash: 'Password123!',
    role: 'user',
    accountBadge: 'VIP 3 Miner',
    status: 'active',
    referralCode: 'DMA-664504',
    referredBy: 'USR-810921',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    demoBalance: 300,
    totalWithdrawnDemo: 0,
    totalRechargedDemo: 1000,
    hasCompletedRules: true,
  },
  {
    id: 'USR-820102',
    name: 'Helen Berhanu',
    phone: '+251966789012',
    passwordHash: 'Password123!',
    role: 'user',
    accountBadge: 'Standard Member',
    status: 'active',
    referralCode: 'DMA-775605',
    referredBy: 'USR-810922',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    demoBalance: 0,
    totalWithdrawnDemo: 0,
    totalRechargedDemo: 0,
    hasCompletedRules: true,
  },
  // Level 3 Referral (invited by Yonas USR-820101)
  {
    id: 'USR-830201',
    name: 'Kassahun Fikre',
    phone: '+251977890123',
    passwordHash: 'Password123!',
    role: 'user',
    accountBadge: 'VIP 4 Miner',
    status: 'active',
    referralCode: 'DMA-886706',
    referredBy: 'USR-820101',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    demoBalance: 1200,
    totalWithdrawnDemo: 0,
    totalRechargedDemo: 3000,
    hasCompletedRules: true,
  },
  // Level 4 Referral (invited by Kassahun USR-830201)
  {
    id: 'USR-840301',
    name: 'Selamawit Girma',
    phone: '+251988901234',
    passwordHash: 'Password123!',
    role: 'user',
    accountBadge: 'VIP 1 Miner',
    status: 'active',
    referralCode: 'DMA-997807',
    referredBy: 'USR-830201',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    demoBalance: 100,
    totalWithdrawnDemo: 0,
    totalRechargedDemo: 300,
    hasCompletedRules: true,
  },
];

const SEED_OWNED_PRODUCTS: UserOwnedProduct[] = [
  {
    id: 'uop-001',
    userId: 'USR-748921',
    productId: 'vip-1',
    tier: 1,
    name: 'VIP 1 Diamond Tier',
    price: 300,
    dailyReturn: 30,
    periodDays: 365,
    purchaseDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    totalClaimedDays: 2,
    lastClaimTimestamp: new Date(Date.now() - 86400000 * 1.2).toISOString(), // ~29 hours ago, eligible to claim!
    status: 'active',
  },
  {
    id: 'uop-002',
    userId: 'USR-810921',
    productId: 'vip-2',
    tier: 2,
    name: 'VIP 2 Diamond Tier',
    price: 500,
    dailyReturn: 50,
    periodDays: 365,
    purchaseDate: new Date(Date.now() - 86400000 * 9).toISOString(),
    totalClaimedDays: 8,
    status: 'active',
  },
  {
    id: 'uop-003',
    userId: 'USR-810922',
    productId: 'vip-1',
    tier: 1,
    name: 'VIP 1 Diamond Tier',
    price: 300,
    dailyReturn: 30,
    periodDays: 365,
    purchaseDate: new Date(Date.now() - 86400000 * 7).toISOString(),
    totalClaimedDays: 6,
    status: 'active',
  },
  {
    id: 'uop-004',
    userId: 'USR-820101',
    productId: 'vip-3',
    tier: 3,
    name: 'VIP 3 Diamond Tier',
    price: 1000,
    dailyReturn: 70,
    periodDays: 365,
    purchaseDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    totalClaimedDays: 4,
    status: 'active',
  },
  {
    id: 'uop-005',
    userId: 'USR-830201',
    productId: 'vip-4',
    tier: 4,
    name: 'VIP 4 Diamond Tier',
    price: 3000,
    dailyReturn: 225,
    periodDays: 365,
    purchaseDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    totalClaimedDays: 2,
    status: 'active',
  },
  {
    id: 'uop-006',
    userId: 'USR-840301',
    productId: 'vip-1',
    tier: 1,
    name: 'VIP 1 Diamond Tier',
    price: 300,
    dailyReturn: 30,
    periodDays: 365,
    purchaseDate: new Date(Date.now() - 86400000 * 1).toISOString(),
    totalClaimedDays: 1,
    status: 'active',
  },
];

const SEED_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'notif-1',
    userId: 'USR-748921',
    title: 'Welcome to Diamond Mine Africa',
    message: 'Welcome Abebe Bekele! Your account has been provisioned in the demonstration environment. Review platform rules and start exploring.',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    read: true,
  },
  {
    id: 'notif-2',
    userId: 'USR-748921',
    title: 'Referral Team Member Registered',
    message: 'Tigist Haile registered using your personal referral code (DMA-882190).',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    read: true,
  },
  {
    id: 'notif-3',
    userId: 'USR-748921',
    title: 'Referral Qualifying Order Verified',
    message: 'Tigist Haile activated VIP 2 Diamond Tier. Your Level 1 qualifying team order is recorded in the demonstration dashboard.',
    createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
    read: false,
  },
];

const SEED_RECHARGES: RechargeRequest[] = [
  {
    id: 'RCH-100841',
    userId: 'USR-748921',
    userName: 'Abebe Bekele',
    userPhone: '+251911234567',
    amount: 1000,
    provider: 'Commercial Bank of Ethiopia (CBE)',
    txReference: 'CBE-FT261011982',
    evidenceFileName: 'cbe_slip_oct11.png',
    status: 'approved',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    reviewedAt: new Date(Date.now() - 86400000 * 2.8).toISOString(),
    reviewedBy: 'DIAMOND MINE AFRICA',
    paymentConfigVersion: 1,
  },
  {
    id: 'RCH-100892',
    userId: 'USR-810921',
    userName: 'Tigist Haile',
    userPhone: '+251922345678',
    amount: 500,
    provider: 'Commercial Bank of Ethiopia (CBE)',
    txReference: 'CBE-FT261012391',
    status: 'pending_verification',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    paymentConfigVersion: 1,
  },
];

const SEED_WITHDRAWALS: WithdrawalRequest[] = [
  {
    id: 'WTH-900214',
    userId: 'USR-830201',
    userName: 'Kassahun Fikre',
    userPhone: '+251977890123',
    amount: 500,
    fee: 40,
    netAmount: 460,
    method: 'Telebirr',
    accountName: 'Kassahun Fikre',
    accountNumber: '+251977890123',
    status: 'pending_verification',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

const SEED_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud-001',
    adminId: 'ADM-000001',
    adminName: 'DIAMOND MINE AFRICA',
    actionType: 'BOOTSTRAP',
    details: 'Initial demonstration environment provisioned with 10 VIP tiers, 4-tier commission architecture, and CBE payment settings.',
    timestamp: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    id: 'aud-002',
    adminId: 'ADM-000001',
    adminName: 'DIAMOND MINE AFRICA',
    actionType: 'RECHARGE_APPROVAL',
    details: 'Demonstration recharge RCH-100841 approved for Abebe Bekele (1,000 ETB).',
    timestamp: new Date(Date.now() - 86400000 * 2.8).toISOString(),
  },
];

const SEED_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'TCK-501',
    userId: 'USR-810922',
    userName: 'Dawit Tadesse',
    userPhone: '+251933456789',
    category: 'product',
    message: 'Hello, what are the criteria for qualifying to the 25,000 ETB regional manager reward?',
    status: 'In Progress',
    adminResponse: 'Greetings Dawit. The manager reward requires team order volume over 500,000 ETB and 25 active qualifying VIP members under administrative review.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

function getInitialState(): AppState {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Validate essentials
        if (parsed.allUsers && parsed.paymentConfig) {
          return {
            ...parsed,
            // A cached UI profile is not an authentication session. Always start signed out;
            // Supabase Auth restores a real session from supabase-js, or demo users sign in explicitly.
            currentUser: null,
            products: VIP_PRODUCTS,
          };
        }
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved state, seeding defaults', e);
  }

  // Seed demo data for exploration, but always require an explicit sign-in on first visit.
  return {
    currentUser: null,
    allUsers: SEED_USERS,
    products: VIP_PRODUCTS,
    userOwnedProducts: SEED_OWNED_PRODUCTS,
    claimHistory: [
      {
        id: 'clm-001',
        userId: 'USR-748921',
        userProductId: 'uop-001',
        tier: 1,
        amount: 30,
        claimedAt: new Date(Date.now() - 86400000 * 2.2).toISOString(),
      },
      {
        id: 'clm-002',
        userId: 'USR-748921',
        userProductId: 'uop-001',
        tier: 1,
        amount: 30,
        claimedAt: new Date(Date.now() - 86400000 * 1.2).toISOString(),
      },
    ],
    dailyCheckIns: [
      {
        userId: 'USR-748921',
        dateStr: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        amount: 1,
        claimedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    taskCompletions: [
      {
        id: 'tc-001',
        userId: 'USR-748921',
        taskId: 'task-1',
        isCompleted: true,
        isClaimed: true,
        completedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        claimedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      },
    ],
    rechargeRequests: SEED_RECHARGES,
    withdrawalRequests: SEED_WITHDRAWALS,
    paymentConfig: INITIAL_PAYMENT_CONFIG,
    paymentConfigHistory: [INITIAL_PAYMENT_CONFIG],
    teamRewards: TEAM_RECHARGE_REWARDS,
    commissionRates: COMMISSION_RATES,
    managerReward: INITIAL_MANAGER_REWARD,
    supportTickets: SEED_SUPPORT_TICKETS,
    notifications: SEED_NOTIFICATIONS,
    auditLogs: SEED_AUDIT_LOGS,
  };
}

class StoreService {
  private state: AppState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = getInitialState();

    // Demo-only convenience: when the admin edits payment details in another tab of
    // this same browser/origin, refresh the customer-facing payment config. This is
    // not cross-device or multi-user storage; a shared backend is required for that.
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key !== STORAGE_KEY || !event.newValue) return;
        try {
          const incoming = JSON.parse(event.newValue);
          if (!incoming?.paymentConfig || typeof incoming.paymentConfig.version !== 'number') return;
          if (incoming.paymentConfig.version <= this.state.paymentConfig.version) return;
          this.state = {
            ...this.state,
            paymentConfig: incoming.paymentConfig,
            paymentConfigHistory: Array.isArray(incoming.paymentConfigHistory)
              ? incoming.paymentConfigHistory
              : this.state.paymentConfigHistory,
          };
          // Notify listeners only; do not write the just-received value back to storage.
          this.listeners.forEach((listener) => listener());
        } catch (error) {
          console.warn('Could not sync demo payment settings from another tab:', error);
        }
      });
    }
  }

  public getState(): AppState {
    return this.state;
  }

  /** Hydrates the UI from a Supabase Auth profile. Financial mutations stay server-owned. */
  public setAuthenticatedUser(user: UserProfile) {
    const withoutCurrent = this.state.allUsers.filter((existing) => existing.id !== user.id);
    this.state = {
      ...this.state,
      currentUser: user,
      allUsers: [...withoutCurrent, user],
    };
    this.notify();
  }

  /** Update only the displayed balance from the trusted wallet-balance RPC result. */
  public updateServerWalletBalance(balance: number) {
    if (!Number.isFinite(balance) || balance < 0 || !this.state.currentUser) return;
    const updatedUser = { ...this.state.currentUser, demoBalance: balance };
    this.state = {
      ...this.state,
      currentUser: updatedUser,
      allUsers: this.state.allUsers.map((user) => user.id === updatedUser.id ? updatedUser : user),
    };
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // In Supabase-backed mode, the database is the source of truth for payout details.
        // Never persist bank/mobile-money account numbers in browser localStorage.
        const stripWithdrawalDetails = (user: UserProfile): UserProfile => {
          const safeUser = { ...user };
          delete safeUser.withdrawalDetails;
          return safeUser;
        };
        const persistableState = isSupabaseConfigured
          ? {
              ...this.state,
              currentUser: this.state.currentUser ? stripWithdrawalDetails(this.state.currentUser) : null,
              allUsers: this.state.allUsers.map(stripWithdrawalDetails),
            }
          : this.state;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistableState));
      }
    } catch (e) {
      console.warn('Could not persist to localStorage:', e);
    }
    this.listeners.forEach((fn) => fn());
  }

  // Authentication & Registration
  public register(payload: {
    name: string;
    phone: string;
    password: string;
    confirmPassword: string;
    inviteCode?: string;
  }): { success: boolean; message: string; user?: UserProfile } {
    const { name, phone, password, confirmPassword, inviteCode } = payload;

    if (!name.trim()) return { success: false, message: 'Please enter your full name.' };
    if (!phone.trim()) return { success: false, message: 'Please enter your phone number.' };
    if (password.length < 6) return { success: false, message: 'Password must be at least 6 characters.' };
    if (password !== confirmPassword) return { success: false, message: 'Passwords do not match.' };

    const cleanPhone = phone.trim();
    const existing = this.state.allUsers.find((u) => u.phone === cleanPhone);
    if (existing) {
      return { success: false, message: 'An account with this phone number already exists.' };
    }

    // Referral lookup
    let inviter: UserProfile | undefined;
    if (inviteCode && inviteCode.trim()) {
      const code = inviteCode.trim().toUpperCase();
      inviter = this.state.allUsers.find(
        (u) => u.referralCode.toUpperCase() === code || u.id.toUpperCase() === code
      );
      if (!inviter) {
        return { success: false, message: 'Invalid or expired invitation code.' };
      }
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const newId = `USR-${randomSuffix}`;
    const newReferralCode = `DMA-${randomSuffix}`;

    const newUser: UserProfile = {
      id: newId,
      name: name.trim(),
      phone: cleanPhone,
      passwordHash: password,
      role: 'user',
      accountBadge: 'Standard Member',
      status: 'active',
      referralCode: newReferralCode,
      referredBy: inviter?.id,
      createdAt: new Date().toISOString(),
      demoBalance: 0,
      totalWithdrawnDemo: 0,
      totalRechargedDemo: 0,
      hasCompletedRules: false, // Must see Introduction / Rules page first!
    };

    const welcomeNotification: InAppNotification = {
      id: `notif-${Date.now()}`,
      userId: newUser.id,
      title: 'Welcome to Diamond Mine Africa',
      message: 'Account created successfully! Read the platform introduction rules to begin.',
      createdAt: new Date().toISOString(),
      read: false,
    };

    const newNotifications = [...this.state.notifications, welcomeNotification];

    // Notify inviter if exists
    if (inviter) {
      newNotifications.push({
        id: `notif-${Date.now() + 1}`,
        userId: inviter.id,
        title: 'New Team Member Registered',
        message: `${newUser.name} just registered using your referral invitation link!`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    this.state = {
      ...this.state,
      currentUser: newUser,
      allUsers: [...this.state.allUsers, newUser],
      notifications: newNotifications,
    };

    this.notify();
    return { success: true, message: 'Registration successful!', user: newUser };
  }

  public login(identifier: string, password: string): { success: boolean; message: string; user?: UserProfile } {
    const clean = identifier.trim().toLowerCase();
    const user = this.state.allUsers.find(
      (u) =>
        u.phone.toLowerCase() === clean ||
        u.name.toLowerCase() === clean ||
        u.id.toLowerCase() === clean
    );

    if (!user) {
      return { success: false, message: 'Account not found. Please check your credentials or register.' };
    }

    if (user.passwordHash && user.passwordHash !== password) {
      return { success: false, message: 'Incorrect password entered.' };
    }

    if (user.status === 'suspended') {
      return {
        success: false,
        message: 'This account has been suspended by administration. Contact customer support.',
      };
    }

    this.state = {
      ...this.state,
      currentUser: user,
    };
    this.notify();
    return { success: true, message: 'Logged in successfully.', user };
  }

  public logout() {
    this.state = {
      ...this.state,
      currentUser: null,
    };
    this.notify();
  }

  public switchUser(userId: string) {
    const found = this.state.allUsers.find((u) => u.id === userId);
    if (found) {
      this.state = {
        ...this.state,
        currentUser: found,
      };
      this.notify();
    }
  }

  public markRulesAccepted(userId: string) {
    this.state = {
      ...this.state,
      allUsers: this.state.allUsers.map((u) => (u.id === userId ? { ...u, hasCompletedRules: true } : u)),
      currentUser:
        this.state.currentUser?.id === userId
          ? { ...this.state.currentUser, hasCompletedRules: true }
          : this.state.currentUser,
    };
    this.notify();
  }

  // Daily Check-In (1 ETB demo reward, strictly 1 claim per day)
  public dailyCheckIn(userId: string): { success: boolean; message: string; reward?: number } {
    const today = new Date().toISOString().split('T')[0];
    const already = this.state.dailyCheckIns.find((c) => c.userId === userId && c.dateStr === today);

    if (already) {
      return {
        success: false,
        message: 'You have already claimed today’s check-in reward. Next claim available tomorrow.',
      };
    }

    const newRecord: DailyCheckInRecord = {
      userId,
      dateStr: today,
      amount: 1, // 1 ETB configured demo reward
      claimedAt: new Date().toISOString(),
    };

    const updatedUser = this.state.allUsers.find((u) => u.id === userId);
    if (!updatedUser) return { success: false, message: 'User not found.' };

    const newBalance = (updatedUser.demoBalance || 0) + 1;

    this.state = {
      ...this.state,
      dailyCheckIns: [...this.state.dailyCheckIns, newRecord],
      allUsers: this.state.allUsers.map((u) => (u.id === userId ? { ...u, demoBalance: newBalance } : u)),
      currentUser:
        this.state.currentUser?.id === userId
          ? { ...this.state.currentUser, demoBalance: newBalance }
          : this.state.currentUser,
      notifications: [
        ...this.state.notifications,
        {
          id: `notif-${Date.now()}`,
          userId,
          title: 'Daily Check-In Reward Claimed',
          message: 'Received 1 ETB demonstration reward for daily mining attendance.',
          createdAt: new Date().toISOString(),
          read: false,
        },
      ],
    };

    this.notify();
    return { success: true, message: 'Daily check-in completed! +1 ETB demonstration balance added.', reward: 1 };
  }

  // VIP Product Purchase
  public purchaseProduct(userId: string, productId: string): { success: boolean; message: string } {
    const user = this.state.allUsers.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };

    const product = this.state.products.find((p) => p.id === productId);
    if (!product) return { success: false, message: 'Product tier not found.' };
    if (!product.isAvailable) return { success: false, message: 'This VIP tier is currently unavailable.' };

    // Check one-time purchase rule
    if (product.isOneTime) {
      const alreadyOwned = this.state.userOwnedProducts.some(
        (uop) => uop.userId === userId && uop.productId === productId && uop.status === 'active'
      );
      if (alreadyOwned) {
        return {
          success: false,
          message: `${product.name} is a one-time purchase tier and is already active on your account.`,
        };
      }
    }

    // Check demonstration balance
    if (user.demoBalance < product.price) {
      const shortage = product.price - user.demoBalance;
      return {
        success: false,
        message: `Insufficient demonstration balance. You need ${product.price.toLocaleString()} ETB (short by ${shortage.toLocaleString()} ETB). Please submit a demo recharge first.`,
      };
    }

    const newBalance = user.demoBalance - product.price;
    const badgeName = `VIP ${product.tier} Miner`;

    const newOwnedProduct: UserOwnedProduct = {
      id: `uop-${Date.now()}`,
      userId,
      productId: product.id,
      tier: product.tier,
      name: product.name,
      price: product.price,
      dailyReturn: product.dailyReturn,
      periodDays: product.periodDays,
      purchaseDate: new Date().toISOString(),
      totalClaimedDays: 0,
      status: 'active',
    };

    const newNotifications: InAppNotification[] = [
      ...this.state.notifications,
      {
        id: `notif-${Date.now()}`,
        userId,
        title: `${product.name} Activated`,
        message: `Successfully activated ${product.name} for ${product.price.toLocaleString()} ETB. Daily demonstration mining is now active.`,
        createdAt: new Date().toISOString(),
        read: false,
      },
    ];

    // If referred by someone, notify inviter of qualifying order
    if (user.referredBy) {
      newNotifications.push({
        id: `notif-${Date.now() + 1}`,
        userId: user.referredBy,
        title: 'Team Member Activated VIP Tier',
        message: `${user.name} activated ${product.name} (${product.price.toLocaleString()} ETB). Team order verified!`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    this.state = {
      ...this.state,
      userOwnedProducts: [...this.state.userOwnedProducts, newOwnedProduct],
      allUsers: this.state.allUsers.map((u) =>
        u.id === userId ? { ...u, demoBalance: newBalance, accountBadge: badgeName } : u
      ),
      currentUser:
        this.state.currentUser?.id === userId
          ? { ...this.state.currentUser, demoBalance: newBalance, accountBadge: badgeName }
          : this.state.currentUser,
      notifications: newNotifications,
      auditLogs: [
        ...this.state.auditLogs,
        {
          id: `aud-${Date.now()}`,
          adminId: 'SYSTEM',
          adminName: 'Automated Ledger',
          actionType: 'PRODUCT_PURCHASE',
          details: `User ${user.name} (${user.id}) purchased ${product.name} (${product.price} ETB).`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    this.notify();
    return { success: true, message: `Successfully purchased ${product.name}!` };
  }

  // Daily Earnings Claim (24-hour interval enforcement)
  public claimDailyEarnings(
    userId: string,
    userProductId: string
  ): { success: boolean; message: string; claimedAmount?: number; nextEligibleMs?: number } {
    const user = this.state.allUsers.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };

    const owned = this.state.userOwnedProducts.find(
      (p) => p.id === userProductId && p.userId === userId && p.status === 'active'
    );
    if (!owned) return { success: false, message: 'Active VIP product record not found.' };

    // Enforce 365 days expiration
    if (owned.totalClaimedDays >= owned.periodDays) {
      return { success: false, message: 'This product has completed its 365-day demonstration period.' };
    }

    // 24 hour interval enforcement
    if (owned.lastClaimTimestamp) {
      const lastClaimTime = new Date(owned.lastClaimTimestamp).getTime();
      const now = Date.now();
      const elapsed = now - lastClaimTime;
      const requiredInterval = 24 * 60 * 60 * 1000; // 24 hours

      if (elapsed < requiredInterval) {
        const remainingMs = requiredInterval - elapsed;
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        return {
          success: false,
          message: `Claim cooldown in effect. Next eligible claim in ${hours}h ${minutes}m.`,
          nextEligibleMs: remainingMs,
        };
      }
    }

    const claimAmount = owned.dailyReturn;
    const nowIso = new Date().toISOString();

    const newClaimRecord: ClaimHistoryItem = {
      id: `clm-${Date.now()}`,
      userId,
      userProductId,
      tier: owned.tier,
      amount: claimAmount,
      claimedAt: nowIso,
    };

    const newBalance = user.demoBalance + claimAmount;
    const newTotalDays = owned.totalClaimedDays + 1;
    const newStatus = newTotalDays >= owned.periodDays ? 'expired' : 'active';

    this.state = {
      ...this.state,
      claimHistory: [...this.state.claimHistory, newClaimRecord],
      userOwnedProducts: this.state.userOwnedProducts.map((p) =>
        p.id === userProductId
          ? {
              ...p,
              totalClaimedDays: newTotalDays,
              lastClaimTimestamp: nowIso,
              status: newStatus,
            }
          : p
      ),
      allUsers: this.state.allUsers.map((u) => (u.id === userId ? { ...u, demoBalance: newBalance } : u)),
      currentUser:
        this.state.currentUser?.id === userId
          ? { ...this.state.currentUser, demoBalance: newBalance }
          : this.state.currentUser,
      notifications: [
        ...this.state.notifications,
        {
          id: `notif-${Date.now()}`,
          userId,
          title: `Daily Mining Reward Claimed (+${claimAmount} ETB)`,
          message: `Claimed daily mining return for ${owned.name} (Day ${newTotalDays} of ${owned.periodDays}).`,
          createdAt: nowIso,
          read: false,
        },
      ],
    };

    this.notify();
    return {
      success: true,
      message: `Successfully claimed ${claimAmount} ETB demonstration earnings!`,
      claimedAmount: claimAmount,
    };
  }

  // Recharge workflow
  public submitRechargeRequest(payload: {
    userId: string;
    amount: number;
    txReference: string;
    evidenceFileName?: string;
  }): { success: boolean; message: string; request?: RechargeRequest } {
    const { userId, amount, txReference, evidenceFileName } = payload;
    const user = this.state.allUsers.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };

    if (!amount || amount <= 0) return { success: false, message: 'Invalid recharge amount selected.' };
    if (!txReference.trim()) return { success: false, message: 'Please enter your CBE transaction reference.' };

    const newRequest: RechargeRequest = {
      id: `RCH-${Math.floor(100000 + Math.random() * 900000)}`,
      userId,
      userName: user.name,
      userPhone: user.phone,
      amount,
      provider: this.state.paymentConfig.provider,
      txReference: txReference.trim(),
      evidenceFileName,
      status: 'pending_verification',
      createdAt: new Date().toISOString(),
      paymentConfigVersion: this.state.paymentConfig.version,
    };

    this.state = {
      ...this.state,
      rechargeRequests: [newRequest, ...this.state.rechargeRequests],
      notifications: [
        ...this.state.notifications,
        {
          id: `notif-${Date.now()}`,
          userId,
          title: 'Recharge Request Submitted',
          message: `Your recharge request #${newRequest.id} for ${amount.toLocaleString()} ETB is awaiting administrative review.`,
          createdAt: new Date().toISOString(),
          read: false,
          relatedRequestId: newRequest.id,
        },
      ],
    };

    this.notify();
    return { success: true, message: 'Recharge request submitted successfully!', request: newRequest };
  }

  /** Save the signed-in demo user's preferred withdrawal destination.
   * This is persisted in browser localStorage only; never use it for live banking data.
   */
  public saveWithdrawalDetails(payload: {
    userId: string;
    method: WithdrawalMethod;
    accountName: string;
    accountNumber: string;
  }): { success: boolean; message: string } {
    const { userId, method, accountName, accountNumber } = payload;
    if (!this.state.currentUser || this.state.currentUser.id !== userId) {
      return { success: false, message: 'Please sign in to update your own withdrawal details.' };
    }
    const user = this.state.allUsers.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };
    if (user.withdrawalDetails) return { success: false, message: 'Withdrawal details are already saved and locked. Contact support if a correction is required.' };
    const cleanName = accountName.trim();
    const cleanNumber = accountNumber.trim().replace(/\s+/g, '');
    if (cleanName.length < 2) return { success: false, message: 'Enter the account holder or wallet owner name.' };
    if (cleanNumber.length < 6 || cleanNumber.length > 34) {
      return { success: false, message: 'Enter a valid account or wallet number.' };
    }
    if (method === 'Telebirr' && !/^(\+251|251|0)9\d{8}$/.test(cleanNumber)) {
      return { success: false, message: 'Enter a valid Ethiopian Telebirr mobile number.' };
    }
    const details: SavedWithdrawalDetails = {
      method,
      accountName: cleanName,
      accountNumber: cleanNumber,
      updatedAt: new Date().toISOString(),
    };
    this.state = {
      ...this.state,
      allUsers: this.state.allUsers.map((u) => u.id === userId ? { ...u, withdrawalDetails: details } : u),
      currentUser: { ...this.state.currentUser, withdrawalDetails: details },
      auditLogs: [...this.state.auditLogs, {
        id: `aud-${Date.now()}`,
        adminId: userId,
        adminName: user.name,
        actionType: 'DEMO_WITHDRAWAL_DETAILS_SAVED',
        details: `Updated preferred withdrawal destination (${method}); destination number omitted from audit log.`,
        timestamp: new Date().toISOString(),
      }],
    };
    this.notify();
    return { success: true, message: 'Withdrawal details saved for this demonstration account.' };
  }

  /** Cache non-sensitive destination summary for UI labels only; server remains authoritative. */
  public cacheWithdrawalDestinationSummary(payload: {
    userId: string;
    method: WithdrawalMethod;
    accountName: string;
    accountNumber: string;
  }): { success: boolean; message: string } {
    const { userId, method, accountName, accountNumber } = payload;
    if (!this.state.currentUser || this.state.currentUser.id !== userId) {
      return { success: false, message: 'Please sign in to update your own withdrawal details.' };
    }
    const user = this.state.allUsers.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };
    const cleanName = accountName.trim();
    const cleanNumber = accountNumber.trim().replace(/\s+/g, '');
    if (cleanName.length < 2 || cleanNumber.length < 4) {
      return { success: false, message: 'The saved withdrawal destination summary is invalid.' };
    }
    const details: SavedWithdrawalDetails = {
      method,
      accountName: cleanName,
      // This summary is deliberately masked; only Supabase retains the actual number.
      accountNumber: `••••${cleanNumber.slice(-4)}`,
      updatedAt: new Date().toISOString(),
    };
    this.state = {
      ...this.state,
      allUsers: this.state.allUsers.map((u) => u.id === userId ? { ...u, withdrawalDetails: details } : u),
      currentUser: { ...this.state.currentUser, withdrawalDetails: details },
    };
    this.notify();
    return { success: true, message: 'Saved withdrawal destination summary refreshed.' };
  }

  // Withdrawal workflow (Min 150 ETB, 8% fee; simulated only in DEMO MODE)
  public submitWithdrawalRequest(payload: {
    userId: string;
    amount: number;
    method: 'CBE' | 'Telebirr' | 'Awash Bank' | 'Bank of Abyssinia';
    accountName: string;
    accountNumber: string;
  }): { success: boolean; message: string; request?: WithdrawalRequest } {
    const { userId, amount, method, accountName, accountNumber } = payload;
    if (!this.state.currentUser || this.state.currentUser.id !== userId) {
      return { success: false, message: 'Please sign in to submit your own demonstration request.' };
    }
    const user = this.state.allUsers.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };
    if (!Number.isFinite(amount) || amount <= 0) return { success: false, message: 'Enter a valid withdrawal amount.' };
    if (user.status === 'suspended') return { success: false, message: 'This account is suspended.' };
    const savedDetails = user.withdrawalDetails;
    if (!savedDetails) return { success: false, message: 'Save your withdrawal destination under My Account → My Bank Details first.' };
    if (savedDetails.method !== method || savedDetails.accountName !== accountName.trim() || savedDetails.accountNumber !== accountNumber.trim().replace(/\s+/g, '')) {
      return { success: false, message: 'The destination must match your saved withdrawal details. Update them under My Account first.' };
    }

    if (amount < 150) {
      return { success: false, message: 'Minimum withdrawal amount is 150 ETB.' };
    }
    if (user.demoBalance < amount) {
      return {
        success: false,
        message: `Insufficient demonstration balance. You have ${user.demoBalance.toLocaleString()} ETB available.`,
      };
    }
    if (!accountName.trim() || !accountNumber.trim()) {
      return { success: false, message: 'Please enter beneficiary name and account or phone number.' };
    }

    const fee = Math.round(amount * 0.08 * 100) / 100; // 8% illustrative fee
    const netAmount = Math.round((amount - fee) * 100) / 100;
    const newBalance = user.demoBalance - amount;

    const newRequest: WithdrawalRequest = {
      id: `WTH-${Math.floor(100000 + Math.random() * 900000)}`,
      userId,
      userName: user.name,
      userPhone: user.phone,
      amount,
      fee,
      netAmount,
      method,
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
      status: 'pending_verification',
      createdAt: new Date().toISOString(),
    };

    this.state = {
      ...this.state,
      withdrawalRequests: [newRequest, ...this.state.withdrawalRequests],
      allUsers: this.state.allUsers.map((u) => (u.id === userId ? { ...u, demoBalance: newBalance } : u)),
      currentUser:
        this.state.currentUser?.id === userId
          ? { ...this.state.currentUser, demoBalance: newBalance }
          : this.state.currentUser,
      notifications: [
        ...this.state.notifications,
        {
          id: `notif-${Date.now()}`,
          userId,
          title: 'Withdrawal Request Submitted',
          message: `Request #${newRequest.id} for ${amount.toLocaleString()} ETB (Net: ${netAmount.toLocaleString()} ETB) is in pending review.`,
          createdAt: new Date().toISOString(),
          read: false,
          relatedRequestId: newRequest.id,
        },
      ],
    };

    this.notify();
    return { success: true, message: 'Withdrawal request submitted for review.', request: newRequest };
  }

  // Task Center
  public completeTask(userId: string, taskId: string): { success: boolean; message: string } {
    const task = PLATFORM_TASKS.find((t) => t.id === taskId);
    if (!task || !task.isAvailable) return { success: false, message: 'Task not available.' };

    const existing = this.state.taskCompletions.find((tc) => tc.userId === userId && tc.taskId === taskId);
    if (existing?.isCompleted) {
      return { success: true, message: 'Task already completed.' };
    }

    const now = new Date().toISOString();
    const newCompletion: UserTaskCompletion = {
      id: existing?.id || `tc-${Date.now()}`,
      userId,
      taskId,
      isCompleted: true,
      isClaimed: false,
      completedAt: now,
    };

    const filtered = this.state.taskCompletions.filter((tc) => !(tc.userId === userId && tc.taskId === taskId));

    this.state = {
      ...this.state,
      taskCompletions: [...filtered, newCompletion],
    };

    this.notify();
    return { success: true, message: 'Task criteria met! You can now claim your reward.' };
  }

  public claimTaskReward(userId: string, taskId: string): { success: boolean; message: string; reward?: number } {
    const user = this.state.allUsers.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };

    const task = PLATFORM_TASKS.find((t) => t.id === taskId);
    if (!task || !task.isAvailable) return { success: false, message: 'Task not valid.' };

    const record = this.state.taskCompletions.find((tc) => tc.userId === userId && tc.taskId === taskId);
    if (!record || !record.isCompleted) {
      return { success: false, message: 'Please complete the task requirements first.' };
    }
    if (record.isClaimed) {
      return { success: false, message: 'This bonus reward has already been claimed.' };
    }

    const now = new Date().toISOString();
    const updatedRecord: UserTaskCompletion = {
      ...record,
      isClaimed: true,
      claimedAt: now,
    };

    const newBalance = user.demoBalance + task.rewardETB;

    this.state = {
      ...this.state,
      taskCompletions: this.state.taskCompletions.map((tc) =>
        tc.userId === userId && tc.taskId === taskId ? updatedRecord : tc
      ),
      allUsers: this.state.allUsers.map((u) => (u.id === userId ? { ...u, demoBalance: newBalance } : u)),
      currentUser:
        this.state.currentUser?.id === userId
          ? { ...this.state.currentUser, demoBalance: newBalance }
          : this.state.currentUser,
      notifications: [
        ...this.state.notifications,
        {
          id: `notif-${Date.now()}`,
          userId,
          title: `Task Bonus Claimed (+${task.rewardETB} ETB)`,
          message: `Claimed demonstration reward for "${task.title}".`,
          createdAt: now,
          read: false,
        },
      ],
    };

    this.notify();
    return { success: true, message: `Claimed +${task.rewardETB} ETB task reward!`, reward: task.rewardETB };
  }

  // Admin Actions
  public adminApproveRecharge(requestId: string, adminId: string): { success: boolean; message: string } {
    if (this.state.currentUser?.role !== 'admin') {
      return { success: false, message: 'Admin access denied. Sign in with the demo administrator account.' };
    }
    const req = this.state.rechargeRequests.find((r) => r.id === requestId);
    if (!req) return { success: false, message: 'Recharge request not found.' };
    if (req.status === 'approved') return { success: false, message: 'Already approved.' };
    if (!['pending_verification', 'under_review', 'submitted'].includes(req.status)) {
      return { success: false, message: `Cannot approve a recharge request in ${req.status} status.` };
    }

    const targetUser = this.state.allUsers.find((u) => u.id === req.userId);
    const newBalance = targetUser ? targetUser.demoBalance + req.amount : 0;
    const newTotalRecharged = targetUser ? targetUser.totalRechargedDemo + req.amount : req.amount;

    const now = new Date().toISOString();

    this.state = {
      ...this.state,
      rechargeRequests: this.state.rechargeRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'approved',
              reviewedAt: now,
              reviewedBy: 'DIAMOND MINE AFRICA',
            }
          : r
      ),
      allUsers: this.state.allUsers.map((u) =>
        u.id === req.userId
          ? {
              ...u,
              demoBalance: newBalance,
              totalRechargedDemo: newTotalRecharged,
            }
          : u
      ),
      currentUser:
        this.state.currentUser?.id === req.userId
          ? {
              ...this.state.currentUser,
              demoBalance: newBalance,
              totalRechargedDemo: newTotalRecharged,
            }
          : this.state.currentUser,
      notifications: [
        ...this.state.notifications,
        {
          id: `notif-${Date.now()}`,
          userId: req.userId,
          title: 'Recharge Request Approved',
          message: `Your demonstration recharge of ${req.amount.toLocaleString()} ETB (Request #${req.id}) has been approved and credited to your demonstration balance.`,
          createdAt: now,
          read: false,
          relatedRequestId: req.id,
        },
      ],
      auditLogs: [
        ...this.state.auditLogs,
        {
          id: `aud-${Date.now()}`,
          adminId,
          adminName: 'DIAMOND MINE AFRICA',
          actionType: 'RECHARGE_APPROVAL',
          details: `Approved recharge #${req.id} for user ${req.userName} (${req.amount} ETB).`,
          timestamp: now,
        },
      ],
    };

    this.notify();
    return { success: true, message: 'Recharge request approved.' };
  }

  public adminRejectRecharge(
    requestId: string,
    adminId: string,
    reason: string
  ): { success: boolean; message: string } {
    if (this.state.currentUser?.role !== 'admin') {
      return { success: false, message: 'Admin access denied. Sign in with the demo administrator account.' };
    }
    const req = this.state.rechargeRequests.find((r) => r.id === requestId);
    if (!req) return { success: false, message: 'Recharge request not found.' };
    if (!['pending_verification', 'under_review', 'submitted'].includes(req.status)) {
      return { success: false, message: `Cannot reject a recharge request in ${req.status} status.` };
    }
    if (!reason.trim()) return { success: false, message: 'Please provide an explanatory reason for rejection.' };

    const now = new Date().toISOString();

    this.state = {
      ...this.state,
      rechargeRequests: this.state.rechargeRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'rejected',
              rejectionReason: reason.trim(),
              reviewedAt: now,
              reviewedBy: 'DIAMOND MINE AFRICA',
            }
          : r
      ),
      notifications: [
        ...this.state.notifications,
        {
          id: `notif-${Date.now()}`,
          userId: req.userId,
          title: 'Recharge Request Rejected',
          message: `Your recharge request #${req.id} was rejected. Reason: ${reason.trim()}`,
          createdAt: now,
          read: false,
          relatedRequestId: req.id,
        },
      ],
      auditLogs: [
        ...this.state.auditLogs,
        {
          id: `aud-${Date.now()}`,
          adminId,
          adminName: 'DIAMOND MINE AFRICA',
          actionType: 'RECHARGE_REJECTION',
          details: `Rejected recharge #${req.id} for ${req.userName}. Reason: ${reason}`,
          reason,
          timestamp: now,
        },
      ],
    };

    this.notify();
    return { success: true, message: 'Recharge request rejected.' };
  }

  public adminApproveWithdrawal(requestId: string, adminId: string): { success: boolean; message: string } {
    if (this.state.currentUser?.role !== 'admin') {
      return { success: false, message: 'Admin access denied. Sign in with the demo administrator account.' };
    }
    const req = this.state.withdrawalRequests.find((r) => r.id === requestId);
    if (!req) return { success: false, message: 'Withdrawal request not found.' };
    if (req.status === 'approved') return { success: false, message: 'Already approved.' };
    if (!['pending_verification', 'under_review', 'submitted'].includes(req.status)) {
      return { success: false, message: `Cannot approve a withdrawal request in ${req.status} status.` };
    }

    const now = new Date().toISOString();

    this.state = {
      ...this.state,
      withdrawalRequests: this.state.withdrawalRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'approved',
              reviewedAt: now,
              reviewedBy: 'DIAMOND MINE AFRICA',
            }
          : r
      ),
      allUsers: this.state.allUsers.map((u) =>
        u.id === req.userId
          ? {
              ...u,
              totalWithdrawnDemo: u.totalWithdrawnDemo + req.amount,
            }
          : u
      ),
      currentUser:
        this.state.currentUser?.id === req.userId
          ? {
              ...this.state.currentUser,
              totalWithdrawnDemo: this.state.currentUser.totalWithdrawnDemo + req.amount,
            }
          : this.state.currentUser,
      notifications: [
        ...this.state.notifications,
        {
          id: `notif-${Date.now()}`,
          userId: req.userId,
          title: 'Withdrawal Request Approved (Demo)',
          message: `Your demonstration withdrawal #${req.id} for ${req.amount.toLocaleString()} ETB (Net: ${req.netAmount.toLocaleString()} ETB to ${req.method}) has been approved in demo mode.`,
          createdAt: now,
          read: false,
          relatedRequestId: req.id,
        },
      ],
      auditLogs: [
        ...this.state.auditLogs,
        {
          id: `aud-${Date.now()}`,
          adminId,
          adminName: 'DIAMOND MINE AFRICA',
          actionType: 'WITHDRAWAL_APPROVAL',
          details: `Approved withdrawal #${req.id} for ${req.userName} (${req.amount} ETB).`,
          timestamp: now,
        },
      ],
    };

    this.notify();
    return { success: true, message: 'Withdrawal request approved in demo review.' };
  }

  public adminRejectWithdrawal(
    requestId: string,
    adminId: string,
    reason: string
  ): { success: boolean; message: string } {
    if (this.state.currentUser?.role !== 'admin') {
      return { success: false, message: 'Admin access denied. Sign in with the demo administrator account.' };
    }
    const req = this.state.withdrawalRequests.find((r) => r.id === requestId);
    if (!req) return { success: false, message: 'Withdrawal request not found.' };
    if (!['pending_verification', 'under_review', 'submitted'].includes(req.status)) {
      return { success: false, message: `Cannot reject a withdrawal request in ${req.status} status.` };
    }
    if (!reason.trim()) return { success: false, message: 'Rejection reason is required.' };

    // Refund escrowed funds back to user
    const targetUser = this.state.allUsers.find((u) => u.id === req.userId);
    const refundBalance = targetUser ? targetUser.demoBalance + req.amount : 0;
    const now = new Date().toISOString();

    this.state = {
      ...this.state,
      withdrawalRequests: this.state.withdrawalRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'rejected',
              rejectionReason: reason.trim(),
              reviewedAt: now,
              reviewedBy: 'DIAMOND MINE AFRICA',
            }
          : r
      ),
      allUsers: this.state.allUsers.map((u) => (u.id === req.userId ? { ...u, demoBalance: refundBalance } : u)),
      currentUser:
        this.state.currentUser?.id === req.userId
          ? { ...this.state.currentUser, demoBalance: refundBalance }
          : this.state.currentUser,
      notifications: [
        ...this.state.notifications,
        {
          id: `notif-${Date.now()}`,
          userId: req.userId,
          title: 'Withdrawal Request Rejected',
          message: `Your withdrawal #${req.id} was rejected (${reason.trim()}). ${req.amount.toLocaleString()} ETB has been returned to your balance.`,
          createdAt: now,
          read: false,
          relatedRequestId: req.id,
        },
      ],
      auditLogs: [
        ...this.state.auditLogs,
        {
          id: `aud-${Date.now()}`,
          adminId,
          adminName: 'DIAMOND MINE AFRICA',
          actionType: 'WITHDRAWAL_REJECTION',
          details: `Rejected withdrawal #${req.id} (${req.amount} ETB refunded). Reason: ${reason}`,
          reason,
          timestamp: now,
        },
      ],
    };

    this.notify();
    return { success: true, message: 'Withdrawal rejected and balance restored.' };
  }

  // Business Payment Settings ("Change Payment Account")
  public adminUpdatePaymentAccount(payload: {
    provider: string;
    accountHolder: string;
    accountNumber: string;
    instructions: string;
    adminId: string;
  }): { success: boolean; message: string } {
    if (this.state.currentUser?.role !== 'admin') {
      return { success: false, message: 'Admin access denied. Sign in with the demo administrator account.' };
    }
    const { provider, accountHolder, accountNumber, instructions, adminId } = payload;
    const cleanProvider = provider.trim();
    const cleanHolder = accountHolder.trim();
    const cleanNumber = accountNumber.trim().replace(/\s+/g, '');
    const cleanInstructions = instructions.trim();
    if (!cleanProvider || cleanProvider.length > 100) {
      return { success: false, message: 'Enter a bank/provider name no longer than 100 characters.' };
    }
    if (cleanHolder.length < 2 || cleanHolder.length > 120) {
      return { success: false, message: 'Enter an account holder name between 2 and 120 characters.' };
    }
    if (cleanNumber.length < 6 || cleanNumber.length > 34) {
      return { success: false, message: 'Account number must be between 6 and 34 non-space characters.' };
    }
    if (cleanInstructions.length > 500) {
      return { success: false, message: 'Transfer instructions must be 500 characters or fewer.' };
    }

    const nextVersion = this.state.paymentConfig.version + 1;
    const now = new Date().toISOString();

    const newConfig: BusinessPaymentConfig = {
      id: `biz-${Date.now()}`,
      provider: cleanProvider,
      accountHolder: cleanHolder,
      accountNumber: cleanNumber,
      instructions: cleanInstructions,
      updatedAt: now,
      updatedBy: 'DIAMOND MINE AFRICA',
      version: nextVersion,
    };

    this.state = {
      ...this.state,
      paymentConfig: newConfig,
      paymentConfigHistory: [newConfig, ...this.state.paymentConfigHistory],
      auditLogs: [
        ...this.state.auditLogs,
        {
          id: `aud-${Date.now()}`,
          adminId,
          adminName: 'DIAMOND MINE AFRICA',
          actionType: 'PAYMENT_ACCOUNT_UPDATE',
          details: `Updated recipient account to ${newConfig.accountHolder} (${newConfig.provider}, ending ${newConfig.accountNumber.slice(-4)}). Version ${nextVersion}.`,
          timestamp: now,
        },
      ],
    };

    this.notify();
    return { success: true, message: `Business payment details updated successfully (Version ${nextVersion})!` };
  }

  // Admin user management: note, warn, suspend/reactivate
  public adminUpdateUserStatus(
    userId: string,
    status: 'active' | 'suspended',
    reason: string,
    adminId: string
  ): { success: boolean; message: string } {
    if (this.state.currentUser?.role !== 'admin') {
      return { success: false, message: 'Admin access denied. Sign in with the demo administrator account.' };
    }
    const user = this.state.allUsers.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };

    const now = new Date().toISOString();

    this.state = {
      ...this.state,
      allUsers: this.state.allUsers.map((u) => (u.id === userId ? { ...u, status } : u)),
      currentUser:
        this.state.currentUser?.id === userId ? { ...this.state.currentUser, status } : this.state.currentUser,
      auditLogs: [
        ...this.state.auditLogs,
        {
          id: `aud-${Date.now()}`,
          adminId,
          adminName: 'DIAMOND MINE AFRICA',
          actionType: status === 'suspended' ? 'USER_SUSPEND' : 'USER_REACTIVATE',
          details: `Changed user ${user.name} (${user.id}) status to ${status}. Reason: ${reason}`,
          reason,
          timestamp: now,
        },
      ],
      notifications: [
        ...this.state.notifications,
        {
          id: `notif-${Date.now()}`,
          userId,
          title: status === 'suspended' ? 'Account Suspended' : 'Account Reactivated',
          message:
            status === 'suspended'
              ? `Your account was suspended by administration. Reason: ${reason}`
              : 'Your account has been reactivated.',
          createdAt: now,
          read: false,
        },
      ],
    };

    this.notify();
    return { success: true, message: `User status updated to ${status}.` };
  }

  public adminIssueWarning(userId: string, reason: string, adminId: string): { success: boolean; message: string } {
    if (this.state.currentUser?.role !== 'admin') {
      return { success: false, message: 'Admin access denied. Sign in with the demo administrator account.' };
    }
    const user = this.state.allUsers.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User not found.' };
    if (!reason.trim()) return { success: false, message: 'Reason is required.' };

    const now = new Date().toISOString();
    const warning: AccountWarning = {
      id: `wrn-${Date.now()}`,
      userId,
      reason: reason.trim(),
      timestamp: now,
      issuedBy: 'DIAMOND MINE AFRICA',
    };

    const currentWarnings = user.warnings || [];

    this.state = {
      ...this.state,
      allUsers: this.state.allUsers.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: 'warned',
              warnings: [...currentWarnings, warning],
            }
          : u
      ),
      currentUser:
        this.state.currentUser?.id === userId
          ? {
              ...this.state.currentUser,
              status: 'warned',
              warnings: [...currentWarnings, warning],
            }
          : this.state.currentUser,
      notifications: [
        ...this.state.notifications,
        {
          id: `notif-${Date.now()}`,
          userId,
          title: 'Official Account Warning Issued',
          message: `Notice from Administration: ${reason.trim()}`,
          createdAt: now,
          read: false,
        },
      ],
      auditLogs: [
        ...this.state.auditLogs,
        {
          id: `aud-${Date.now()}`,
          adminId,
          adminName: 'DIAMOND MINE AFRICA',
          actionType: 'ACCOUNT_WARNING',
          details: `Issued warning to user ${user.name} (${user.id}): ${reason.trim()}`,
          reason,
          timestamp: now,
        },
      ],
    };

    this.notify();
    return { success: true, message: 'Official warning recorded.' };
  }

  public adminAddUserNote(userId: string, note: string, adminId: string): { success: boolean; message: string } {
    if (this.state.currentUser?.role !== 'admin') {
      return { success: false, message: 'Admin access denied. Sign in with the demo administrator account.' };
    }
    this.state = {
      ...this.state,
      allUsers: this.state.allUsers.map((u) => (u.id === userId ? { ...u, internalNote: note.trim() } : u)),
      auditLogs: [
        ...this.state.auditLogs,
        {
          id: `aud-${Date.now()}`,
          adminId,
          adminName: 'DIAMOND MINE AFRICA',
          actionType: 'USER_NOTE_UPDATED',
          details: `Updated internal note for user ID ${userId}.`,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    this.notify();
    return { success: true, message: 'Internal note saved.' };
  }

  // Team & Manager configuration
  public adminUpdateTeamRewards(rewards: TeamRewardTierConfig[], adminId: string): { success: boolean; message: string } {
    if (this.state.currentUser?.role !== 'admin') {
      return { success: false, message: 'Admin access denied. Sign in with the demo administrator account.' };
    }
    this.state = {
      ...this.state,
      teamRewards: rewards,
      auditLogs: [
        ...this.state.auditLogs,
        {
          id: `aud-${Date.now()}`,
          adminId,
          adminName: 'DIAMOND MINE AFRICA',
          actionType: 'TEAM_REWARDS_CONFIG_UPDATE',
          details: `Updated team recharge reward scale (${rewards.length} tiers).`,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    this.notify();
    return { success: true, message: 'Team recharge reward configuration saved.' };
  }

  public adminUpdateManagerReward(
    payload: { amount: number; criteria: string; period: string; status: 'Active' | 'Under Review' | 'Configured' },
    adminId: string
  ): { success: boolean; message: string } {
    if (this.state.currentUser?.role !== 'admin') {
      return { success: false, message: 'Admin access denied. Sign in with the demo administrator account.' };
    }
    const now = new Date().toISOString();
    const updated: ManagerRewardConfig = {
      ...this.state.managerReward,
      amount: payload.amount,
      criteria: payload.criteria,
      period: payload.period,
      status: payload.status,
      lastModified: now,
      modifiedBy: 'DIAMOND MINE AFRICA',
      reviewHistory: [
        {
          date: now,
          note: `Config updated by ${adminId}: Amount ${payload.amount} ETB, Status ${payload.status}`,
          reviewedBy: 'DIAMOND MINE AFRICA',
        },
        ...this.state.managerReward.reviewHistory,
      ],
    };

    this.state = {
      ...this.state,
      managerReward: updated,
      auditLogs: [
        ...this.state.auditLogs,
        {
          id: `aud-${Date.now()}`,
          adminId,
          adminName: 'DIAMOND MINE AFRICA',
          actionType: 'MANAGER_REWARD_CONFIG_UPDATE',
          details: `Updated manager reward to ${payload.amount} ETB with criteria.`,
          timestamp: now,
        },
      ],
    };
    this.notify();
    return { success: true, message: 'Manager reward configuration updated.' };
  }

  // Support Tickets
  public submitSupportTicket(payload: {
    userId: string;
    category: SupportTicket['category'];
    message: string;
  }): { success: boolean; message: string } {
    const user = this.state.allUsers.find((u) => u.id === payload.userId);
    if (!user) return { success: false, message: 'User not found.' };
    if (!payload.message.trim()) return { success: false, message: 'Please write your message or query.' };

    const newTicket: SupportTicket = {
      id: `TCK-${Math.floor(100 + Math.random() * 900)}`,
      userId: payload.userId,
      userName: user.name,
      userPhone: user.phone,
      category: payload.category,
      message: payload.message.trim(),
      status: 'Open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state = {
      ...this.state,
      supportTickets: [newTicket, ...this.state.supportTickets],
      notifications: [
        ...this.state.notifications,
        {
          id: `notif-${Date.now()}`,
          userId: user.id,
          title: 'Support Ticket Received',
          message: `Ticket #${newTicket.id} received. Our operations team will respond promptly.`,
          createdAt: new Date().toISOString(),
          read: false,
        },
      ],
    };
    this.notify();
    return { success: true, message: 'Support ticket submitted successfully!' };
  }

  public adminRespondTicket(
    ticketId: string,
    response: string,
    status: SupportTicket['status'],
    adminId: string
  ): { success: boolean; message: string } {
    if (this.state.currentUser?.role !== 'admin') {
      return { success: false, message: 'Admin access denied. Sign in with the demo administrator account.' };
    }
    const ticket = this.state.supportTickets.find((t) => t.id === ticketId);
    if (!ticket) return { success: false, message: 'Ticket not found.' };

    const now = new Date().toISOString();

    this.state = {
      ...this.state,
      supportTickets: this.state.supportTickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              adminResponse: response.trim(),
              status,
              updatedAt: now,
            }
          : t
      ),
      notifications: [
        ...this.state.notifications,
        {
          id: `notif-${Date.now()}`,
          userId: ticket.userId,
          title: `Support Response to Ticket #${ticket.id}`,
          message: `Administrative reply: "${response.trim()}" (Status: ${status})`,
          createdAt: now,
          read: false,
        },
      ],
      auditLogs: [
        ...this.state.auditLogs,
        {
          id: `aud-${Date.now()}`,
          adminId,
          adminName: 'DIAMOND MINE AFRICA',
          actionType: 'SUPPORT_RESPONSE',
          details: `Replied to ticket #${ticket.id} (${ticket.userName}). Status: ${status}`,
          timestamp: now,
        },
      ],
    };

    this.notify();
    return { success: true, message: 'Support ticket updated with response.' };
  }

  public markNotificationRead(notifId: string) {
    this.state = {
      ...this.state,
      notifications: this.state.notifications.map((n) => (n.id === notifId ? { ...n, read: true } : n)),
    };
    this.notify();
  }

  public markAllNotificationsRead(userId: string) {
    this.state = {
      ...this.state,
      notifications: this.state.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
    };
    this.notify();
  }
}

export const store = new StoreService();

import React, { useEffect, useState } from 'react';
import { useStore } from './hooks/useStore.ts';
import { Header } from './components/Header.tsx';
import { BottomNav, TabKey } from './components/BottomNav.tsx';
import { HomeView } from './views/HomeView.tsx';
import { EarningsView } from './views/EarningsView.tsx';
import { ShareView } from './views/ShareView.tsx';
import { AccountView } from './views/AccountView.tsx';
import { AuthView } from './views/AuthView.tsx';
import { PlatformRulesView } from './views/PlatformRulesView.tsx';
import { AdminDashboardView } from './views/AdminDashboardView.tsx';
import { RechargeModal } from './components/RechargeModal.tsx';
import { WithdrawalModal } from './components/WithdrawalModal.tsx';
import { TaskCenterModal } from './components/TaskCenterModal.tsx';
import { CustomerSupportModal } from './components/CustomerSupportModal.tsx';
import { MineralCatalogueModal } from './components/MineralCatalogueModal.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';
import { BankDetailsModal } from './components/BankDetailsModal.tsx';
import { IS_DEMO_MODE } from './config.ts';
import { isSupabaseConfigured } from './services/supabase.ts';
import { SupabaseAdminDashboardView } from './views/SupabaseAdminDashboardView.tsx';

export default function App() {
  const { currentUser } = useStore();

  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isAdminView, setIsAdminView] = useState(currentUser?.role === 'admin');

  // Open the admin portal automatically when the database-backed profile has admin role.
  useEffect(() => {
    setIsAdminView(currentUser?.role === 'admin');
  }, [currentUser?.id, currentUser?.role]);

  // Modals state
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isTaskCenterOpen, setIsTaskCenterOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isMineralCatalogueOpen, setIsMineralCatalogueOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isBankDetailsOpen, setIsBankDetailsOpen] = useState(false);

  // Fail closed: setting VITE_DEMO_MODE=false must never activate live-money features by itself.
  if (!IS_DEMO_MODE) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8 shadow-sm">
          <h1 className="text-xl font-extrabold">Diamond Mine Africa — Live Mode Disabled</h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">Live mode is not available in this build. Changing an environment flag does not create secure authentication, verified payments, or a payout system. Restore <code className="rounded bg-white px-1.5 py-0.5">VITE_DEMO_MODE=true</code> to continue testing the demonstration.</p>
          <p className="mt-3 text-xs leading-5 text-slate-600">Before any real-money launch, the project needs a secured server-side backend, independently verified payment integrations, access controls, transaction reconciliation, and appropriate legal/compliance review.</p>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated Visitor Flow: Show Registration / Login
  if (!currentUser) {
    return <AuthView onSuccess={() => {}} />;
  }

  // 2. Admins skip the customer-only rules gate and go straight to the protected portal.
  if (currentUser.role === 'admin' && isAdminView) {
    return isSupabaseConfigured
      ? <SupabaseAdminDashboardView onBackToCustomer={() => setIsAdminView(false)} />
      : <AdminDashboardView onBackToCustomer={() => setIsAdminView(false)} />;
  }

  // 3. Regular members must review and acknowledge Platform Rules before accessing Home.
  if (!currentUser.hasCompletedRules) {
    return (
      <PlatformRulesView
        userId={currentUser.id}
        onComplete={() => {
          setActiveTab('home');
        }}
      />
    );
  }

  // 4. Authenticated Customer Application Flow
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-center text-[10px] sm:text-xs font-semibold text-amber-900" role="status">Account login is connected. Deposit verification, withdrawals, and VIP rewards are still being validated; do not treat displayed returns as guaranteed income.</div>
      {/* Top Navigation Bar */}
      <Header
        onOpenSupport={() => setIsSupportOpen(true)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onToggleAdmin={() => { if (currentUser.role === 'admin') setIsAdminView(true); }}
        isAdminView={isAdminView}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-4 pb-20">
        {activeTab === 'home' && (
          <HomeView
            onOpenRecharge={() => setIsRechargeOpen(true)}
            onOpenWithdraw={() => setIsWithdrawOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'earnings' && (
          <EarningsView onNavigateHome={() => setActiveTab('home')} />
        )}

        {activeTab === 'share' && <ShareView />}

        {activeTab === 'account' && (
          <AccountView
            onOpenRecharge={() => setIsRechargeOpen(true)}
            onOpenWithdraw={() => setIsWithdrawOpen(true)}
            onOpenTaskCenter={() => setIsTaskCenterOpen(true)}
            onOpenBankDetails={() => setIsBankDetailsOpen(true)}
            onOpenSupport={() => setIsSupportOpen(true)}
            onOpenRules={() => setIsRulesModalOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
      </main>

      {/* Bottom Navigation (Strictly 4 Items: HOME, EARNINGS, SHARE, MY ACCOUNT) */}
      <BottomNav activeTab={activeTab} onChangeTab={(tab) => setActiveTab(tab)} />

      {/* Global Interactive Workflow Modals */}
      <RechargeModal
        isOpen={isRechargeOpen}
        onClose={() => setIsRechargeOpen(false)}
        onOpenSupport={() => {
          setIsRechargeOpen(false);
          setIsSupportOpen(true);
        }}
      />

      <WithdrawalModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onOpenBankDetails={() => { setIsWithdrawOpen(false); setIsBankDetailsOpen(true); }}
        onOpenHistory={() => {
          setIsWithdrawOpen(false);
          setActiveTab('account');
        }}
      />

      <BankDetailsModal isOpen={isBankDetailsOpen} onClose={() => setIsBankDetailsOpen(false)} />

      <TaskCenterModal
        isOpen={isTaskCenterOpen}
        onClose={() => setIsTaskCenterOpen(false)}
        onOpenMineralCatalogue={() => {
          setIsMineralCatalogueOpen(true);
        }}
        onOpenShare={() => {
          setIsTaskCenterOpen(false);
          setActiveTab('share');
        }}
      />

      <CustomerSupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      <MineralCatalogueModal
        isOpen={isMineralCatalogueOpen}
        onClose={() => setIsMineralCatalogueOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Rules Modal for Reference from Account menu */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl">
            <PlatformRulesView
              userId={currentUser.id}
              onComplete={() => setIsRulesModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

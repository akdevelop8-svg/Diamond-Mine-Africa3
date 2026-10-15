import React from 'react';
import { Home, TrendingUp, Share2, User } from 'lucide-react';

export type TabKey = 'home' | 'earnings' | 'share' | 'account';

interface BottomNavProps {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const navItems = [
    { key: 'home' as TabKey, label: 'HOME', icon: Home },
    { key: 'earnings' as TabKey, label: 'EARNINGS', icon: TrendingUp },
    { key: 'share' as TabKey, label: 'SHARE', icon: Share2 },
    { key: 'account' as TabKey, label: 'MY ACCOUNT', icon: User },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 border-t border-slate-200 shadow-lg backdrop-blur-md pb-safe"
    >
      <div className="max-w-md mx-auto grid grid-cols-4 h-15">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChangeTab(item.key)}
              className={`flex flex-col items-center justify-center py-1 transition-colors select-none ${
                isActive
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-md transition-transform ${
                  isActive ? 'scale-110 bg-blue-50' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

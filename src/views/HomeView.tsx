import React, { useState } from 'react';
import { HeroCarousel } from '../components/HeroCarousel.tsx';
import { DailyCheckInCard } from '../components/DailyCheckInCard.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import { ProductDetailModal } from '../components/ProductDetailModal.tsx';
import { VipProduct } from '../types.ts';
import { useStore } from '../hooks/useStore.ts';
import { isSupabaseConfigured } from '../services/supabase.ts';
import {
  CreditCard,
  ArrowDownRight,
  CalendarCheck,
  Users,
  ShieldCheck,
  Award,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface HomeViewProps {
  onOpenRecharge: () => void;
  onOpenWithdraw: () => void;
  onNavigateTab: (tab: 'home' | 'earnings' | 'share' | 'account') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onOpenRecharge,
  onOpenWithdraw,
  onNavigateTab,
}) => {
  const { products, userOwnedProducts, currentUser } = useStore();
  const [selectedProduct, setSelectedProduct] = useState<VipProduct | null>(null);

  const ownedProductIds = new Set(
    userOwnedProducts
      .filter((p) => p.userId === currentUser?.id && p.status === 'active')
      .map((p) => p.productId)
  );

  return (
    <div className="space-y-5 pb-8 animate-fadeIn">
      {/* 5-Image Rotating Hero Carousel */}
      <HeroCarousel />

      {/* Main 4 Quick Actions (Recharge, Withdraw, Daily Check-In, My Team) */}
      <div className="grid grid-cols-4 gap-2">
        {/* Recharge */}
        <button
          onClick={onOpenRecharge}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-blue-100 hover:border-blue-300 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800 mt-2">Recharge</span>
          <span className="text-[10px] text-blue-600 font-medium">Top Up</span>
        </button>

        {/* Withdraw */}
        <button
          onClick={onOpenWithdraw}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-blue-100 hover:border-blue-300 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800 mt-2">Withdraw</span>
          <span className="text-[10px] text-emerald-600 font-medium">Payout</span>
        </button>

        {/* Daily Check-In */}
        <button
          onClick={() => {
            const el = document.getElementById('daily-checkin-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-blue-100 hover:border-blue-300 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800 mt-2">Check-In</span>
          <span className="text-[10px] text-amber-600 font-medium">{isSupabaseConfigured ? 'Daily Visit' : '+1 ETB'}</span>
        </button>

        {/* My Team */}
        <button
          onClick={() => onNavigateTab('share')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-blue-100 hover:border-blue-300 shadow-xs hover:shadow-md transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800 mt-2">My Team</span>
          <span className="text-[10px] text-indigo-600 font-medium">4 Levels</span>
        </button>
      </div>

      {/* Daily Check-In Card Section */}
      <div id="daily-checkin-section">
        <DailyCheckInCard />
      </div>

      {/* VIP Product Catalogue Header */}
      <div className="flex items-end justify-between pt-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>VIP Gemstone Catalogue</span>
          </div>
          <h3 className="font-display font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">
            Select Your Diamond Mining Plan
          </h3>
        </div>
        <span className="text-xs font-semibold text-blue-600">
          10 Unique Cuts
        </span>
      </div>

      {/* 2-Column Mobile Grid / Wider Desktop Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isOwned={ownedProductIds.has(product.id)}
            onViewDetails={(p) => setSelectedProduct(p)}
            onPurchase={(p) => setSelectedProduct(p)}
          />
        ))}
      </div>

      {/* Product Details Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOpenRecharge={onOpenRecharge}
      />
    </div>
  );
};

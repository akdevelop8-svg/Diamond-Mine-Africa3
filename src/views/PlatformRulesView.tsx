import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, CheckCircle2, FileText, Lock, Users, AlertCircle, Headphones } from 'lucide-react';
import { ASSETS, SUPPORT_CONTACT } from '../data/constants.ts';
import { store } from '../services/store.ts';
import { isSupabaseConfigured, supabase } from '../services/supabase.ts';

interface PlatformRulesViewProps {
  userId: string;
  onComplete: () => void;
}

export const PlatformRulesView: React.FC<PlatformRulesViewProps> = ({ userId, onComplete }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleUnderstand = async () => {
    setErrorMessage('');
    setIsSaving(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        // Quick demo users do not have a Supabase session; only persist for real Auth users.
        if (data.session?.user) {
          const { error } = await supabase.rpc('accept_platform_rules');
          if (error) throw error;
        }
      }
      store.markRulesAccepted(userId);
      onComplete();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save your acknowledgement. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 flex justify-center items-center">
      <div className="bg-white max-w-xl w-full rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl mx-auto bg-white p-1 shadow-md mb-3">
            <img
              src={ASSETS.logo}
              alt="Diamond Mine Africa"
              className="w-full h-full object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="font-display font-extrabold text-2xl tracking-tight text-white">
            Diamond Mine Africa
          </h1>
          <p className="text-xs text-blue-200 mt-1 font-medium">
            Mine Today · Grow Tomorrow · Platform Architecture & Guidelines
          </p>
        </div>

        {/* Rules & Policy Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700 max-h-[70vh] overflow-y-auto">
          {/* Section 1: Demonstration & Testing Notice */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-sm text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Controlled Demonstration Environment Notice</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              This application operates in a testing environment for product review and administrative evaluation. No actual bank transfers or live financial disbursements are processed directly. All balances and rewards are simulated demonstration values.
            </p>
          </div>

          {/* Section 2: Task Center & Activities */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Task Center & Community Activities</span>
            </h3>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Members can participate in community tasks to earn platform activity rewards:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
              <li>Join Official Telegram Community Channel.</li>
              <li>Explore the Geological Mineral Catalogue.</li>
              <li>Invite team members to expand the exploration network.</li>
            </ul>
          </div>

          {/* Section 3: VIP Products & Daily Check-In */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>VIP Product Tiers & Daily Mining Check-In</span>
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
              <li>Product price range spans from 300 ETB (VIP 1) to 200,000 ETB (VIP 10).</li>
              <li>Each VIP tier carries an illustrative 365-day validity cycle.</li>
              <li>Daily check-in grants attendance rewards once per 24 hours per account.</li>
              <li>Demo earning claims require a 24-hour interval; displayed figures are simulations and are not evidence of mining revenue or a promised return.</li>
            </ul>
          </div>

          {/* Section 4: Payment & Withdrawal Rules */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Recharge & Withdrawal Policies</span>
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
              <li>Recharge workflow is a simulated CBE-only demo flow. The displayed account details are placeholders; do not transfer real money.</li>
              <li>Minimum withdrawal amount is 150 ETB.</li>
              <li>All financial requests are queued for administrative audit before state transition.</li>
            </ul>
          </div>

          {/* Section 5: Referral & Team Commission Structure */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>4-Level Team Referral Program</span>
            </h3>
            <p className="text-[11px] leading-relaxed text-slate-600">
              The demo displays a four-level referral tree with illustrative percentage parameters, not a promise of commission payments:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-800">
              <div className="p-2 rounded-lg bg-white border border-slate-200">Level 1 (Direct): 10%</div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">Level 2 (Tier 2): 3%</div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">Level 3 (Tier 3): 2%</div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">Level 4 (Tier 4): 1%</div>
            </div>
            <p className="text-[10px] text-slate-500 italic mt-1">
              *Only members who have completed a qualifying VIP purchase are counted as Active Qualifying Customers. Registered accounts without purchases remain Pending.
            </p>
          </div>

          {/* Section 6: Customer Support */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
              <Headphones className="w-4 h-4 text-blue-600" />
              <span>24/7 Operations Desk</span>
            </h3>
            <p className="text-[11px] text-slate-600">
              Reach out directly on Telegram via{' '}
              <strong className="text-blue-700">{SUPPORT_CONTACT.telegramHandle}</strong> or through our in-app ticket center.
            </p>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 text-center sm:text-left">
            <span>By clicking below, you acknowledge and agree to platform rules.</span>
            {errorMessage && <p className="mt-2 text-rose-700 font-semibold">{errorMessage}</p>}
          </div>
          <button
            onClick={() => void handleUnderstand()}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 active:scale-98 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>{isSaving ? 'Saving…' : 'I Understand & Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

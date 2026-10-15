import React, { useState } from 'react';
import { useStore } from '../hooks/useStore.ts';
import { TeamCommissionInfographic } from '../components/TeamCommissionInfographic.tsx';
import { TeamRechargeRewardTable } from '../components/TeamRechargeRewardTable.tsx';
import {
  Copy,
  Check,
  Share2,
  Users,
  Award,
  Crown,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  AlertCircle,
} from 'lucide-react';

export const ShareView: React.FC = () => {
  const { currentUser, allUsers, userOwnedProducts, commissionRates, managerReward } = useStore();

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3 | 4>(1);

  if (!currentUser) return null;

  // Build the 4-level hierarchy tree
  // Level 1: Direct referrals of current user
  const level1Users = allUsers.filter((u) => u.referredBy === currentUser.id);
  const level1Ids = new Set(level1Users.map((u) => u.id));

  // Level 2: Referrals of Level 1
  const level2Users = allUsers.filter((u) => u.referredBy && level1Ids.has(u.referredBy));
  const level2Ids = new Set(level2Users.map((u) => u.id));

  // Level 3: Referrals of Level 2
  const level3Users = allUsers.filter((u) => u.referredBy && level2Ids.has(u.referredBy));
  const level3Ids = new Set(level3Users.map((u) => u.id));

  // Level 4: Referrals of Level 3
  const level4Users = allUsers.filter((u) => u.referredBy && level3Ids.has(u.referredBy));

  const allTeamMembers = [...level1Users, ...level2Users, ...level3Users, ...level4Users];

  // Helper to determine qualifying status and order value
  const getUserOrderStats = (userId: string) => {
    const orders = userOwnedProducts.filter((p) => p.userId === userId && p.status === 'active');
    const totalOrderValue = orders.reduce((sum, p) => sum + p.price, 0);
    const member = allUsers.find((u) => u.id === userId);
    // The stated team rule requires both a recorded recharge and a purchased active product.
    const isQualifying = orders.length > 0 && (member?.totalRechargedDemo ?? 0) > 0;
    return { isQualifying, totalOrderValue, ordersCount: orders.length };
  };

  const totalRegistered = allTeamMembers.length;
  const qualifyingUsers = allTeamMembers.filter((u) => getUserOrderStats(u.id).isQualifying);
  const totalQualifying = qualifyingUsers.length;
  const pendingReferrals = totalRegistered - totalQualifying;

  const totalTeamRecharge = allTeamMembers.reduce((sum, user) => sum + (user.totalRechargedDemo || 0), 0);

  // Mask phone number for privacy: e.g. "+251922345678" -> "+251 92 *** **78"
  const maskPhone = (phone: string) => {
    if (phone.length < 8) return phone;
    const start = phone.slice(0, 7);
    const end = phone.slice(-2);
    return `${start} *** **${end}`;
  };

  // Referral URL
  const origin = window.location.origin;
  const referralLink = `${origin}/register?ref_by=${encodeURIComponent(currentUser.referralCode)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentUser.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Diamond Mine Africa | Mine Today. Grow Tomorrow.',
        text: `Join Diamond Mine Africa with my referral invitation code ${currentUser.referralCode} to access VIP diamond tiers and registration bonuses!`,
        url: referralLink,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  // Active level members
  const currentLevelMembers =
    selectedLevel === 1
      ? level1Users
      : selectedLevel === 2
      ? level2Users
      : selectedLevel === 3
      ? level3Users
      : level4Users;

  const currentLevelPercent =
    selectedLevel === 1
      ? commissionRates.level1Percent
      : selectedLevel === 2
      ? commissionRates.level2Percent
      : selectedLevel === 3
      ? commissionRates.level3Percent
      : commissionRates.level4Percent;

  return (
    <div className="space-y-5 pb-8 animate-fadeIn">
      {/* Top Invitation Card */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest block">
                Official Invitation Portal
              </span>
              <h2 className="font-display font-extrabold text-xl text-white">
                Share & Build Your Mining Network
              </h2>
            </div>
            <button
              onClick={handleNativeShare}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors shrink-0"
              title="Share Link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Invitation Code Box */}
          <div className="bg-slate-900/80 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[11px] text-slate-300 font-medium block">
              Personal Invitation Code:
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-black text-xl text-amber-300 tracking-wider">
                {currentUser.referralCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors shadow-xs"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          {/* Invitation Link Box */}
          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[11px] text-blue-200 font-medium block">
              Personal Referral Link:
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-white/90 truncate font-mono max-w-[220px] sm:max-w-sm">
                {referralLink}
              </span>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs transition-colors shadow-xs shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Team Summary Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium block">Total Referrals</span>
          <span className="font-display font-extrabold text-xl text-slate-900 tabular-nums">
            {totalRegistered}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Registered accounts</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-[11px] text-emerald-800 font-medium block">Qualifying Members</span>
          <span className="font-display font-extrabold text-xl text-emerald-700 tabular-nums">
            {totalQualifying}
          </span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">Active VIP buyers</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <span className="text-[11px] text-amber-800 font-medium block">Pending Referrals</span>
          <span className="font-display font-extrabold text-xl text-amber-700 tabular-nums">
            {pendingReferrals}
          </span>
          <span className="text-[10px] text-amber-600 block mt-0.5">No purchase yet</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <span className="text-[11px] text-blue-800 font-medium block">Total Team Recharge</span>
          <span className="font-display font-extrabold text-xl text-blue-700 tabular-nums">
            {totalTeamRecharge.toLocaleString()} ETB
          </span>
          <span className="text-[10px] text-blue-600 block mt-0.5">Attributed team total</span>
        </div>
      </div>

      {/* 4 Tappable Level Selectors */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-slate-900">
            Referral Network Hierarchy (4 Levels)
          </h3>
          <span className="text-xs text-blue-600 font-semibold">
            Tap Level to View Members
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { level: 1 as const, pct: '10%', count: level1Users.length },
            { level: 2 as const, pct: '3%', count: level2Users.length },
            { level: 3 as const, pct: '2%', count: level3Users.length },
            { level: 4 as const, pct: '1%', count: level4Users.length },
          ].map((item) => (
            <button
              key={item.level}
              onClick={() => setSelectedLevel(item.level)}
              className={`p-3 rounded-2xl border text-center transition-all ${
                selectedLevel === item.level
                  ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-extrabold shadow-sm ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-medium'
              }`}
            >
              <span className="block text-xs uppercase tracking-wide">Level {item.level}</span>
              <span className="font-black text-sm text-blue-700 block my-0.5">{item.pct}</span>
              <span className="text-[10px] text-slate-500 block">
                {item.count} {item.count === 1 ? 'member' : 'members'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Level Member List Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h4 className="font-display font-bold text-sm text-slate-900">
              Level {selectedLevel} Members ({currentLevelPercent}% Reference Commission)
            </h4>
            <span className="text-[11px] text-slate-500">
              {selectedLevel === 1 ? 'Direct referrals' : `Depth level ${selectedLevel} referrals`}
            </span>
          </div>
          <span className="text-xs font-extrabold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-full">
            {currentLevelMembers.length} Members
          </span>
        </div>

        {currentLevelMembers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No members registered in Level {selectedLevel} yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Team Recharge</th>
                  <th className="py-2.5 px-3 text-right">Direct Invites</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentLevelMembers.map((member) => {
                  const stats = getUserOrderStats(member.id);
                  const directCount = allUsers.filter((u) => u.referredBy === member.id).length;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <div>
                          <span>{member.name}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {member.id}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                        {maskPhone(member.phone)}
                      </td>
                      <td className="py-2.5 px-3">
                        {stats.isQualifying ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Qualifying
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800 tabular-nums">
                        {(member.totalRechargedDemo || 0).toLocaleString()} ETB
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-blue-600 tabular-nums">
                        {directCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Team Commission Infographic (From Reference Image) */}
      <TeamCommissionInfographic />

      {/* Team Recharge Reward Reference Table (From Reference Image) */}
      <TeamRechargeRewardTable />

      {/* Manager Reward Reference Section (Requested 25,000 ETB) */}
      <div className="bg-white rounded-2xl border border-amber-300 shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Crown className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-widest block">
                Executive Leadership
              </span>
              <h4 className="font-display font-extrabold text-base text-slate-900">
                Regional Manager Reward Program
              </h4>
            </div>
          </div>
          <span className="text-xs font-black text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 tabular-nums">
            {managerReward.amount.toLocaleString()} ETB
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {managerReward.criteria}
        </p>

        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Evaluation Cycle</span>
            <span className="font-bold text-slate-800">{managerReward.period}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500 block">Program Status</span>
            <span className="font-bold text-emerald-700">{managerReward.status}</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[10px] text-amber-900 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>
            *Demonstration management tier. Real disbursements require separate corporate validation and administrative authorization.
          </span>
        </div>
      </div>
    </div>
  );
};

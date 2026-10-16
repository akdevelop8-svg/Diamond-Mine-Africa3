import React, { useState, useEffect } from 'react';
import { ASSETS } from '../data/constants.ts';
import { store } from '../services/store.ts';
import { fetchDmaProfile, isSupabaseConfigured, isValidEthiopianPhone, normalizeEthiopianPhone, supabase } from '../services/supabase.ts';
import { Lock, Phone, User, KeyRound } from 'lucide-react';

interface AuthViewProps {
  onSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const [isLoginMode, setIsLoginMode] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // Login specific
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check URL query parameters for referral link "?ref_by=USER_ID"
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refBy = params.get('ref_by');
      if (refBy) {
        setInviteCode(refBy.toUpperCase());
        // If arrived via invitation link, default to register mode
        setIsLoginMode(false);
      }
    } catch (e) {
      console.warn('Could not read ref_by parameter:', e);
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      const res = store.register({ name: fullName.trim() || 'Diamond Mine Member', phone, password, confirmPassword, inviteCode });
      if (res.success) {
        setSuccessMessage(res.message);
        setTimeout(onSuccess, 500);
      } else setErrorMessage(res.message);
      return;
    }

    const normalizedPhone = normalizeEthiopianPhone(phone);
    if (!isValidEthiopianPhone(normalizedPhone)) {
      setErrorMessage('Enter a valid Ethiopian mobile number, for example +251911234567.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password,
        options: { data: { name: fullName.trim() || 'Diamond Mine Member', inviteCode: inviteCode.trim().toUpperCase() || null } },
      });
      if (error) throw error;
      if (data.session?.user) {
        const profile = await fetchDmaProfile(data.session.user);
        store.setAuthenticatedUser(profile);
        setSuccessMessage('Account created successfully.');
        setTimeout(onSuccess, 400);
      } else {
        throw new Error('Supabase did not create a session. For signup without SMS, turn OFF phone confirmation in Supabase Authentication settings. This flow cannot continue if phone verification is required.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Registration failed. Check Supabase phone-auth settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!isSupabaseConfigured || !supabase) {
      const res = store.login(loginIdentifier, loginPassword);
      if (res.success) {
        setSuccessMessage(res.message);
        setTimeout(onSuccess, 500);
      } else setErrorMessage(res.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedPhone = normalizeEthiopianPhone(loginIdentifier);
      if (!isValidEthiopianPhone(normalizedPhone)) {
        throw new Error('Enter the Ethiopian phone number used during registration, for example +251911234567.');
      }
      const { data, error } = await supabase.auth.signInWithPassword({ phone: normalizedPhone, password: loginPassword });
      if (error) throw error;
      if (!data.user) throw new Error('Login succeeded but no user was returned.');
      const profile = await fetchDmaProfile(data.user);
      if (profile.status === 'suspended') {
        await supabase.auth.signOut();
        throw new Error('This account is suspended. Contact customer support.');
      }
      store.setAuthenticatedUser(profile);
      setSuccessMessage('Logged in successfully.');
      setTimeout(onSuccess, 400);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed. Check your phone number and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center p-4">
      <div className="mb-3 max-w-md rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[10px] leading-4 font-semibold text-amber-900" role="status">{isSupabaseConfigured ? 'Phone and password sign-in are connected to Supabase. Deposit, withdrawal, and reward processing still require verification.' : 'Testing sign-in is active because Supabase environment variables are not set. Do not send real funds.'}</div>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden">
        {/* Top Brand Banner */}
        <div className="p-6 bg-gradient-to-b from-blue-50 to-white text-center border-b border-slate-100">
          <div className="w-18 h-18 rounded-2xl mx-auto overflow-hidden border border-blue-200 shadow-sm bg-white p-1">
            <img
              src={ASSETS.logo}
              alt="Diamond Mine Africa"
              className="w-full h-full object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight mt-3">
            Diamond Mine <span className="text-blue-600">Africa</span>
          </h1>
          <p className="text-xs text-amber-700 font-semibold tracking-wide mt-0.5">
            Mine Today · Grow Tomorrow
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(false);
              setErrorMessage('');
            }}
            className={`py-3 text-center transition-colors border-b-2 ${
              !isLoginMode
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 bg-slate-50 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(true);
              setErrorMessage('');
            }}
            className={`py-3 text-center transition-colors border-b-2 ${
              isLoginMode
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 bg-slate-50 hover:text-slate-800'
            }`}
          >
            Existing Login
          </button>
        </div>

        {/* Form Container */}
        <div className="p-6">
          {!isLoginMode ? (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" required minLength={2} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251 91 123 4567"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Invitation Code (Optional)
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="e.g. DMA-882190"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 uppercase"
                />
                {inviteCode && (
                  <span className="text-[10px] text-blue-600 font-semibold block mt-1">
                    ✓ Referral attribution active
                  </span>
                )}
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-semibold border border-rose-200">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 active:scale-98 shadow-md transition-all cursor-pointer mt-2"
              >
                {isSubmitting ? 'Creating account…' : 'Create Account'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsLoginMode(true)}
                  className="text-slate-600 hover:text-blue-700 text-xs font-medium"
                >
                  Existing Account? <strong className="text-blue-600">Login here</strong>
                </button>
              </div>
            </form>
          ) : (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="+251 91 123 4567"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-semibold border border-rose-200">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 active:scale-98 shadow-md transition-all cursor-pointer mt-2"
              >
                {isSubmitting ? 'Signing in…' : 'Sign In to Account'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsLoginMode(false)}
                  className="text-slate-600 hover:text-blue-700 text-xs font-medium"
                >
                  Need an account? <strong className="text-blue-600">Register now</strong>
                </button>
              </div>
            </form>
          )}


        </div>
      </div>
    </div>
  );
};

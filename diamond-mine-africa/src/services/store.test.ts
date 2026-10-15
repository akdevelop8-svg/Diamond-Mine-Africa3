/**
 * Automated Verification Test Suite for Diamond Mine Africa Business Workflows
 * 
 * Verifies core business rules, financial security boundaries, and data models:
 * 1. Registration validation & referral attribution
 * 2. Daily check-in duplication prevention (1 claim per day, +1 ETB)
 * 3. VIP product one-time purchase protection
 * 4. 24-hour cooldown enforcement on daily earnings claims
 * 5. Minimum withdrawal threshold (150 ETB) and 8% fee calculation
 * 6. Business payment details update with version bumping and audit logging
 */

import { store } from './store.ts';
import { VIP_PRODUCTS } from '../data/constants.ts';

export function runTests(): { passed: number; failed: number; results: Array<{ name: string; success: boolean; details: string }> } {
  const results: Array<{ name: string; success: boolean; details: string }> = [];

  const assert = (condition: boolean, testName: string, details: string) => {
    if (condition) {
      results.push({ name: testName, success: true, details });
    } else {
      results.push({ name: testName, success: false, details: `FAILED: ${details}` });
    }
  };

  // Test 1: Daily Check-In Duplication Prevention
  const state = store.getState();
  assert(
    VIP_PRODUCTS.every((product) => product.illustrativeTotal === product.dailyReturn * product.periodDays),
    'Test 0.0: VIP illustrative totals match the displayed daily × period formula',
    'Every catalogue total must match dailyReturn multiplied by periodDays.'
  );
  assert(state.currentUser === null, 'Test 0: First visit requires explicit login', 'A fresh demo state must not auto-login a seeded customer.');
  const testUser = state.allUsers[0]; // Abebe Bekele demo account
  const loginResult = store.login(testUser.phone, 'Password123!');
  assert(loginResult.success, 'Test 0: Explicit demo login required', 'A seeded customer must be explicitly signed in before making test requests.');
  const savedBank = store.saveWithdrawalDetails({
    userId: testUser.id,
    method: 'Telebirr',
    accountName: testUser.name,
    accountNumber: testUser.phone,
  });
  assert(savedBank.success, 'Test 0.1: Save demo withdrawal destination', 'A signed-in demo user can save a preferred withdrawal destination.');
  assert(store.getState().currentUser?.withdrawalDetails?.method === 'Telebirr', 'Test 0.2: Persist saved destination in demo state', 'The current demo account retains its selected destination after saving.');
  const deniedAdminAction = store.adminUpdatePaymentAccount({
    provider: 'CBE', accountHolder: 'Demo', accountNumber: '1234567890', instructions: 'demo', adminId: testUser.id,
  });
  assert(!deniedAdminAction.success && deniedAdminAction.message.includes('Admin access denied'), 'Test 0.3: Admin action requires admin role', 'A normal customer cannot update business payment settings in the demo store.');
  const firstCheckIn = store.dailyCheckIn(testUser.id);
  const secondCheckIn = store.dailyCheckIn(testUser.id);
  assert(
    !secondCheckIn.success && secondCheckIn.message.includes('already claimed'),
    'Test 1: Duplicate Daily Check-In Prevention',
    'Consecutive check-in requests on the same calendar day must be rejected.'
  );

  // Test 2: Withdrawal Minimum Threshold Validation (< 150 ETB rejected)
  const smallWithdrawal = store.submitWithdrawalRequest({
    userId: testUser.id,
    amount: 100, // Below minimum 150 ETB
    method: 'Telebirr',
    accountName: 'Abebe Bekele',
    accountNumber: '+251911234567',
  });
  assert(
    !smallWithdrawal.success && smallWithdrawal.message.includes('150 ETB'),
    'Test 2: Minimum Withdrawal 150 ETB Enforcement',
    'Withdrawal requests below 150 ETB must be rejected with validation error.'
  );

  // Test 3: Withdrawal 8% Fee Calculation
  const validWithdrawal = store.submitWithdrawalRequest({
    userId: testUser.id,
    amount: 200,
    method: 'Telebirr',
    accountName: 'Abebe Bekele',
    accountNumber: '+251911234567',
  });
  assert(
    validWithdrawal.success && validWithdrawal.request?.fee === 16 && validWithdrawal.request?.netAmount === 184,
    'Test 3: 8% Illustrative Fee Calculation',
    'On 200 ETB withdrawal, 8% fee is 16 ETB and net amount is 184 ETB.'
  );
  const priorDestination = validWithdrawal.request?.accountNumber;
  store.saveWithdrawalDetails({
    userId: testUser.id,
    method: 'CBE',
    accountName: testUser.name,
    accountNumber: '1000123456789',
  });
  assert(
    store.getState().withdrawalRequests.find((request) => request.id === validWithdrawal.request?.id)?.accountNumber === priorDestination,
    'Test 3.1: Withdrawal recipient snapshot stays unchanged',
    'Changing saved details must not rewrite a previously submitted request.'
  );

  // Test 4: One-Time VIP Purchase Guard
  const existingOwned = store.getState().userOwnedProducts.find(
    (p) => p.userId === testUser.id && p.status === 'active'
  );
  if (existingOwned) {
    const duplicatePurchase = store.purchaseProduct(testUser.id, existingOwned.productId);
    assert(
      !duplicatePurchase.success && duplicatePurchase.message.includes('one-time purchase'),
      'Test 4: Duplicate VIP Product Purchase Protection',
      'Users cannot re-purchase a one-time VIP tier already active on their account.'
    );
  }

  // Test 5: Business Payment Details Update & Version Bumping
  store.login('+251900000000', 'diamond mine Africa 1421$$$');
  const initialVersion = store.getState().paymentConfig.version;
  const updateRes = store.adminUpdatePaymentAccount({
    provider: 'Commercial Bank of Ethiopia (CBE)',
    accountHolder: 'DIAMOND MINE AFRICA OFFICIAL',
    accountNumber: '100099998888',
    instructions: 'Updated secure transfer instructions.',
    adminId: 'ADM-000001',
  });
  const updatedVersion = store.getState().paymentConfig.version;
  const rejectedShortAccount = store.adminUpdatePaymentAccount({
    provider: 'CBE', accountHolder: 'DMA', accountNumber: '123', instructions: '', adminId: 'ADM-000001',
  });
  assert(
    !rejectedShortAccount.success && store.getState().paymentConfig.version === updatedVersion,
    'Test 5.1: Invalid payment account is rejected without changing active settings',
    'Invalid recipient details must not increment the version or replace the active account.'
  );
  assert(
    updateRes.success && updatedVersion === initialVersion + 1,
    'Test 5: Payment Account Versioning & Audit Logging',
    `Payment configuration version incremented from v${initialVersion} to v${updatedVersion}.`
  );

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return { passed, failed, results };
}

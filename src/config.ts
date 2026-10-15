/**
 * Demo-mode safety gate.
 * The default is always DEMO MODE. Setting VITE_DEMO_MODE=false does NOT activate live
 * financial features; App deliberately blocks the UI until a secure backend release exists.
 */
const configuredMode = String(import.meta.env.VITE_DEMO_MODE ?? 'true').toLowerCase();
export const IS_DEMO_MODE = configuredMode !== 'false';

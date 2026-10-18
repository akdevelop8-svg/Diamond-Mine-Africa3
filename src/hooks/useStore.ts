// Compatibility re-export: existing components import the hook from src/hooks.
// Keep a single implementation in src/useStore.ts so all views share the same store subscription.
export { useStore } from '../useStore.ts';

import { useRegisterSW } from 'virtual:pwa-register/svelte';

// Jediná registrace service workeru pro celou aplikaci.
export const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true
});

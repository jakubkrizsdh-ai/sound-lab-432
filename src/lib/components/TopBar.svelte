<script lang="ts">
  import { t } from '../i18n/index.svelte';

  let { title, onStopAll }: { title: string; onStopAll: () => void } = $props();
</script>

<header class="top">
  <div class="brand">
    <span class="name">{t('app.name')}</span>
    <span class="title">{title}</span>
  </div>
  <span class="chip tuning">{t('top.tuning')}</span>
  <div class="spacer"></div>
  <span class="chip level mono" title={t('top.audioPending')}>{t('top.master')} −24 dBFS</span>
  <button class="stop" onclick={onStopAll} aria-label={t('top.stopAllAria')}>{t('top.stopAll')}</button>
</header>

<style>
  .top {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 10px;
    border-bottom: 1px solid var(--line); background: var(--bg);
  }
  .brand { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .name { font-size: 11px; letter-spacing: 0.08em; color: var(--text-2); }
  .title { font-size: 17px; font-weight: 600; }
  .spacer { flex: 1; }
  .chip { font-size: 12px; border: 1px solid var(--line-strong); border-radius: 999px; padding: 5px 10px; color: var(--text-2); white-space: nowrap; }
  .tuning { color: var(--accent); border-color: #5a4a2a; }
  .stop {
    min-height: 44px; padding: 0 16px; border: 0; border-radius: 10px;
    background: var(--danger); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
  }
  @media (max-width: 899px) {
    .tuning, .level { display: none; }
    .brand .title { font-size: 17px; }
  }
  @media (min-width: 900px) {
    .brand { flex-direction: row; align-items: baseline; gap: 14px; }
    .name { font-size: 13px; font-weight: 600; color: var(--text); }
    .title { font-size: 13px; font-weight: 400; color: var(--text-2); }
  }
</style>

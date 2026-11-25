<script lang="ts">
  import { i18n, LOCALES, setLocale, t } from '../i18n/index.svelte';
  import { offlineReady } from '../pwa';
  import SoundCard from './SoundCard.svelte';
  import TuningCard from './TuningCard.svelte';
</script>

<section class="settings">
  <p class="intro">{t('settings.intro')}</p>

  <div class="card">
    <h2>{t('settings.language')}</h2>
    <div class="seg" role="radiogroup" aria-label={t('settings.language')}>
      {#each LOCALES as l (l.id)}
        <button role="radio" aria-checked={i18n.locale === l.id} class:on={i18n.locale === l.id} onclick={() => setLocale(l.id)}>
          {l.label}
        </button>
      {/each}
    </div>
  </div>

  <SoundCard />
  <TuningCard />

  <div class="card">
    <h2>{t('settings.offline')}</h2>
    <p class="status"><span class="dot" class:ready={$offlineReady}></span>
      {$offlineReady ? t('settings.offlineReady') : t('settings.offlinePending')}</p>
    <h2>{t('settings.install')}</h2>
    <p>{t('settings.installHint')}</p>
  </div>

  <div class="card">
    <h2>{t('settings.safety')}</h2>
    <p>{t('settings.safetyText')}</p>
  </div>

  <p class="ver mono">{t('settings.version')} {__APP_VERSION__}</p>
</section>

<style>
  .settings { max-width: 720px; display: flex; flex-direction: column; gap: 16px; }
  .intro { margin: 0; font-size: 15px; color: var(--text-3); }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
  h2 { margin: 0; font-size: 14px; font-weight: 600; }
  p { margin: 0; font-size: 14px; line-height: 1.5; color: var(--text-3); }
  .seg { display: flex; gap: 8px; }
  .seg button { min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); cursor: pointer; }
  .seg button.on { border-color: var(--accent); color: var(--accent); background: #e0b15a1a; }
  .status { display: flex; align-items: center; gap: 8px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-2); flex: 0 0 8px; }
  .dot.ready { background: var(--ok); }
  .ver { font-size: 12px; color: var(--text-2); }
</style>

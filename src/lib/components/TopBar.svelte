<script lang="ts">
  import { t } from '../i18n/index.svelte';
  import { audio, engine, MASTER_MAX_DB, MASTER_MIN_DB, MASTER_WARN_DB } from '../audio/engine.svelte';
  import { dbfs } from '../format';
  import RecButton from './RecButton.svelte';
  import { rec } from '../recorder/store.svelte';

  let { title, onStopAll }: { title: string; onStopAll: () => void } = $props();

  const limiting = $derived(audio.reductionDb > 0.1);
  const loud = $derived(audio.masterDb > MASTER_WARN_DB);
  const statusText = $derived(
    audio.status === 'off' ? t('audio.off')
    : audio.status === 'starting' ? t('audio.starting')
    : audio.status === 'suspended' ? t('audio.suspended')
    : audio.status === 'error' ? t('audio.error') : ''
  );
</script>

<header class="top" class:recording={rec.state !== 'idle'}>
  <div class="brand">
    <span class="name">{t('app.name')}</span>
    <span class="title">{title}</span>
  </div>
  <span class="chip tuning">{t('top.tuning')}</span>
  <div class="spacer"></div>
  {#if statusText}
    <button class="chip status" onclick={() => engine.start()}>{statusText}</button>
  {/if}
  <label class="master" class:loud title={loud ? t('audio.masterWarn') : undefined}>
    <span>{t('top.master')}</span>
    <input type="range" min={MASTER_MIN_DB} max={MASTER_MAX_DB} step="1" value={audio.masterDb}
      oninput={(e) => engine.setMasterDb(+e.currentTarget.value)} aria-label={t('sound.master')} />
    <span class="mono val">{dbfs(audio.masterDb)}</span>
  </label>
  <span class="lim" class:on={limiting} title={limiting ? t('audio.limiting') : t('audio.limiterIdle')}>
    <span class="dot" aria-hidden="true"></span><span class="lim-text">{limiting ? `−${audio.reductionDb.toFixed(1)} dB` : 'Limiter'}</span>
  </span>
  <RecButton />
  <button class="stop" onclick={onStopAll} aria-label={t('top.stopAllAria')}><span class="full">{t('top.stopAll')}</span><span class="short">STOP</span></button>
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
  .chip { font-size: 12px; border: 1px solid var(--line-strong); border-radius: 999px; padding: 5px 10px; color: var(--text-2); white-space: nowrap; background: none; }
  .tuning { color: var(--accent); border-color: #5a4a2a; }
  .status { color: var(--accent); border-color: var(--accent); cursor: pointer; min-height: 32px; }
  .master { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-2); }
  .master input { width: 140px; accent-color: var(--accent); }
  .master .val { min-width: 70px; color: var(--text); }
  .master.loud .val { color: #f0a35a; }
  .lim { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-2); min-width: 86px; }
  .lim .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ok); }
  .lim.on { color: #f0c87a; }
  .lim.on .dot { background: #f0a35a; }
  .stop {
    min-height: 44px; padding: 0 16px; border: 0; border-radius: 10px;
    background: var(--danger); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
  }
  .short { display: none; }
  @media (max-width: 899px) {
    .recording .brand { display: none; }
    .recording .full { display: none; }
    .recording .short { display: inline; }
    .recording .spacer { flex: 1 1 0; }
    .tuning, .master, .lim-text { display: none; }
    .lim { min-width: 0; }
    .status { order: 10; flex-basis: 100%; text-align: center; }
    .top { flex-wrap: wrap; }
  }
  @media (min-width: 900px) {
    .brand { flex-direction: row; align-items: baseline; gap: 14px; }
    .name { font-size: 13px; font-weight: 600; color: var(--text); }
    .title { font-size: 13px; font-weight: 400; color: var(--text-2); }
  }
</style>

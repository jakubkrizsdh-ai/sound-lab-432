<script lang="ts">
  import { t } from '../i18n/index.svelte';
  import { formatDuration } from '../audio/wav';
  import { rec, start, pause, resume, stop } from '../recorder/store.svelte';

  const active = $derived(rec.state === 'recording' || rec.state === 'paused');
  const levelPct = $derived(Math.min(100, Math.max(0, (20 * Math.log10(rec.peak + 1e-9) + 48) / 48 * 100)));
</script>

<div class="rec" class:active>
  {#if !active && rec.state !== 'saving'}
    <button class="recbtn" onclick={start} aria-label={t('rec.start')} title={t('rec.start')}>
      <span class="dot" aria-hidden="true"></span><span class="txt">REC</span>
    </button>
  {:else if rec.state === 'saving'}
    <span class="saving">{t('rec.saving')}</span>
  {:else}
    <span class="time mono" class:blink={rec.state === 'recording'} aria-live="off">
      <span class="dot" aria-hidden="true"></span>{formatDuration(rec.seconds)}
    </span>
    <span class="meter" aria-hidden="true"><span style:width={`${levelPct}%`} class:hot={rec.peak > 0.89}></span></span>
    {#if rec.state === 'recording'}
      <button class="ctl" onclick={pause} aria-label={t('rec.pause')} title={t('rec.pause')}>❚❚</button>
    {:else}
      <button class="ctl" onclick={resume} aria-label={t('rec.resume')} title={t('rec.resume')}>●</button>
    {/if}
    <button class="ctl stop" onclick={() => stop()} aria-label={t('rec.stop')} title={t('rec.stop')}>■</button>
  {/if}
</div>

<style>
  .rec { display: flex; align-items: center; gap: 6px; }
  .recbtn { display: flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 12px; border-radius: 10px; border: 1px solid #c8423b; background: none; color: #ff8d86; font-weight: 700; font-size: 12px; letter-spacing: 0.06em; cursor: pointer; }
  .dot { width: 11px; height: 11px; border-radius: 50%; background: #e5483f; display: inline-block; }
  .active { border: 1px solid #c8423b; border-radius: 10px; padding: 2px 4px 2px 10px; background: #c8423b1a; }
  .time { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #ffd2cf; min-width: 58px; }
  .blink .dot { animation: blink 1s steps(2, start) infinite; }
  @keyframes blink { to { visibility: hidden; } }
  .meter { width: 46px; height: 6px; border-radius: 3px; background: #ffffff14; overflow: hidden; }
  .meter span { display: block; height: 100%; background: var(--ok); }
  .meter span.hot { background: #f0a35a; }
  .ctl { width: 38px; height: 38px; border-radius: 8px; border: 0; background: #ffffff12; color: var(--text); cursor: pointer; font-size: 13px; }
  .ctl.stop { color: #ff8d86; }
  .saving { font-size: 12px; color: var(--text-2); }
  @media (max-width: 899px) {
    .txt, .meter { display: none; }
    .recbtn { padding: 0 12px; }
  }
</style>

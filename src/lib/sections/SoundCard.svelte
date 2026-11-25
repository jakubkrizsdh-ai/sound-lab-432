<script lang="ts">
  import { i18n, t } from '../i18n/index.svelte';
  import { audio, engine, playTone, MASTER_MAX_DB, MASTER_MIN_DB, MASTER_WARN_DB } from '../audio/engine.svelte';
  import { dbfs, num } from '../format';

  async function test() {
    await engine.start();
    playTone(432, { duration: 1.5 });
  }
</script>

<div class="card">
  <h2>{t('sound.title')}</h2>
  <dl>
    <dt>{t('sound.status')}</dt>
    <dd>
      {#if audio.status === 'running'}<span class="ok">● {t('sound.statusRunning')}</span>
      {:else}<button class="btn" onclick={() => engine.start()}>{t('sound.start')}</button>{/if}
    </dd>
    {#if audio.sampleRate}
      <dt>{t('sound.sampleRate')}</dt><dd class="mono">{num(audio.sampleRate, i18n.locale)} Hz</dd>
      <dt>{t('sound.latency')}</dt>
      <dd class="mono">
        {audio.baseLatencyMs !== null ? `${num(audio.baseLatencyMs, i18n.locale, 1)} ms` : t('sound.latencyNA')}
        {#if audio.outputLatencyMs !== null} + {num(audio.outputLatencyMs, i18n.locale, 1)} ms{/if}
      </dd>
      <dt>{t('sound.limiter')}</dt>
      <dd>{audio.limiterKind === 'worklet' ? t('sound.limiterWorklet') : t('sound.limiterFallback')}</dd>
    {/if}
  </dl>
  <label class="master">
    <span class="row"><span>{t('sound.master')}</span>
      <span class="mono" class:loud={audio.masterDb > MASTER_WARN_DB}>{dbfs(audio.masterDb)}</span></span>
    <input type="range" min={MASTER_MIN_DB} max={MASTER_MAX_DB} step="1" value={audio.masterDb}
      oninput={(e) => engine.setMasterDb(+e.currentTarget.value)} />
  </label>
  {#if audio.masterDb > MASTER_WARN_DB}<p class="warn">{t('audio.masterWarn')}</p>{/if}
  <button class="btn primary" onclick={test}>{t('sound.testTone')}</button>
  <p class="hint">{t('sound.iosHint')}</p>
</div>

<style>
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
  h2 { margin: 0; font-size: 14px; font-weight: 600; }
  dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 13px; }
  dt { color: var(--text-2); }
  dd { margin: 0; text-align: right; }
  .ok { color: var(--ok); }
  .master { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
  .master .row { display: flex; justify-content: space-between; }
  .master input { width: 100%; accent-color: var(--accent); }
  .loud, .warn { color: #f0a35a; }
  .warn, .hint { margin: 0; font-size: 12px; }
  .hint { color: var(--text-2); }
  .btn { min-height: 44px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--accent); background: none; color: var(--accent); cursor: pointer; }
  .btn.primary { background: #e0b15a1a; }
</style>

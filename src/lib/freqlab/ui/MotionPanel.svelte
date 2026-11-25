<script lang="ts">
  import { t } from '../../i18n/index.svelte';
  import { glissandoPlan, stepsPlan, sweepPlan, type Curve, type Step } from '../../audio/automation';
  import { lab, runMotion, stopMotion, type MotionKind } from '../store.svelte';
  import HzInput from './HzInput.svelte';
  import NotePicker from './NotePicker.svelte';

  let { id, freq }: { id: string; freq: number } = $props();

  let mode = $state<MotionKind>('sweep');
  let sweepFrom = $state(128);
  let sweepTo = $state(512);
  let sweepDur = $state(8);
  let curve = $state<Curve>('exponential');
  let sweepLoop = $state(false);
  let glissTo = $state(486);
  let glissDur = $state(2);
  let pickGliss = $state(false);
  let steps = $state<Step[]>([
    { hz: 256, hold: 2, glide: 0.5 },
    { hz: 384, hold: 2, glide: 0.5 },
    { hz: 432, hold: 2, glide: 0.5 }
  ]);
  let stepsLoop = $state(true);

  const active = $derived(lab.motion[id]);
  const secs = (v: string, min = 0) => Math.max(min, Math.min(600, parseFloat(v.replace(',', '.')) || 0));

  function run() {
    if (mode === 'sweep') void runMotion(id, 'sweep', sweepPlan(sweepFrom, sweepTo, Math.max(0.1, sweepDur), curve, sweepLoop));
    else if (mode === 'glissando') void runMotion(id, 'glissando', glissandoPlan(freq, glissTo, Math.max(0.05, glissDur)));
    else if (steps.length) void runMotion(id, 'steps', stepsPlan(freq, $state.snapshot(steps), stepsLoop));
  }
</script>

<div class="motion">
  <div class="tabs" role="tablist">
    {#each ['sweep', 'glissando', 'steps'] as const as m (m)}
      <button role="tab" aria-selected={mode === m} class:on={mode === m} onclick={() => (mode = m)}>{t(`lab.motion.${m}`)}</button>
    {/each}
  </div>

  {#if mode === 'sweep'}
    <div class="grid">
      <label><span>{t('lab.from')} (Hz)</span><HzInput value={sweepFrom} onchange={(v) => (sweepFrom = v)} label={t('lab.from')} /></label>
      <label><span>{t('lab.to')} (Hz)</span><HzInput value={sweepTo} onchange={(v) => (sweepTo = v)} label={t('lab.to')} /></label>
      <label><span>{t('lab.duration')} (s)</span><input class="num mono" inputmode="decimal" value={sweepDur} onchange={(e) => (sweepDur = secs(e.currentTarget.value, 0.1))} /></label>
    </div>
    <div class="row">
      <div class="seg">
        <button class:on={curve === 'exponential'} onclick={() => (curve = 'exponential')}>{t('lab.curve.exponential')}</button>
        <button class:on={curve === 'linear'} onclick={() => (curve = 'linear')}>{t('lab.curve.linear')}</button>
      </div>
      <label class="check"><input type="checkbox" bind:checked={sweepLoop} /> {t('lab.loop')}</label>
    </div>
    <p class="hint">{t('lab.sweepHint')}</p>
  {:else if mode === 'glissando'}
    <div class="grid">
      <label><span>{t('lab.to')} (Hz)</span><HzInput value={glissTo} onchange={(v) => (glissTo = v)} label={t('lab.to')} /></label>
      <label><span>{t('lab.duration')} (s)</span><input class="num mono" inputmode="decimal" value={glissDur} onchange={(e) => (glissDur = secs(e.currentTarget.value, 0.05))} /></label>
    </div>
    <button class="link" onclick={() => (pickGliss = !pickGliss)}>{t('lab.pickNote')}</button>
    {#if pickGliss}<NotePicker onpick={(p) => { glissTo = p.hz; pickGliss = false; }} />{/if}
  {:else}
    <div class="steps">
      <div class="shead"><span>Hz</span><span>{t('lab.hold')} (s)</span><span>{t('lab.glide')} (s)</span><span></span></div>
      {#each steps as s, i (i)}
        <div class="srow">
          <HzInput value={s.hz} onchange={(v) => (steps[i] = { ...s, hz: v })} label={`Hz ${i + 1}`} />
          <input class="num mono" inputmode="decimal" value={s.hold} aria-label={t('lab.hold')} onchange={(e) => (steps[i] = { ...s, hold: secs(e.currentTarget.value) })} />
          <input class="num mono" inputmode="decimal" value={s.glide} aria-label={t('lab.glide')} onchange={(e) => (steps[i] = { ...s, glide: secs(e.currentTarget.value) })} />
          <button class="x" aria-label={t('lab.remove')} onclick={() => (steps = steps.filter((_, j) => j !== i))}>×</button>
        </div>
      {/each}
      <div class="row">
        <button class="link" disabled={steps.length >= 12} onclick={() => (steps = [...steps, { hz: steps.at(-1)?.hz ?? freq, hold: 2, glide: 0.5 }])}>+ {t('lab.addStep')}</button>
        <label class="check"><input type="checkbox" bind:checked={stepsLoop} /> {t('lab.loop')}</label>
      </div>
    </div>
  {/if}

  <div class="actions">
    {#if active}
      <button class="btn" onclick={() => stopMotion(id)}>{t('lab.stopMotion')}</button>
    {:else}
      <button class="btn primary" onclick={run}>{t('lab.runMotion')}</button>
    {/if}
  </div>
</div>

<style>
  .motion { display: flex; flex-direction: column; gap: 10px; }
  .tabs { display: flex; gap: 4px; }
  .tabs button { flex: 1; min-height: 36px; border-radius: 8px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); font-size: 12px; cursor: pointer; }
  .tabs button.on { border-color: var(--accent); color: var(--accent); background: #e0b15a14; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 10px; }
  label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--text-2); }
  .num { min-height: 44px; width: 100%; background: transparent; border: 0; border-bottom: 1px solid var(--line-strong); color: var(--text); font-size: 16px; text-align: right; padding: 0 4px; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .seg { display: flex; gap: 4px; }
  .seg button { min-height: 36px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); font-size: 12px; cursor: pointer; }
  .seg button.on { border-color: var(--accent); color: var(--accent); }
  .check { flex-direction: row; align-items: center; gap: 6px; font-size: 13px; color: var(--text-3); min-height: 36px; }
  .hint { margin: 0; font-size: 11px; color: var(--text-2); }
  .steps { display: flex; flex-direction: column; gap: 6px; }
  .shead, .srow { display: grid; grid-template-columns: 1.4fr 1fr 1fr 36px; gap: 8px; align-items: center; }
  .shead { font-size: 11px; color: var(--text-2); }
  .srow :global(.hz) { font-size: 16px; }
  .x { min-height: 36px; border: 0; background: none; color: var(--text-2); font-size: 18px; cursor: pointer; }
  .link { align-self: flex-start; min-height: 36px; border: 0; background: none; color: var(--accent); font-size: 13px; cursor: pointer; padding: 0; }
  .actions { display: flex; }
  .btn { flex: 1; min-height: 44px; border-radius: 10px; border: 1px solid var(--accent); background: none; color: var(--accent); font-weight: 600; cursor: pointer; }
  .btn.primary { background: #e0b15a1a; }
</style>

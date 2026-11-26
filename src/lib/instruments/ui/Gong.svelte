<script lang="ts">
  import { i18n, t } from '../../i18n/index.svelte';
  import { num } from '../../format';
  import type { Pitch } from '../../tuning/systems';
  import { press } from './press';
  import Glow from './Glow.svelte';

  let { notes }: { notes: Pitch[] } = $props();
  let chosen = $state(0);
  const p = $derived(notes[Math.min(chosen, notes.length - 1)]!);
  const key = $derived(`gong-${p.source.degree}${p.source.octave}`);
</script>

<div class="wrap">
  <button class="gong" use:press={{ key, pitch: p, position: true }} aria-label={`Gong ${p.source.degree}${p.source.octave} ${num(p.hz, i18n.locale, 2)} Hz`}>
    <span class="disc"></span>
    <Glow k={key} dur={6} />
    <span class="label"><span class="n">{p.source.degree}<sub>{p.source.octave}</sub></span><span class="hz">{num(p.hz, i18n.locale, 2)} Hz</span></span>
  </button>
  <p class="hint">{t('ins.gongHint')}</p>
  <div class="chips" role="radiogroup" aria-label={t('ins.gongPitch')}>
    {#each notes as n, i (i)}
      <button role="radio" aria-checked={chosen === i} class:on={chosen === i} onclick={() => (chosen = i)}>{n.source.degree}<sub>{n.source.octave}</sub></button>
    {/each}
  </div>
</div>

<style>
  .wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .gong { position: relative; width: min(86vw, 440px); aspect-ratio: 1; border: 0; padding: 0; background: none; border-radius: 50%; cursor: pointer; color: #fff; touch-action: none; -webkit-tap-highlight-color: transparent; }
  .disc {
    position: absolute; inset: 0; border-radius: 50%;
    background:
      radial-gradient(circle at 50% 50%, #c79a4a 0%, #a97b30 14%, #6b4a1c 16%, #8f6a2a 30%, #b88a3e 52%, #7a5622 70%, #c69a50 88%, #4a3214 100%);
    box-shadow: 0 20px 50px #000000aa, inset 0 0 0 2px #d9b06a;
  }
  .label { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; pointer-events: none; text-shadow: 0 1px 3px #000; }
  .n { font-size: 26px; font-weight: 600; }
  .hz { font-family: var(--mono); font-size: 13px; }
  .hint { margin: 0; font-size: 12px; color: var(--text-2); text-align: center; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
  .chips button { min-width: 44px; min-height: 40px; border-radius: 999px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); cursor: pointer; }
  .chips button.on { border-color: var(--accent); color: var(--accent); background: #e0b15a1a; }
</style>

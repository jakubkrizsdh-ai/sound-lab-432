<script lang="ts">
  import { i18n } from '../../i18n/index.svelte';
  import { num } from '../../format';
  import type { Pitch } from '../../tuning/systems';
  import { inst } from '../store.svelte';
  import { press } from './press';
  import Glow from './Glow.svelte';

  let { notes, crystal = false, keys }: { notes: Pitch[]; crystal?: boolean; keys: string[] } = $props();
  const low = $derived(Math.min(...notes.map(n => n.hz)));
  const size = (hz: number) => Math.round(100 * (low / hz) ** 0.35);
  const id = (p: Pitch) => `${p.source.degree}${p.source.octave}`;
</script>

<div class="bowls">
  {#each notes as p, i (id(p))}
    <button class="bowl" class:crystal class:held={inst.held[id(p)]}
      style:--s={size(p.hz)}
      use:press={{ key: id(p), pitch: p, position: true }}
      aria-label={`${p.source.degree}${p.source.octave} ${num(p.hz, i18n.locale, 2)} Hz`}>
      <span class="rim"></span>
      <Glow k={id(p)} dur={3} />
      <span class="label">
        <span class="n">{p.source.degree}<sub>{p.source.octave}</sub></span>
        <span class="hz">{num(p.hz, i18n.locale, 2)}</span>
        <span class="k">{keys[i] ?? ''}</span>
      </span>
    </button>
  {/each}
</div>

<style>
  .bowls { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px; padding: 10px 0; touch-action: none; user-select: none; -webkit-user-select: none; }
  .bowl {
    position: relative; width: calc(var(--s) * 0.5px + 52px); aspect-ratio: 1; border: 0; padding: 0; border-radius: 50%;
    background: none; color: #f2f3f5; cursor: pointer; -webkit-tap-highlight-color: transparent;
    display: flex; align-items: center; justify-content: center;
  }
  @media (min-width: 900px) { .bowl { width: calc(var(--s) * 1.8px + 64px); } }
  .rim {
    position: absolute; inset: 0; border-radius: 50%;
    background: radial-gradient(circle at 50% 50%, #1a1410 0%, #3b2c1c 42%, #8a6a3c 62%, #c9a15e 70%, #6b5030 78%, #2a2015 100%);
    box-shadow: 0 10px 24px #00000080, inset 0 0 0 1px #9c7a46;
  }
  .crystal .rim {
    background: radial-gradient(circle at 50% 50%, #1b2026 0%, #2a3038 45%, #dfe6ee 63%, #ffffff 68%, #b9c3cf 74%, #3a424c 100%);
    box-shadow: 0 10px 24px #00000080, inset 0 0 0 1px #c8d2de;
  }
  .held .rim { box-shadow: 0 0 0 3px var(--accent), 0 0 30px #e0b15a66; }
  .label { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; pointer-events: none; line-height: 1; }
  .n { font-weight: 600; font-size: 16px; }
  .hz { font-family: var(--mono); font-size: 11px; color: #d9dde3; }
  .k { font-family: var(--mono); font-size: 10px; color: #a2a9b2; }
  @media (pointer: coarse) { .k { display: none; } }
</style>

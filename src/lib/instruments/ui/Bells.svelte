<script lang="ts">
  import { i18n } from '../../i18n/index.svelte';
  import { num } from '../../format';
  import type { Pitch } from '../../tuning/systems';
  import { press } from './press';
  import Glow from './Glow.svelte';

  let { notes, keys }: { notes: Pitch[]; keys: string[] } = $props();
  const low = $derived(Math.min(...notes.map(n => n.hz)));
  const id = (p: Pitch) => `${p.source.degree}${p.source.octave}`;
</script>

<div class="bells">
  {#each notes as p, i (id(p))}
    <button class="bell" style:--s={(low / p.hz) ** 0.4}
      use:press={{ key: id(p), pitch: p }}
      aria-label={`${p.source.degree}${p.source.octave} ${num(p.hz, i18n.locale, 2)} Hz`}>
      <svg viewBox="0 0 60 70" aria-hidden="true">
        <path d="M30 4c-4 0-6 3-6 6v2C14 15 11 25 11 36c0 9-3 15-7 19v4h52v-4c-4-4-7-10-7-19 0-11-3-21-13-24v-2c0-3-2-6-6-6z" fill="url(#bg)" stroke="#d7b46e" stroke-width="1"/>
        <circle cx="30" cy="64" r="4" fill="#b08a4a"/>
        <defs><linearGradient id="bg" x1="0" x2="1"><stop offset="0" stop-color="#6e5428"/><stop offset="0.45" stop-color="#e6c57e"/><stop offset="1" stop-color="#7a5c2c"/></linearGradient></defs>
      </svg>
      <Glow k={id(p)} dur={2} />
      <span class="n">{p.source.degree}<sub>{p.source.octave}</sub></span>
      <span class="hz">{num(p.hz, i18n.locale, 1)}</span>
      <span class="k">{keys[i] ?? ''}</span>
    </button>
  {/each}
</div>

<style>
  .bells { display: grid; grid-template-columns: repeat(auto-fit, minmax(64px, 1fr)); gap: 8px; align-items: end; touch-action: none; user-select: none; -webkit-user-select: none; padding: 10px 0; }
  .bell { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; border: 0; background: none; color: var(--text); cursor: pointer; padding: 6px 0; min-height: 120px; justify-content: flex-end; -webkit-tap-highlight-color: transparent; }
  svg { width: calc(100% * var(--s)); max-width: 90px; min-width: 40px; height: auto; pointer-events: none; }
  .n { font-weight: 600; font-size: 14px; pointer-events: none; }
  .hz { font-family: var(--mono); font-size: 10.5px; color: var(--text-2); pointer-events: none; }
  .k { font-family: var(--mono); font-size: 10px; color: #8a929c; pointer-events: none; }
  @media (pointer: coarse) { .k { display: none; } }
</style>

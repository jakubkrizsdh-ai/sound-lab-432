<script lang="ts">
  import { i18n } from '../../i18n/index.svelte';
  import { num } from '../../format';
  import type { Pitch } from '../../tuning/systems';
  import { isBlackKey } from '../defs';
  import { inst } from '../store.svelte';
  import { press } from './press';
  import Glow from './Glow.svelte';

  let { notes, keys }: { notes: Pitch[]; keys: string[] } = $props();
  const id = (p: Pitch) => `${p.source.degree}${p.source.octave}`;

  const layout = $derived.by(() => {
    const whites: { p: Pitch; i: number }[] = [];
    const blacks: { p: Pitch; i: number; left: number }[] = [];
    notes.forEach((p, i) => {
      if (isBlackKey(p.source.degree)) blacks.push({ p, i, left: whites.length });
      else whites.push({ p, i });
    });
    return { whites, blacks, n: whites.length };
  });
</script>

<div class="keys" style:--n={layout.n}>
  {#each layout.whites as w (id(w.p))}
    <button class="white" class:held={inst.held[id(w.p)]} use:press={{ key: id(w.p), pitch: w.p }}
      aria-label={`${w.p.source.degree}${w.p.source.octave} ${num(w.p.hz, i18n.locale, 2)} Hz`}>
      <Glow k={id(w.p)} dur={0.8} round={false} />
      <span class="lbl">
        <span class="k">{keys[w.i] ?? ''}</span>
        <span class="n">{w.p.source.degree}<sub>{w.p.source.octave}</sub></span>
        <span class="hz">{num(w.p.hz, i18n.locale, w.p.hz < 1000 ? 1 : 0)}</span>
      </span>
    </button>
  {/each}
  {#each layout.blacks as b (id(b.p))}
    <button class="black" class:held={inst.held[id(b.p)]} style:left={`calc(${b.left} * 100% / var(--n) - 100% / var(--n) * 0.3)`}
      use:press={{ key: id(b.p), pitch: b.p }}
      aria-label={`${b.p.source.degree}${b.p.source.octave} ${num(b.p.hz, i18n.locale, 2)} Hz`}>
      <Glow k={id(b.p)} dur={0.8} round={false} />
      <span class="lbl"><span class="k">{keys[b.i] ?? ''}</span><span class="n">{b.p.source.degree}</span></span>
    </button>
  {/each}
</div>

<style>
  .keys { position: relative; display: flex; height: 220px; touch-action: none; user-select: none; -webkit-user-select: none; border-radius: 0 0 10px 10px; overflow: hidden; box-shadow: 0 12px 30px #00000088; }
  .white {
    position: relative; flex: 1 1 0; min-width: 0; border: 0; border-right: 1px solid #b9bec5; padding: 0; cursor: pointer;
    background: linear-gradient(180deg, #e9ecef, #ffffff 85%, #dfe3e7); border-radius: 0 0 6px 6px; color: #20242a;
    display: flex; align-items: flex-end; justify-content: center; -webkit-tap-highlight-color: transparent;
  }
  .black {
    position: absolute; top: 0; width: calc(100% / var(--n) * 0.6); height: 60%; border: 0; padding: 0; cursor: pointer; z-index: 2;
    background: linear-gradient(180deg, #2a2e34, #121417 90%); border-radius: 0 0 5px 5px; color: #c9ced6;
    display: flex; align-items: flex-end; justify-content: center; box-shadow: 0 3px 6px #00000099; -webkit-tap-highlight-color: transparent;
  }
  .white.held { background: linear-gradient(180deg, #e0b15a55, #fff3d6); }
  .black.held { background: linear-gradient(180deg, #6a5326, #2a2210); }
  .lbl { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; padding-bottom: 8px; pointer-events: none; line-height: 1; }
  .n { font-weight: 600; font-size: 12px; }
  .hz { font-family: var(--mono); font-size: 9.5px; color: #59606a; }
  .k { font-family: var(--mono); font-size: 9.5px; color: #8a929c; }
  @media (pointer: coarse) { .k { display: none; } }
  @media (max-width: 480px) { .hz { display: none; } .keys { height: 190px; } }
</style>

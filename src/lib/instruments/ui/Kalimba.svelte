<script lang="ts">
  import { i18n } from '../../i18n/index.svelte';
  import { num } from '../../format';
  import type { Pitch } from '../../tuning/systems';
  import { kalimbaOrder, tineLength } from '../defs';
  import { press } from './press';
  import Glow from './Glow.svelte';

  let { notes, keys }: { notes: Pitch[]; keys: string[] } = $props();
  const order = $derived(kalimbaOrder(notes.length));
  const low = $derived(notes[0]?.hz ?? 1);
  const id = (p: Pitch) => `${p.source.degree}${p.source.octave}`;
</script>

<div class="kalimba">
  <div class="tines">
    {#each order as idx (idx)}
      {@const p = notes[idx]!}
      <button class="tine" style:--l={tineLength(p.hz, low)}
        use:press={{ key: id(p), pitch: p }}
        aria-label={`${p.source.degree}${p.source.octave} ${num(p.hz, i18n.locale, 2)} Hz`}>
        <span class="metal"><Glow k={id(p)} dur={1.2} round={false} /></span>
        <span class="n">{p.source.degree}<sub>{p.source.octave}</sub></span>
        <span class="k">{keys[idx] ?? ''}</span>
      </button>
    {/each}
  </div>
  <div class="bridge" aria-hidden="true"></div>
  <div class="body" aria-hidden="true"><span class="hole"></span></div>
</div>

<style>
  .kalimba { position: relative; width: 100%; max-width: 640px; align-self: center; box-sizing: border-box; border-radius: 18px 18px 40px 40px; background: linear-gradient(180deg, #6b4526, #4a2f19); padding: 14px 10px 0; box-shadow: 0 16px 40px #000000aa; touch-action: none; user-select: none; -webkit-user-select: none; }
  .tines { display: flex; justify-content: center; align-items: flex-end; gap: 3px; height: 260px; }
  .tine { position: relative; flex: 1 1 0; max-width: 40px; min-width: 0; height: calc(100% * var(--l)); border: 0; padding: 0; background: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 4px; color: #1b1b1b; -webkit-tap-highlight-color: transparent; }
  .metal { position: relative; display: block; width: 100%; flex: 1; border-radius: 6px 6px 3px 3px; background: linear-gradient(90deg, #8d939b, #eef1f4 45%, #a9afb7 70%, #7c828a); box-shadow: inset 0 -2px 0 #00000044; overflow: hidden; }
  .n { position: absolute; bottom: 22px; font-weight: 700; font-size: 12px; pointer-events: none; }
  .k { position: absolute; bottom: 6px; font-family: var(--mono); font-size: 9.5px; color: #333; pointer-events: none; }
  @media (pointer: coarse) { .k { display: none; } .n { bottom: 8px; } }
  .bridge { height: 10px; margin: 0 -10px; background: linear-gradient(180deg, #c0c6cd, #6c727a); }
  .body { height: 70px; display: flex; align-items: center; justify-content: center; }
  .hole { width: 46px; height: 46px; border-radius: 50%; background: #1a0f07; box-shadow: inset 0 3px 6px #000; }
</style>

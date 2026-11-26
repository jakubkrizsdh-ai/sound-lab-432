<script lang="ts">
  import { i18n, t } from '../../i18n/index.svelte';
  import { num } from '../../format';
  import type { Field } from '../model';
  import { hp } from '../store.svelte';

  let { fields, edit = false, selected = null, onhit, onselect, keyLabels = {} }: {
    fields: Field[];
    keyLabels?: Record<number, string>;
    edit?: boolean;
    selected?: number | null;
    onhit: (f: Field, velocity: number) => void;
    onselect?: (f: Field) => void;
  } = $props();

  /** Síla úderu: z tlaku (pero, zařízení s tlakem), jinak z posuvníku. Střed pole zní o kousek silněji. */
  function velocityFor(e: PointerEvent, f: Field): number {
    let v = hp.velocity;
    const hasPressure = e.pressure > 0 && e.pressure !== 0.5 && e.pointerType !== 'mouse';
    if (hasPressure) v = 0.25 + 0.75 * e.pressure;
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const fromCenter = Math.min(1, Math.hypot(dx, dy));
    v *= 1.05 - 0.15 * fromCenter;
    void f;
    return Math.min(1, Math.max(0.05, v));
  }

  function down(e: PointerEvent, f: Field) {
    e.preventDefault();
    if (edit) onselect?.(f);
    onhit(f, velocityFor(e, f));
  }
</script>

<div class="drum" role="group" aria-label={t('hp.drum')}>
  <div class="shell" aria-hidden="true"></div>
  {#each fields as f (f.index)}
    {@const h = hp.hits[f.index]}
    <button
      class="pad {f.kind}"
      class:sel={edit && selected === f.index}
      style:left={`${(f.x - f.w / 2) * 100}%`}
      style:top={`${(f.y - f.h / 2) * 100}%`}
      style:width={`${f.w * 100}%`}
      style:height={`${f.h * 100}%`}
      aria-label={`${f.note[0]}${f.note[1]} ${num(f.pitch.hz, i18n.locale, 2)} Hz`}
      onpointerdown={(e) => down(e, f)}
      oncontextmenu={(e) => e.preventDefault()}
    >
      <span class="shape" style:transform={`rotate(${f.rot}deg)`}></span>
      {#if h}
        {#key h.n}
          <span class="glow" style:--v={h.v} style:--d={`${Math.max(0.6, hp.decay * 0.5)}s`} style:transform={`rotate(${f.rot}deg)`}></span>
        {/key}
      {/if}
      <span class="label">
        <span class="n">{f.note[0]}<sub>{f.note[1]}</sub></span>
        <span class="hz">{num(f.pitch.hz, i18n.locale, f.pitch.hz % 1 ? 2 : 0)}</span>
        <span class="k">{keyLabels[f.index] ?? ''}</span>
      </span>
    </button>
  {/each}
</div>

<style>
  .drum {
    position: relative; width: 100%; aspect-ratio: 1; max-width: 560px; margin: 0 auto;
    touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
  }
  .shell {
    position: absolute; inset: 0; border-radius: 50%;
    background: radial-gradient(circle at 40% 34%, #454b54 0%, #2a2f36 45%, #181b20 85%, #121417 100%);
    box-shadow: inset 0 0 0 1px #3d434c, inset 0 -18px 40px #00000066, 0 18px 50px #00000088;
  }
  .pad {
    position: absolute; padding: 0; border: 0; background: none; cursor: pointer; color: #f2f3f5;
    display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent;
  }
  .shape, .glow { position: absolute; inset: 0; border-radius: 50%; pointer-events: none; }
  .shape {
    background: radial-gradient(ellipse at 50% 40%, #59606a 0%, #3a4048 55%, #2b3036 100%);
    box-shadow: inset 0 1px 0 #6a717b, inset 0 -3px 8px #00000055, 0 0 0 1px #4a515a;
  }
  .ding .shape { background: radial-gradient(circle at 46% 38%, #646b75 0%, #424851 55%, #30353c 100%); }
  .bottom .shape { background: radial-gradient(ellipse at 50% 40%, #3f454d, #262a30); border: 1px dashed #5a616a; box-shadow: none; }
  .pad.sel .shape { box-shadow: 0 0 0 2px var(--accent); }
  .glow {
    background: radial-gradient(ellipse, #e0b15aaa 0%, #e0b15a33 55%, transparent 75%);
    box-shadow: 0 0 calc(30px * var(--v)) #e0b15a88;
    animation: fade var(--d) ease-out forwards;
  }
  @keyframes fade { from { opacity: calc(0.35 + 0.65 * var(--v)); } to { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .glow { animation-duration: 0.3s; } }
  .label { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; pointer-events: none; line-height: 1; }
  .n { font-weight: 600; font-size: clamp(13px, 3.4vw, 18px); }
  .ding .n { font-size: clamp(16px, 4.4vw, 22px); }
  .hz { font-family: var(--mono); font-size: clamp(9.5px, 2.4vw, 12px); color: #c9ced6; }
  .k { font-family: var(--mono); font-size: 10px; color: #8a929c; }
  @media (pointer: coarse) { .k { display: none; } }
</style>

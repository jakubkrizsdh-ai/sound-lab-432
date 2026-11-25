<script lang="ts">
  import { t } from '../../i18n/index.svelte';
  import { ADDITIVE_PARTIALS, ADDITIVE_PRESETS } from '../../audio/waves';

  let { value, onchange }: { value: number[]; onchange: (h: number[]) => void } = $props();
  const bars = $derived(Array.from({ length: ADDITIVE_PARTIALS }, (_, i) => value[i] ?? 0));

  function set(i: number, v: number) {
    const next = [...bars];
    next[i] = Math.round(v * 100) / 100;
    let end = next.length;
    while (end > 1 && !next[end - 1]) end--;
    onchange(next.slice(0, end));
  }

  function fromPointer(i: number, e: PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    set(i, Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height)));
  }
</script>

<div class="harm">
  <div class="bars">
    {#each bars as v, i (i)}
      <div class="bar" role="slider" tabindex="0" aria-label={`${t('lab.harmonic')} ${i + 1}`}
        aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(v * 100)}
        onpointerdown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); fromPointer(i, e); }}
        onpointermove={(e) => { if (e.buttons) fromPointer(i, e); }}
        onkeydown={(e) => { if (e.key === 'ArrowUp') set(i, Math.min(1, v + 0.05)); if (e.key === 'ArrowDown') set(i, Math.max(0, v - 0.05)); }}>
        <span class="fill" style:height={`calc(${v} * (100% - 14px))`}></span>
        <span class="lbl">{i + 1}</span>
      </div>
    {/each}
  </div>
  <div class="presets">
    {#each Object.keys(ADDITIVE_PRESETS) as k (k)}
      <button onclick={() => onchange([...ADDITIVE_PRESETS[k]!])}>{t(`lab.harmonics.${k}` as never)}</button>
    {/each}
  </div>
</div>

<style>
  .harm { display: flex; flex-direction: column; gap: 8px; }
  .bars { display: grid; grid-template-columns: repeat(16, 1fr); gap: 3px; height: 88px; touch-action: none; }
  .bar { position: relative; background: var(--bg); border-radius: 4px; cursor: ns-resize; overflow: hidden; }
  .fill { position: absolute; left: 0; right: 0; bottom: 14px; background: var(--signal); opacity: 0.8; max-height: calc(100% - 14px); }
  .lbl { position: absolute; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9px; color: var(--text-2); }
  .presets { display: flex; gap: 6px; flex-wrap: wrap; }
  .presets button { min-height: 36px; padding: 0 10px; border-radius: 999px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); font-size: 12px; cursor: pointer; }
</style>

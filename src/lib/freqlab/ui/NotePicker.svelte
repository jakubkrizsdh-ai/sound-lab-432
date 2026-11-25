<script lang="ts">
  import { i18n, t } from '../../i18n/index.svelte';
  import type { MessageKey } from '../../i18n/cs';
  import { PRESETS, PRESET_ORDER, pitch, type Pitch } from '../../tuning/systems';
  import { num } from '../../format';

  let { onpick }: { onpick: (p: Pitch) => void } = $props();
  type PresetId = (typeof PRESET_ORDER)[number];
  let systemId = $state<PresetId>('image432');
  let octave = $state(4);
  const sys = $derived(PRESETS[systemId]);
  const notes = $derived(sys.degrees.map(d => pitch(sys, d.name, octave)));
</script>

<div class="picker">
  <div class="row">
    <select bind:value={systemId} aria-label={t('tuning.system')}>
      {#each PRESET_ORDER as id (id)}<option value={id}>{t(`tuning.preset.${id}` as MessageKey)}</option>{/each}
    </select>
    <div class="oct" role="group" aria-label={t('tuning.octave')}>
      {#each [2, 3, 4, 5, 6] as o (o)}
        <button class:on={octave === o} onclick={() => (octave = o)}>{o}</button>
      {/each}
    </div>
  </div>
  <div class="notes">
    {#each notes as p (p.source.degree)}
      <button class="note" onclick={() => onpick(p)}>
        <span class="n">{p.source.degree}<sub>{octave}</sub></span>
        <span class="mono hz">{num(p.hz, i18n.locale, 2)}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .picker { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid var(--line-strong); border-radius: 10px; background: var(--bg); }
  .row { display: flex; gap: 8px; flex-wrap: wrap; }
  select { flex: 1 1 180px; min-height: 40px; background: var(--panel); border: 1px solid var(--line-strong); border-radius: 8px; color: var(--text); padding: 0 8px; }
  .oct { display: flex; gap: 4px; }
  .oct button { min-width: 36px; min-height: 40px; border-radius: 8px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); cursor: pointer; }
  .oct button.on { border-color: var(--accent); color: var(--accent); }
  .notes { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 6px; }
  .note { display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 48px; border-radius: 8px; border: 1px solid var(--line-strong); background: var(--panel); color: var(--text); cursor: pointer; }
  .note:hover { border-color: var(--accent); }
  .n { font-weight: 600; font-size: 14px; }
  .hz { font-size: 11px; color: var(--text-2); }
</style>

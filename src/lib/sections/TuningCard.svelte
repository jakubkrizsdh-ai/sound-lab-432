<script lang="ts">
  import { i18n, t } from '../i18n/index.svelte';
  import type { MessageKey } from '../i18n/cs';
  import { engine, playTone } from '../audio/engine.svelte';
  import { PRESETS, PRESET_ORDER, pitch, withReference, degreeRatioText, type TuningSystem } from '../tuning/systems';
  import { cents } from '../tuning/ratio';
  import { num, signedCents } from '../format';

  type PresetId = (typeof PRESET_ORDER)[number];

  let systemId = $state<PresetId>('image432');
  let compareId = $state<PresetId>('et432');
  let octave = $state(4);
  let refDegree = $state('A');
  let refHz = $state(432);
  let playing = $state<string | null>(null);

  const base = $derived(PRESETS[systemId]);
  // Při změně systému převezmi jeho výchozí referenci.
  $effect(() => {
    refDegree = base.ref.degree;
    refHz = base.ref.hz;
  });

  const system = $derived.by<TuningSystem>(() => {
    if (base.locked) return base;
    try {
      return withReference(base, { degree: refDegree, octave: 4, hz: refHz });
    } catch {
      return base;
    }
  });
  const other = $derived(PRESETS[compareId]);

  const rows = $derived(
    system.degrees.map(d => {
      const p = pitch(system, d.name, octave);
      const hasOther = other.degrees.some(x => x.name === d.name);
      const o = hasOther ? pitch(other, d.name, octave).hz : null;
      return {
        name: d.name,
        hz: p.hz,
        ratio: degreeRatioText(system, d.name) ?? '—',
        diff: o !== null ? cents(p.hz, o) : null
      };
    })
  );

  async function play(name: string, hz: number) {
    await engine.start();
    playing = name;
    const v = playTone(hz, { duration: 1.2 });
    if (v) v.onEnded = () => { if (playing === name) playing = null; };
  }

  const label = (id: PresetId) => t(`tuning.preset.${id}` as MessageKey);
</script>

<div class="card">
  <h2>{t('tuning.title')}</h2>

  <div class="grid">
    <label>
      <span>{t('tuning.system')}</span>
      <select bind:value={systemId}>
        {#each PRESET_ORDER as id (id)}<option value={id}>{label(id)}</option>{/each}
      </select>
    </label>
    <label>
      <span>{t('tuning.compareTo')}</span>
      <select bind:value={compareId}>
        {#each PRESET_ORDER as id (id)}<option value={id}>{label(id)}</option>{/each}
      </select>
    </label>
  </div>

  {#if base.locked}
    <p class="locked">{t('tuning.locked')}: C4 = 256 Hz · A4 = 432 Hz</p>
  {:else}
    <div class="ref">
      <span>{t('tuning.reference')}</span>
      <select bind:value={refDegree} aria-label={t('tuning.reference')}>
        {#each base.degrees as d (d.name)}<option value={d.name}>{d.name}4</option>{/each}
      </select>
      <span>=</span>
      <input type="number" min="1" max="20000" step="0.001" bind:value={refHz} class="mono" aria-label="Hz" />
      <span>Hz</span>
    </div>
  {/if}

  <div class="oct">
    <span>{t('tuning.octave')}</span>
    {#each [3, 4, 5] as o (o)}
      <button class:on={octave === o} onclick={() => (octave = o)}>{o}</button>
    {/each}
    <span class="tag">{t('tuning.calculated')}</span>
  </div>

  <table>
    <thead>
      <tr><th>{t('tuning.colNote')}</th><th class="r">{t('tuning.colHz')}</th><th class="r">{t('tuning.colRatio')}</th><th class="r">{t('tuning.colDiff')}</th></tr>
    </thead>
    <tbody>
      {#each rows as r (r.name)}
        <tr class:playing={playing === r.name} onclick={() => play(r.name, r.hz)}>
          <td><button class="note" aria-label={`${r.name}${octave} ${num(r.hz, i18n.locale)} Hz`}>{r.name}<sub>{octave}</sub></button></td>
          <td class="r mono">{num(r.hz, i18n.locale, 3)}</td>
          <td class="r mono">{r.ratio}</td>
          <td class="r mono">{r.diff !== null ? signedCents(r.diff, i18n.locale) : '—'}</td>
        </tr>
      {/each}
    </tbody>
  </table>
  <p class="hint">{t('tuning.tapToPlay')}</p>
</div>

<style>
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
  h2 { margin: 0; font-size: 14px; font-weight: 600; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-2); }
  select, input { min-height: 44px; background: var(--bg); border: 1px solid var(--line-strong); border-radius: 10px; color: var(--text); padding: 0 10px; font-size: 14px; }
  .ref { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; color: var(--text-2); }
  .ref input { width: 120px; }
  .locked { margin: 0; font-size: 13px; color: var(--accent); }
  .oct { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-2); }
  .oct button { min-width: 44px; min-height: 40px; border-radius: 999px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); cursor: pointer; }
  .oct button.on { border-color: var(--accent); color: var(--accent); background: #e0b15a1a; }
  .tag { margin-left: auto; font-size: 11px; color: var(--tag-calc); border: 1px solid #2d5563; border-radius: 6px; padding: 3px 7px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { font-size: 11px; font-weight: 500; color: var(--text-2); text-align: left; padding: 6px 4px; }
  td { padding: 0 4px; border-top: 1px solid var(--line); height: 44px; }
  tr { cursor: pointer; }
  tbody tr:hover { background: #ffffff06; }
  tr.playing td { color: var(--accent); }
  .r { text-align: right; }
  .note { background: none; border: 0; padding: 0; font-weight: 600; font-size: 15px; cursor: pointer; min-height: 44px; }
  .hint { margin: 0; font-size: 12px; color: var(--text-2); }
</style>

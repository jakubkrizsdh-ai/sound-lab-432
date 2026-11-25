<script lang="ts">
  import { t } from '../i18n/index.svelte';
  import { lab, add, startAll, stopAllGenerators, loadPreset } from '../freqlab/store.svelte';
  import { LIMITS } from '../freqlab/types';
  import GeneratorCard from '../freqlab/ui/GeneratorCard.svelte';
  import LabPanel from '../freqlab/ui/LabPanel.svelte';

  const anyRunning = $derived(Object.values(lab.running).some(Boolean));
</script>

<div class="lab">
  <div class="main">
    <div class="toolbar">
      <button class="btn primary" onclick={startAll}>{t('lab.startAll')}</button>
      <button class="btn" onclick={stopAllGenerators} disabled={!anyRunning}>{t('lab.stopAll')}</button>
      <button class="btn dashed" onclick={add} disabled={lab.gens.length >= LIMITS.maxGenerators}>+ {t('lab.add')}</button>
      <label class="preset">
        <span class="visually-hidden">{t('lab.presets')}</span>
        <select onchange={(e) => { const v = e.currentTarget.value; if (v) loadPreset(v as never); e.currentTarget.value = ''; }}>
          <option value="">{t('lab.presets')}…</option>
          <option value="beats">{t('lab.preset.beats')}</option>
          <option value="fifth">{t('lab.preset.fifth')}</option>
          <option value="image">{t('lab.preset.image')}</option>
        </select>
      </label>
    </div>
    <p class="intro">{t('lab.intro')}</p>
    <div class="cards">
      {#each lab.gens as g, i (g.id)}
        <GeneratorCard {g} index={i} />
      {/each}
    </div>
  </div>
  <div class="side"><LabPanel /></div>
</div>

<style>
  .lab { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
  .main { flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
  .side { flex: 1 1 300px; max-width: 420px; position: sticky; top: 0; }
  @media (max-width: 899px) { .side { max-width: none; position: static; } }
  .toolbar { display: flex; gap: 8px; flex-wrap: wrap; }
  .btn { min-height: 44px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--line-strong); background: var(--panel); color: var(--text-3); font-size: 13px; cursor: pointer; }
  .btn.primary { border-color: var(--accent); color: var(--accent); background: #e0b15a1a; font-weight: 600; }
  .btn.dashed { border-style: dashed; background: none; }
  .btn:disabled { opacity: 0.4; cursor: default; }
  .preset select { min-height: 44px; border-radius: 10px; border: 1px solid var(--line-strong); background: var(--panel); color: var(--text-3); padding: 0 10px; font-size: 13px; }
  .intro { margin: 0; font-size: 13px; color: var(--text-2); }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
  @media (max-width: 420px) { .cards { grid-template-columns: 1fr; } }
</style>

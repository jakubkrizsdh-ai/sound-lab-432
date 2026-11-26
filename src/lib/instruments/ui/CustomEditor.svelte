<script lang="ts">
  import { i18n, t } from '../../i18n/index.svelte';
  import { num } from '../../format';
  import { MODAL, defaultCustom, type Mode, type ModalDef } from '../defs';
  import { inst, setCustom } from '../store.svelte';

  const def = $derived(inst.custom);
  const upd = (patch: Partial<ModalDef>) => setCustom({ ...$state.snapshot(def), ...patch } as ModalDef);
  const updEx = (patch: Partial<ModalDef['excitation']>) => upd({ excitation: { ...def.excitation, ...patch } });
  function setMode(i: number, j: number, v: string) {
    const x = parseFloat(v.replace(',', '.'));
    if (!Number.isFinite(x)) return;
    const modes = def.modes.map(m => [...m] as Mode);
    modes[i]![j] = x;
    upd({ modes });
  }
  const startFrom = (k: string) => setCustom(k === 'default' ? defaultCustom() : structuredClone($state.snapshot(MODAL[k as keyof typeof MODAL]) as ModalDef));
</script>

<section class="card">
  <h2>{t('ins.custom.title')}</h2>
  <p class="hint">{t('ins.custom.intro')}</p>
  <label class="inline">
    <span>{t('ins.custom.startFrom')}</span>
    <select onchange={(e) => { startFrom(e.currentTarget.value); e.currentTarget.value = ''; }}>
      <option value="">…</option>
      <option value="default">{t('ins.custom.basic')}</option>
      {#each Object.keys(MODAL) as k (k)}<option value={k}>{t(`ins.name.${k}` as never)}</option>{/each}
    </select>
  </label>

  <div class="modes">
    <div class="mh"><span>{t('ins.custom.ratio')}</span><span>{t('ins.custom.amp')}</span><span>{t('ins.custom.decayShare')}</span><span>{t('ins.custom.detune')}</span><span></span></div>
    {#each def.modes as m, i (i)}
      <div class="mr">
        <input class="mono" inputmode="decimal" value={m[0]} aria-label={t('ins.custom.ratio')} onchange={(e) => setMode(i, 0, e.currentTarget.value)} />
        <input class="mono" inputmode="decimal" value={m[1]} aria-label={t('ins.custom.amp')} onchange={(e) => setMode(i, 1, e.currentTarget.value)} />
        <input class="mono" inputmode="decimal" value={m[2]} aria-label={t('ins.custom.decayShare')} onchange={(e) => setMode(i, 2, e.currentTarget.value)} />
        <input class="mono" inputmode="decimal" value={m[3]} aria-label={t('ins.custom.detune')} onchange={(e) => setMode(i, 3, e.currentTarget.value)} />
        <button class="x" aria-label={t('lab.remove')} disabled={def.modes.length <= 1} onclick={() => upd({ modes: def.modes.filter((_, j) => j !== i) })}>×</button>
      </div>
    {/each}
    <button class="link" disabled={def.modes.length >= 16} onclick={() => upd({ modes: [...def.modes, [def.modes.length + 1, 0.2, 0.4, 0]] })}>+ {t('ins.custom.addMode')}</button>
  </div>

  <label>
    <span class="lrow"><span>{t('ins.custom.decay')}</span><span class="mono v">{num(def.decay, i18n.locale, 1)} s</span></span>
    <input type="range" min="0.2" max="40" step="0.1" value={def.decay} oninput={(e) => upd({ decay: +e.currentTarget.value })} />
  </label>
  <label>
    <span class="lrow"><span>{t('ins.custom.soft')}</span><span class="mono v">{Math.round(def.excitation.soft * 100)} %</span></span>
    <input type="range" min="0" max="1" step="0.01" value={def.excitation.soft} oninput={(e) => updEx({ soft: +e.currentTarget.value })} />
  </label>
  <label>
    <span class="lrow"><span>{t('ins.custom.click')}</span><span class="mono v">{Math.round(def.excitation.noiseGain * 100)} %</span></span>
    <input type="range" min="0" max="1" step="0.01" value={def.excitation.noiseGain} oninput={(e) => updEx({ noiseGain: +e.currentTarget.value })} />
  </label>
  <label class="check"><input type="checkbox" checked={!!def.rub} onchange={(e) => upd({ rub: e.currentTarget.checked })} /> {t('ins.custom.rub')}</label>
  <p class="hint">{t('ins.custom.help')}</p>
</section>

<style>
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
  h2 { margin: 0; font-size: 14px; font-weight: 600; }
  .hint { margin: 0; font-size: 12px; color: var(--text-2); }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
  .inline { flex-direction: row; align-items: center; justify-content: space-between; gap: 8px; }
  select { min-height: 40px; background: var(--bg); border: 1px solid var(--line-strong); border-radius: 8px; color: var(--text); padding: 0 8px; }
  .modes { display: flex; flex-direction: column; gap: 4px; }
  .mh, .mr { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)) 30px; gap: 6px; align-items: center; }
  .mh { font-size: 10.5px; color: var(--text-2); }
  .mr input { min-height: 38px; width: 100%; background: var(--bg); border: 1px solid var(--line-strong); border-radius: 6px; color: var(--text); text-align: right; padding: 0 6px; font-size: 13px; }
  .x { border: 0; background: none; color: var(--text-2); font-size: 18px; cursor: pointer; min-height: 38px; }
  .link { align-self: flex-start; min-height: 36px; border: 0; background: none; color: var(--accent); font-size: 13px; cursor: pointer; padding: 0; }
  .lrow { display: flex; justify-content: space-between; }
  .v { color: var(--text-2); }
  .check { flex-direction: row; align-items: center; gap: 8px; }
  input[type='range'] { width: 100%; accent-color: var(--accent); }
  button:disabled { opacity: 0.4; }
</style>

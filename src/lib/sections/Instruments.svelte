<script lang="ts">
  import { onMount } from 'svelte';
  import { i18n, t } from '../i18n/index.svelte';
  import { num, signedCents } from '../format';
  import { cents } from '../tuning/ratio';
  import { CHROMATIC, PRESETS, pitch } from '../tuning/systems';
  import { periodMs, wavelength } from '../physics';
  import { buildFields, CHAKRA_BY_NOTE, PARTIALS, SCALES, type Field, type HandpanTuning, type ScaleId } from '../handpan/model';
  import { hp, config, hit, save, applyReverb, setCustomNote, resetCustom } from '../handpan/store.svelte';
  import Drum from '../handpan/ui/Drum.svelte';
  import { audio, engine, MASTER_MAX_DB, MASTER_MIN_DB, MASTER_WARN_DB } from '../audio/engine.svelte';
  import { dbfs } from '../format';

  const fields = $derived(buildFields(config()));
  let edit = $state(false);
  let selected = $state<number | null>(null);
  const sel = $derived(fields.find(f => f.index === selected) ?? null);

  const TUNING_IDS: HandpanTuning[] = ['pythagorean', 'et432', 'et440', 'just'];
  const SCALE_IDS: ScaleId[] = ['image', 'kurd'];

  function set<K extends 'scale' | 'tuning' | 'layout' | 'bottom' | 'velocity' | 'decay' | 'reverb'>(k: K, v: (typeof hp)[K]) {
    hp[k] = v;
    if (k === 'reverb') applyReverb();
    save();
  }

  // Klávesnice: A S D F G H J K L = pole 1–9, mezerník = Ding, Z X = spodní pole
  onMount(() => {
    const map: Record<string, number> = { Space: 0, KeyA: 1, KeyS: 2, KeyD: 3, KeyF: 4, KeyG: 5, KeyH: 6, KeyJ: 7, KeyK: 8, KeyL: 9, KeyZ: 10, KeyX: 11 };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const idx = map[e.code];
      if (idx === undefined) return;
      const f = fields.find(x => x.index === idx);
      if (!f) return;
      e.preventDefault();
      hit(f, e.shiftKey ? Math.min(1, hp.velocity + 0.25) : hp.velocity);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const info = $derived.by(() => {
    const f: Field | null = hp.last && fields.find(x => x.index === hp.last!.index) ? fields.find(x => x.index === hp.last!.index)! : fields[0] ?? null;
    if (!f) return null;
    const hz = f.pitch.hz;
    const [deg, oct] = f.note;
    const et432 = pitch(PRESETS.et432, deg, oct).hz;
    const et440 = pitch(PRESETS.et440, deg, oct).hz;
    const chakra = SCALES[hp.scale].symbolic ? CHAKRA_BY_NOTE[deg] : undefined;
    // vypočtený průběh: 3 periody součtu hlavních módů
    const pts: string[] = [];
    for (let i = 0; i <= 150; i++) {
      const tt = (i / 150) * (3 / hz);
      let y = 0;
      for (const [r, a] of PARTIALS.slice(0, 5)) y += a * hp.velocity ** (r > 1 ? 0.6 : 0) * Math.sin(2 * Math.PI * hz * r * tt);
      pts.push(`${i ? 'L' : 'M'}${(i * 2).toFixed(1)} ${(30 - (y / 1.9) * 26).toFixed(1)}`);
    }
    return { f, hz, deg, oct, ratio: f.pitch.source.ratio, c432: cents(hz, et432), c440: cents(hz, et440), chakra, path: pts.join(' ') };
  });
</script>

<div class="hp">
  <div class="stage">
    <div class="chips">
      {#each SCALE_IDS as s (s)}
        <button class:on={hp.scale === s} onclick={() => set('scale', s)}>{t(`hp.scale.${s}`)}</button>
      {/each}
    </div>
    <div class="chips">
      <button class:on={hp.layout === '8'} onclick={() => set('layout', '8')}>8 + Ding</button>
      <button class:on={hp.layout === '9'} onclick={() => set('layout', '9')}>9 + Ding</button>
      <button class:on={hp.bottom} aria-pressed={hp.bottom} onclick={() => set('bottom', !hp.bottom)}>+ {t('hp.bottom')}</button>
      <button class:on={edit} aria-pressed={edit} onclick={() => { edit = !edit; selected = null; }}>{edit ? t('hp.editDone') : t('hp.edit')}</button>
    </div>

    <Drum {fields} {edit} {selected} onhit={(f, v) => hit(f, v)} onselect={(f) => (selected = f.index)} />
    <p class="hint">{edit ? t('hp.editHint') : t('hp.playHint')}</p>

    {#if edit && sel}
      <div class="editor">
        <div class="ehead">
          <span>{t('hp.field')} {sel.index === 0 ? 'Ding' : sel.kind === 'bottom' ? `${t('hp.bottomShort')} ${sel.index - 9}` : sel.index}: <b>{sel.note[0]}{sel.note[1]}</b></span>
          <button class="link" onclick={() => setCustomNote(sel.index, null)}>{t('hp.fieldDefault')}</button>
        </div>
        <div class="notes">
          {#each CHROMATIC as d (d)}
            <button class:on={sel.note[0] === d} onclick={() => setCustomNote(sel.index, [d, sel.note[1]])}>{d}</button>
          {/each}
        </div>
        <div class="notes oct">
          {#each [2, 3, 4, 5, 6] as o (o)}
            <button class:on={sel.note[1] === o} onclick={() => setCustomNote(sel.index, [sel.note[0], o])}>{t('tuning.octave')} {o}</button>
          {/each}
        </div>
        <button class="link" onclick={resetCustom}>{t('hp.resetLayout')}</button>
      </div>
    {/if}
  </div>

  <aside class="side">
    {#if info}
      <section class="card">
        <div class="row big">
          <span class="note">{info.deg}<sub>{info.oct}</sub></span>
          <span class="mono hz">{num(info.hz, i18n.locale, 3)} Hz</span>
        </div>
        <svg viewBox="0 0 300 60" role="img" aria-label={t('hp.waveCalc')}>
          <line x1="0" y1="30" x2="300" y2="30" stroke="var(--line-strong)" />
          <path d={info.path} fill="none" stroke="var(--signal)" stroke-width="1.5" />
        </svg>
        <dl>
          {#if info.ratio}<dt>{t('hp.ratio')}</dt><dd class="mono">{info.ratio}</dd>{/if}
          <dt>{t('hp.period')}</dt><dd class="mono">{num(periodMs(info.hz), i18n.locale, 3)} ms</dd>
          <dt>{t('hp.wavelength')}</dt><dd class="mono">{num(wavelength(info.hz), i18n.locale, 3)} m</dd>
          <dt>{t('hp.vsEt432')}</dt><dd class="mono">{signedCents(info.c432, i18n.locale)}</dd>
          <dt>{t('hp.vsEt440')}</dt><dd class="mono">{signedCents(info.c440, i18n.locale)}</dd>
        </dl>
        <div class="tags">
          <span class="tag calc">{t('hp.calculated')}</span>
          {#if info.chakra}<span class="tag sym">{t('hp.symbolic')}: {info.chakra}</span>{/if}
        </div>
      </section>
    {/if}

    <section class="card">
      <label>
        <span class="lrow"><span>{t('sound.master')}</span><span class="mono v" class:loud={audio.masterDb > MASTER_WARN_DB}>{dbfs(audio.masterDb)}</span></span>
        <input type="range" min={MASTER_MIN_DB} max={MASTER_MAX_DB} step="1" value={audio.masterDb} oninput={(e) => engine.setMasterDb(+e.currentTarget.value)} />
      </label>
      {#if audio.masterDb > MASTER_WARN_DB}<p class="hint warn">{t('audio.masterWarn')}</p>{/if}
      <label>
        <span>{t('tuning.system')}</span>
        <select value={hp.tuning} onchange={(e) => set('tuning', e.currentTarget.value as HandpanTuning)}>
          {#each TUNING_IDS as id (id)}<option value={id}>{t(`hp.tuning.${id}`)}</option>{/each}
        </select>
      </label>
      <label>
        <span class="lrow"><span>{t('hp.velocity')}</span><span class="mono v">{Math.round(hp.velocity * 100)} %</span></span>
        <input type="range" min="0.1" max="1" step="0.01" value={hp.velocity} oninput={(e) => set('velocity', +e.currentTarget.value)} />
      </label>
      <label>
        <span class="lrow"><span>{t('hp.decay')}</span><span class="mono v">{num(hp.decay, i18n.locale, 1)} s</span></span>
        <input type="range" min="1" max="14" step="0.5" value={hp.decay} oninput={(e) => set('decay', +e.currentTarget.value)} />
      </label>
      <label>
        <span class="lrow"><span>{t('hp.reverb')}</span><span class="mono v">{Math.round(hp.reverb * 100)} %</span></span>
        <input type="range" min="0" max="1" step="0.01" value={hp.reverb} oninput={(e) => set('reverb', +e.currentTarget.value)} />
      </label>
      <p class="hint">{t('hp.soundNote')}</p>
    </section>
  </aside>
</div>

<style>
  .hp { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
  .stage { flex: 999 1 480px; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
  .side { flex: 1 1 300px; max-width: 420px; display: flex; flex-direction: column; gap: 14px; }
  @media (max-width: 899px) { .side { max-width: none; } }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chips button { min-height: 38px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); font-size: 12.5px; cursor: pointer; }
  .chips button.on { border-color: var(--accent); color: var(--accent); background: #e0b15a1a; }
  .hint { margin: 0; text-align: center; font-size: 12px; color: var(--text-2); }
  .editor { background: var(--panel); border: 1px solid var(--accent); border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
  .ehead { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
  .notes { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
  .notes.oct { grid-template-columns: repeat(5, 1fr); }
  .notes button { min-height: 40px; border-radius: 8px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); font-size: 13px; cursor: pointer; }
  .notes button.on { border-color: var(--accent); color: var(--accent); background: #e0b15a1a; }
  .link { align-self: flex-start; min-height: 36px; border: 0; background: none; color: var(--accent); font-size: 13px; cursor: pointer; padding: 0; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
  .row.big { display: flex; justify-content: space-between; align-items: baseline; }
  .note { font-size: 26px; font-weight: 600; }
  .hz { font-size: 19px; color: var(--accent); }
  svg { width: 100%; height: auto; }
  dl { margin: 0; display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; font-size: 13px; }
  dt { color: var(--text-2); }
  dd { margin: 0; text-align: right; }
  .tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .tag { font-size: 11px; border-radius: 6px; padding: 3px 7px; }
  .calc { color: var(--tag-calc); border: 1px solid #2d5563; }
  .sym { color: var(--tag-symbolic); border: 1px solid #4a3d63; }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
  .lrow { display: flex; justify-content: space-between; }
  .v { color: var(--text-2); }
  .loud, .warn { color: #f0a35a; }
  select { min-height: 44px; background: var(--bg); border: 1px solid var(--line-strong); border-radius: 10px; color: var(--text); padding: 0 10px; font-size: 14px; }
  input[type='range'] { width: 100%; accent-color: var(--accent); min-height: 28px; }
</style>

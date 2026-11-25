<script lang="ts">
  import { i18n, t } from '../../i18n/index.svelte';
  import { num, signedCents } from '../../format';
  import { isNoise, TONE_WAVES, NOISE_WAVES, type Wave } from '../../audio/waves';
  import { wavelength, periodMs } from '../../physics';
  import { cents } from '../../tuning/ratio';
  import { PRESETS, pitch } from '../../tuning/systems';
  import { lab, toggle, update, remove, currentFrequency, planFinished, stopMotion } from '../store.svelte';
  import { LIMITS, type GeneratorSettings } from '../types';
  import HzInput from './HzInput.svelte';
  import NotePicker from './NotePicker.svelte';
  import HarmonicEditor from './HarmonicEditor.svelte';
  import MotionPanel from './MotionPanel.svelte';

  let { g, index }: { g: GeneratorSettings; index: number } = $props();

  let showPicker = $state(false);
  let showAdvanced = $state(false);
  let showMotion = $state(false);
  let liveHz = $state<number | null>(null);

  const running = $derived(!!lab.running[g.id]);
  const moving = $derived(!!lab.motion[g.id]);
  const noise = $derived(isNoise(g.wave));
  const shownHz = $derived(moving && liveHz !== null ? liveHz : g.freq);

  // Při pohybu frekvence průběžně ukazovat vypočtenou aktuální hodnotu.
  $effect(() => {
    if (!moving) { liveHz = null; return; }
    let raf = 0;
    const tick = () => {
      liveHz = currentFrequency(g.id);
      if (planFinished(g.id)) stopMotion(g.id);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  /** Nejbližší tón rovnoměrného ladění A = 432 a odchylka v centech. */
  const nearest = $derived.by(() => {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B', 'H'];
    const st = 12 * Math.log2(shownHz / pitch(PRESETS.et432, 'C', 4).hz);
    const r = Math.round(st);
    const name = names[((r % 12) + 12) % 12]!;
    const oct = 4 + Math.floor(r / 12);
    const ref = pitch(PRESETS.et432, name, oct).hz;
    return { label: `${name}${oct}`, cents: cents(shownHz, ref) };
  });

  const setFreq = (hz: number) => update(g.id, { freq: hz, pitch: undefined });
  const nudge = (d: number) => setFreq(Math.min(LIMITS.freqMax, Math.max(LIMITS.freqMin, Math.round((g.freq + d) * 1000) / 1000)));
  const waveLabel = (w: Wave) => t(`lab.wave.${w}` as never);
  const panLabel = $derived(g.pan === 0 ? t('lab.panCenter') : `${g.pan < 0 ? t('lab.panL') : t('lab.panR')} ${Math.round(Math.abs(g.pan) * 100)}`);
  const ampDb = $derived(g.amp > 0 ? 20 * Math.log10(g.amp) : -Infinity);
</script>

<section class="card" class:running aria-label={`${t('lab.generator')} ${index + 1}`}>
  <header>
    <span class="name">{t('lab.generator')} {index + 1}</span>
    <div class="hbtn">
      <button class="ms" class:on={g.mute} aria-pressed={g.mute} title={t('lab.mute')} onclick={() => update(g.id, { mute: !g.mute })}>M</button>
      <button class="ms solo" class:on={g.solo} aria-pressed={g.solo} title={t('lab.solo')} onclick={() => update(g.id, { solo: !g.solo })}>S</button>
      <button class="play" class:on={running} onclick={() => toggle(g.id)}>{running ? t('lab.stop') : t('lab.start')}</button>
      <button class="x" aria-label={t('lab.remove')} onclick={() => remove(g.id)}>×</button>
    </div>
  </header>

  <div class="waves" role="radiogroup" aria-label={t('lab.waveform')}>
    {#each [...TONE_WAVES, ...NOISE_WAVES] as w (w)}
      <button role="radio" aria-checked={g.wave === w} class:on={g.wave === w} onclick={() => update(g.id, { wave: w })}>{waveLabel(w)}</button>
    {/each}
  </div>

  {#if !noise}
    <div class="freq">
      <button onclick={() => nudge(-1)} disabled={moving} aria-label="−1 Hz">−1</button>
      <button onclick={() => nudge(-0.1)} disabled={moving} aria-label="−0,1 Hz">−0,1</button>
      <div class="field"><HzInput value={shownHz} onchange={setFreq} label={t('lab.frequency')} disabled={moving} /><span>Hz</span></div>
      <button onclick={() => nudge(0.1)} disabled={moving} aria-label="+0,1 Hz">+0,1</button>
      <button onclick={() => nudge(1)} disabled={moving} aria-label="+1 Hz">+1</button>
    </div>
    <div class="meta">
      <span>
        {#if g.pitch}<b>{g.pitch.degree}{g.pitch.octave}</b> {t(`tuning.preset.${g.pitch.tuning}` as never)}{#if g.pitch.ratio} · {g.pitch.ratio}{/if}
        {:else}≈ {nearest.label} {signedCents(nearest.cents, i18n.locale)} (ET 432){/if}
      </span>
      <span class="mono">λ {num(wavelength(shownHz), i18n.locale, 3)} m · T {num(periodMs(shownHz), i18n.locale, 3)} ms</span>
    </div>
    <div class="tools">
      <button onclick={() => setFreq(Math.max(LIMITS.freqMin, g.freq / 2))} disabled={moving}>{t('lab.octaveDown')}</button>
      <button onclick={() => setFreq(Math.min(LIMITS.freqMax, g.freq * 2))} disabled={moving}>{t('lab.octaveUp')}</button>
      <button class:on={showPicker} onclick={() => (showPicker = !showPicker)} disabled={moving}>{t('lab.pickNote')}</button>
      <button class:on={showMotion} onclick={() => (showMotion = !showMotion)}>{t('lab.motion')}</button>
    </div>
    {#if showPicker}
      <NotePicker onpick={(p) => { update(g.id, { freq: p.hz, pitch: p.source }); showPicker = false; }} />
    {/if}
    {#if showMotion}<MotionPanel id={g.id} freq={g.freq} />{/if}
    {#if g.wave === 'additive'}
      <HarmonicEditor value={g.harmonics} onchange={(h) => update(g.id, { harmonics: h })} />
    {/if}
  {:else}
    <p class="hint">{t('lab.noiseHint')}</p>
  {/if}

  <div class="sliders">
    <label>
      <span class="lrow"><span>{t('lab.amplitude')}</span><span class="mono v">{Math.round(g.amp * 100)} % · {Number.isFinite(ampDb) ? `${ampDb < 0 ? '−' : ''}${num(Math.abs(ampDb), i18n.locale, 1)}` : '−∞'} dB</span></span>
      <input type="range" min="0" max="1" step="0.01" value={g.amp} oninput={(e) => update(g.id, { amp: +e.currentTarget.value })} />
    </label>
    <label>
      <span class="lrow"><span>{t('lab.pan')}</span><span class="mono v">{panLabel}</span></span>
      <input type="range" min="-1" max="1" step="0.01" value={g.pan} oninput={(e) => update(g.id, { pan: +e.currentTarget.value })} ondblclick={() => update(g.id, { pan: 0 })} />
    </label>
  </div>

  <button class="more" aria-expanded={showAdvanced} onclick={() => (showAdvanced = !showAdvanced)}>{t('lab.advanced')} {showAdvanced ? '▴' : '▾'}</button>
  {#if showAdvanced}
    <div class="sliders">
      <label>
        <span class="lrow"><span>{t('lab.volume')}</span><span class="mono v">{g.volumeDb > 0 ? '+' : g.volumeDb < 0 ? '−' : ''}{Math.abs(g.volumeDb)} dB</span></span>
        <input type="range" min="-40" max="6" step="1" value={g.volumeDb} oninput={(e) => update(g.id, { volumeDb: +e.currentTarget.value })} />
      </label>
      {#if !noise}
        <label>
          <span class="lrow"><span>{t('lab.phase')}</span><span class="mono v">{g.phaseDeg}°</span></span>
          <input type="range" min="0" max="359" step="1" value={g.phaseDeg} oninput={(e) => update(g.id, { phaseDeg: +e.currentTarget.value })} />
        </label>
      {/if}
      <label>
        <span class="lrow"><span>{t('lab.attack')}</span><span class="mono v">{g.attackMs} ms</span></span>
        <input type="range" min={LIMITS.attackMin} max="5000" step="5" value={g.attackMs} oninput={(e) => update(g.id, { attackMs: +e.currentTarget.value })} />
      </label>
      <label>
        <span class="lrow"><span>{t('lab.release')}</span><span class="mono v">{g.releaseMs} ms</span></span>
        <input type="range" min={LIMITS.releaseMin} max="10000" step="5" value={g.releaseMs} oninput={(e) => update(g.id, { releaseMs: +e.currentTarget.value })} />
      </label>
    </div>
    {#if !noise}<p class="hint">{t('lab.phaseHint')}</p>{/if}
  {/if}
</section>

<style>
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
  .card.running { border-color: #e0b15a88; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .name { font-size: 14px; font-weight: 600; }
  .hbtn { display: flex; gap: 6px; align-items: center; }
  .ms { width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--line-strong); background: none; color: var(--text-2); font-weight: 600; cursor: pointer; }
  .ms.on { background: #c8423b33; border-color: #c8423b; color: #ffb4ae; }
  .ms.solo.on { background: #e0b15a33; border-color: var(--accent); color: var(--accent); }
  .play { min-height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--accent); background: none; color: var(--accent); font-weight: 600; cursor: pointer; }
  .play.on { background: var(--accent); color: #14171c; }
  .x { width: 32px; height: 36px; border: 0; background: none; color: var(--text-2); font-size: 20px; cursor: pointer; }
  .waves { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
  .waves button { flex: 0 0 auto; min-height: 36px; padding: 0 11px; border-radius: 999px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); font-size: 12px; cursor: pointer; white-space: nowrap; }
  .waves button.on { border-color: var(--accent); color: var(--accent); background: #e0b15a1a; }
  .freq { display: flex; align-items: center; gap: 6px; }
  .freq > button { min-width: 44px; min-height: 44px; border-radius: 10px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); font-size: 12px; cursor: pointer; }
  .field { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 4px; color: var(--text-2); font-size: 13px; }
  .meta { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-size: 11px; color: var(--text-2); }
  .meta b { color: var(--text); }
  .tools { display: flex; gap: 6px; flex-wrap: wrap; }
  .tools button { min-height: 36px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); font-size: 12px; cursor: pointer; }
  .tools button.on { border-color: var(--accent); color: var(--accent); }
  .sliders { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
  label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
  .lrow { display: flex; justify-content: space-between; gap: 6px; }
  .v { color: var(--text-2); }
  input[type='range'] { width: 100%; accent-color: var(--accent); min-height: 28px; }
  .more { align-self: flex-start; min-height: 32px; border: 0; background: none; color: var(--text-2); font-size: 12px; cursor: pointer; padding: 0; }
  .hint { margin: 0; font-size: 11px; color: var(--text-2); }
  button:disabled { opacity: 0.4; cursor: default; }
</style>

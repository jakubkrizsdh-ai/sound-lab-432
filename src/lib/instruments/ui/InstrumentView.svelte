<script lang="ts">
  import { onMount } from 'svelte';
  import { i18n, t } from '../../i18n/index.svelte';
  import { num, dbfs } from '../../format';
  import { audio, engine, MASTER_MAX_DB, MASTER_MIN_DB, MASTER_WARN_DB } from '../../audio/engine.svelte';
  import type { Pitch } from '../../tuning/systems';
  import {
    INSTRUMENTS, KEY_TUNINGS, MODAL, keyboardNotes, scaleNotes, scaleRun,
    type InstrumentId, type KeysTuning, type ScaleChoice
  } from '../defs';
  import { inst, noteOff, noteOn, setPedal, setSetting, settingsOf } from '../store.svelte';
  import Bowls from './Bowls.svelte';
  import Bells from './Bells.svelte';
  import Gong from './Gong.svelte';
  import Kalimba from './Kalimba.svelte';
  import Keys from './Keys.svelte';
  import NoteCard from './NoteCard.svelte';
  import CustomEditor from './CustomEditor.svelte';
  import KeyBindings from '../../keys/KeyBindings.svelte';
  import { DIGIT_CODES, KALIMBA_CODES, PIANO_CODES } from '../../keys/layouts';
  import { keyLabel, resolve, keys } from '../../keys/bindings.svelte';

  let { id }: { id: InstrumentId } = $props();
  const def = $derived(INSTRUMENTS[id]);
  const s = $derived(settingsOf(id));
  const sys = $derived(KEY_TUNINGS[s.tuning]);

  // úzká obrazovka = méně jazýčků / kláves
  let narrow = $state(typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches);
  onMount(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const on = () => (narrow = mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  });

  const notes = $derived.by<Pitch[]>(() => {
    switch (def.surface) {
      case 'bowls': return scaleNotes(sys, s.scale, s.octave);
      case 'gong': return scaleNotes(sys, s.scale, s.octave);
      case 'bells': return scaleRun(sys, s.scale, s.octave, 8);
      case 'kalimba': return scaleRun(sys, s.scale, s.octave, narrow ? 11 : 17);
      default: return keyboardNotes(sys, s.octave, narrow ? 1 : 2);
    }
  });

  const isKeys = $derived(def.surface === 'keys');
  // Výchozí klávesy: klaviatura Q–P + čísla, kalimba A–L + Q–P, mísy a zvonky číslice, gong mezerník.
  const kbDefaults = $derived.by<Record<string, string>>(() => {
    const src = def.surface === 'keys' ? PIANO_CODES : def.surface === 'kalimba' ? KALIMBA_CODES : def.surface === 'gong' ? ['Space'] : DIGIT_CODES;
    const o: Record<string, string> = {};
    notes.forEach((_, i) => { if (src[i]) o[String(i)] = src[i]!; });
    return o;
  });
  const kb = $derived((keys.overrides, resolve(id, kbDefaults)));
  const labels = $derived(notes.map((_, i) => keyLabel(kb.bySlot[String(i)])));
  const kbSlots = $derived(def.surface === 'gong'
    ? [{ id: '0', label: 'Gong' }]
    : notes.map((p, i) => ({ id: String(i), label: `${p.source.degree}${p.source.octave}` })));

  const keyId = (p: Pitch) => (def.surface === 'gong' ? `gong-${p.source.degree}${p.source.octave}` : `${p.source.degree}${p.source.octave}`);

  onMount(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const slot = kb.byCode[e.code];
      const p: Pitch | undefined = slot !== undefined ? notes[Number(slot)] : undefined;
      if (!p) return;
      e.preventDefault();
      noteOn(keyId(p), p, e.shiftKey ? Math.min(1, s.velocity + 0.25) : s.velocity);
    };
    const up = (e: KeyboardEvent) => {
      const slot = kb.byCode[e.code];
      const p: Pitch | undefined = slot !== undefined ? notes[Number(slot)] : undefined;
      if (p) noteOff(keyId(p));
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  });

  const TUNINGS: KeysTuning[] = ['pythagorean', 'et432', 'et440', 'just'];
  const canRub = $derived(def.surface === 'bowls' || (id === 'custom' && inst.custom.rub));
  const modalDecay = $derived(id === 'custom' ? inst.custom.decay : id in MODAL ? MODAL[id as keyof typeof MODAL].decay : def.sound && 'decay' in def.sound ? def.sound.decay : 1);
  const sustainedSound = $derived(id === 'flute' || id === 'synth');
  const last = $derived(inst.last ?? notes[0] ?? null);
</script>

<div class="view">
  <div class="stage">
    <div class="chips">
      {#if !isKeys}
        {#each ['image', 'major'] as const as sc (sc)}
          <button class:on={s.scale === sc} onclick={() => setSetting('scale', sc as ScaleChoice)}>{t(`ins.scale.${sc}`)}</button>
        {/each}
      {/if}
      <span class="oct">
        <button aria-label={t('ins.octaveDown')} disabled={s.octave <= 1} onclick={() => setSetting('octave', s.octave - 1)}>−</button>
        <span>{t('tuning.octave')} {s.octave}</span>
        <button aria-label={t('ins.octaveUp')} disabled={s.octave >= 6} onclick={() => setSetting('octave', s.octave + 1)}>+</button>
      </span>
      {#if canRub}
        <button class:on={s.mode === 'strike'} onclick={() => setSetting('mode', 'strike')}>{t('ins.mode.strike')}</button>
        <button class:on={s.mode === 'rub'} onclick={() => setSetting('mode', 'rub')}>{t('ins.mode.rub')}</button>
      {/if}
      {#if id === 'synth'}
        {#each ['pad', 'lead', 'organ'] as const as pr (pr)}
          <button class:on={s.synthPreset === pr} onclick={() => setSetting('synthPreset', pr)}>{t(`ins.synth.${pr}`)}</button>
        {/each}
      {/if}
      {#if id === 'piano'}
        <button class:on={inst.pedal} aria-pressed={inst.pedal} onclick={() => setPedal(!inst.pedal)}>{t('ins.pedal')}</button>
      {/if}
    </div>

    {#if def.surface === 'bowls'}
      <Bowls {notes} crystal={id === 'crystal'} keys={labels} />
    {:else if def.surface === 'bells'}
      <Bells {notes} keys={labels} />
    {:else if def.surface === 'gong'}
      <Gong {notes} />
    {:else if def.surface === 'kalimba'}
      <Kalimba {notes} keys={labels} />
    {:else}
      <Keys {notes} keys={labels} />
    {/if}
    <p class="hint">{t(`ins.hint.${id}` as never)}</p>
  </div>

  <aside class="side">
    {#if last}<NoteCard p={last} symbolic={s.scale === 'image' && !isKeys} />{/if}
    {#if id === 'custom'}<CustomEditor />{/if}
    <section class="card">
      <label>
        <span class="lrow"><span>{t('sound.master')}</span><span class="mono v" class:loud={audio.masterDb > MASTER_WARN_DB}>{dbfs(audio.masterDb)}</span></span>
        <input type="range" min={MASTER_MIN_DB} max={MASTER_MAX_DB} step="1" value={audio.masterDb} oninput={(e) => engine.setMasterDb(+e.currentTarget.value)} />
      </label>
      <label>
        <span>{t('tuning.system')}</span>
        <select value={s.tuning} onchange={(e) => setSetting('tuning', e.currentTarget.value as KeysTuning)}>
          {#each TUNINGS as tu (tu)}<option value={tu}>{t(`hp.tuning.${tu}`)}</option>{/each}
        </select>
      </label>
      <label>
        <span class="lrow"><span>{t('hp.velocity')}</span><span class="mono v">{Math.round(s.velocity * 100)} %</span></span>
        <input type="range" min="0.1" max="1" step="0.01" value={s.velocity} oninput={(e) => setSetting('velocity', +e.currentTarget.value)} />
      </label>
      {#if sustainedSound}
        <label>
          <span class="lrow"><span>{t('ins.release')}</span><span class="mono v">{num(s.release, i18n.locale, 2)} s</span></span>
          <input type="range" min="0.03" max="4" step="0.01" value={s.release} oninput={(e) => setSetting('release', +e.currentTarget.value)} />
        </label>
      {:else if id !== 'custom'}
        <label>
          <span class="lrow"><span>{t('hp.decay')}</span><span class="mono v">{num(modalDecay * s.decayScale, i18n.locale, 1)} s</span></span>
          <input type="range" min="0.25" max="3" step="0.05" value={s.decayScale} oninput={(e) => setSetting('decayScale', +e.currentTarget.value)} />
        </label>
      {/if}
      {#if id === 'synth'}
        <label>
          <span class="lrow"><span>{t('ins.cutoff')}</span><span class="mono v">{num(s.cutoff, i18n.locale, 0)} Hz</span></span>
          <input type="range" min="200" max="12000" step="10" value={s.cutoff} oninput={(e) => setSetting('cutoff', +e.currentTarget.value)} />
        </label>
      {/if}
      <label>
        <span class="lrow"><span>{t('hp.reverb')}</span><span class="mono v">{Math.round(s.reverb * 100)} %</span></span>
        <input type="range" min="0" max="1" step="0.01" value={s.reverb} oninput={(e) => setSetting('reverb', +e.currentTarget.value)} />
      </label>
      <p class="hint">{t(`ins.about.${id}` as never)}</p>
    </section>
    <KeyBindings instrument={id} defaults={kbDefaults} slots={kbSlots} />
  </aside>
</div>

<style>
  .view { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
  .stage { flex: 999 1 480px; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
  .side { flex: 1 1 300px; max-width: 420px; display: flex; flex-direction: column; gap: 14px; }
  @media (max-width: 899px) { .side { max-width: none; } }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .chips > button { min-height: 38px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); font-size: 12.5px; cursor: pointer; }
  .chips > button.on { border-color: var(--accent); color: var(--accent); background: #e0b15a1a; }
  .oct { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-3); border: 1px solid var(--line-strong); border-radius: 999px; padding: 0 4px; min-height: 38px; }
  .oct button { width: 32px; height: 32px; border-radius: 50%; border: 0; background: #ffffff0d; color: var(--text); cursor: pointer; font-size: 16px; }
  .oct button:disabled { opacity: 0.35; }
  .hint { margin: 0; text-align: center; font-size: 12px; color: var(--text-2); }
  .side .hint { text-align: left; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
  .lrow { display: flex; justify-content: space-between; }
  .v { color: var(--text-2); }
  .loud { color: #f0a35a; }
  select { min-height: 44px; background: var(--bg); border: 1px solid var(--line-strong); border-radius: 10px; color: var(--text); padding: 0 10px; font-size: 14px; }
  input[type='range'] { width: 100%; accent-color: var(--accent); min-height: 28px; }
</style>

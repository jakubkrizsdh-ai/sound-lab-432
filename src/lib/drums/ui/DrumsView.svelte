<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../i18n/index.svelte';
  import { dbfs } from '../../format';
  import { audio, engine, MASTER_MAX_DB, MASTER_MIN_DB, MASTER_WARN_DB } from '../../audio/engine.svelte';
  import { GROUP, PADS, PAD_CODES, PRESETS, SEQ_ROWS, STEPS, type DrumId, type KitId, type DrumTuning, type PresetId } from '../kit';
  import { drums, hit, save, applyReverb, start, stop, setBpm, toggleCell, loadPreset, clearPattern } from '../store.svelte';
  import KitView from './KitView.svelte';
  import iconsUrl from '../assets/pad-icons.png';
  import KeyBindings from '../../keys/KeyBindings.svelte';
  import { keyLabel, resolve, keys } from '../../keys/bindings.svelte';

  const kbDefaults: Record<string, string> = Object.fromEntries(PADS.map((id, i) => [id, PAD_CODES[i]!]));
  const kb = $derived((keys.overrides, resolve('drums', kbDefaults)));

  let page = $state(0); // telefon: kroky 1–8 nebo 9–16
  let narrow = $state(typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches);

  onMount(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const on = () => (narrow = mq.matches);
    mq.addEventListener('change', on);
    const key = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        drums.playing ? stop() : void start();
        return;
      }
      const id = kb.byCode[e.code] as DrumId | undefined;
      if (!id) return;
      e.preventDefault();
      hit(id, e.shiftKey ? 1 : drums.velocity);
    };
    window.addEventListener('keydown', key);
    return () => {
      mq.removeEventListener('change', on);
      window.removeEventListener('keydown', key);
    };
  });

  // Na telefonu ukazatel přepíná stránku kroků, aby byl vidět.
  $effect(() => {
    if (narrow && drums.playing && drums.step >= 0) page = drums.step < 8 ? 0 : 1;
  });

  const steps = $derived(narrow ? Array.from({ length: 8 }, (_, i) => i + page * 8) : Array.from({ length: STEPS }, (_, i) => i));

  function padDown(e: PointerEvent, id: DrumId) {
    e.preventDefault();
    let v = drums.velocity;
    if (e.pressure > 0 && e.pressure !== 0.5 && e.pointerType !== 'mouse') v = 0.25 + 0.75 * e.pressure;
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    // výš na padu = silněji (jako u padů bicích automatů)
    const y = 1 - (e.clientY - r.top) / r.height;
    v *= 0.8 + 0.3 * y;
    hit(id, Math.min(1, Math.max(0.1, v)));
  }

  function set<K extends 'kit' | 'tuning' | 'velocity' | 'reverb' | 'swing' | 'view' | 'icons' | 'labels'>(k: K, v: (typeof drums)[K]) {
    drums[k] = v;
    if (k === 'reverb') applyReverb();
    save();
  }
  const name = (id: DrumId) => t(`dr.${id}` as never);
  const shortName = (id: DrumId) => t(`dr.short.${id}` as never);
</script>

<div class="drums">
  <div class="stage">
    <div class="chips">
      <span class="seg" role="radiogroup" aria-label={t('dr.view')}>
        <button role="radio" aria-checked={drums.view === 'pads'} class:on={drums.view === 'pads'} onclick={() => set('view', 'pads')}>{t('dr.view.pads')}</button>
        <button role="radio" aria-checked={drums.view === 'kit'} class:on={drums.view === 'kit'} onclick={() => set('view', 'kit')}>{t('dr.view.kit')}</button>
      </span>
      {#if drums.view === 'pads'}
        <button class:on={drums.icons} aria-pressed={drums.icons} onclick={() => set('icons', !drums.icons)}>{t('dr.icons')}</button>
      {:else}
        <button class:on={drums.labels} aria-pressed={drums.labels} onclick={() => set('labels', !drums.labels)}>{t('dr.labels')}</button>
      {/if}
    </div>
    <div class="chips">
      {#each ['acoustic', 'electronic'] as const as k (k)}
        <button class:on={drums.kit === k} onclick={() => set('kit', k as KitId)}>{t(`dr.kit.${k}`)}</button>
      {/each}
      {#each ['natural', 'image'] as const as tu (tu)}
        <button class:on={drums.tuning === tu} onclick={() => set('tuning', tu as DrumTuning)}>{t(`dr.tuning.${tu}`)}</button>
      {/each}
    </div>

    {#if drums.view === 'kit'}
      <KitView labels={drums.labels} />
    {:else}
    <div class="pads" role="group" aria-label={t('dr.pads')} style:--icons={`url(${iconsUrl})`}>
      {#each PADS as id, i (id)}
        {@const h = drums.hits[id]}
        <button class="pad {GROUP[id]}" class:withIcon={drums.icons} onpointerdown={(e) => padDown(e, id)} oncontextmenu={(e) => e.preventDefault()} aria-label={name(id)}>
          {#if h}{#key h.n}<span class="glow" style:--v={h.v}></span>{/key}{/if}
          {#if drums.icons}<span class="icon" aria-hidden="true" style:--ix={`${(i % 4) * (100 / 3)}%`} style:--iy={`${Math.floor(i / 4) * (100 / 3)}%`}></span>{/if}
          <span class="pn">{name(id)}</span>
          <span class="pk">{keyLabel(kb.bySlot[id])}</span>
        </button>
      {/each}
    </div>
    <p class="hint">{t('dr.padHint')}</p>
    {/if}

    <section class="seq" aria-label={t('dr.sequencer')}>
      <div class="transport">
        <button class="play" class:on={drums.playing} onclick={() => (drums.playing ? stop() : start())}>
          {drums.playing ? `■ ${t('dr.stop')}` : `▶ ${t('dr.play')}`}
        </button>
        <div class="bpm">
          <button aria-label="−1 BPM" onclick={() => setBpm(drums.bpm - 1)}>−</button>
          <label><span class="visually-hidden">BPM</span>
            <input class="mono" inputmode="numeric" value={drums.bpm} onchange={(e) => setBpm(parseInt(e.currentTarget.value) || drums.bpm)} />
          </label>
          <span class="u">BPM</span>
          <button aria-label="+1 BPM" onclick={() => setBpm(drums.bpm + 1)}>+</button>
        </div>
        <select aria-label={t('dr.presets')} onchange={(e) => { const v = e.currentTarget.value; if (v) loadPreset(v as PresetId); e.currentTarget.value = ''; }}>
          <option value="">{t('dr.presets')}…</option>
          {#each Object.keys(PRESETS) as p (p)}<option value={p}>{t(`dr.preset.${p}` as never)}</option>{/each}
        </select>
        <button class="ghost" onclick={clearPattern}>{t('dr.clear')}</button>
      </div>
      <label class="swing">
        <span class="lrow"><span>Swing</span><span class="mono v">{Math.round(drums.swing * 100)} %</span></span>
        <input type="range" min="0" max="0.5" step="0.01" value={drums.swing} oninput={(e) => set('swing', +e.currentTarget.value)} />
      </label>

      {#if narrow}
        <div class="pages">
          <button class:on={page === 0} onclick={() => (page = 0)}>1–8</button>
          <button class:on={page === 1} onclick={() => (page = 1)}>9–16</button>
        </div>
      {/if}

      <div class="grid" style:--cols={steps.length}>
        <span></span>
        {#each steps as s (s)}<span class="num" class:beat={s % 4 === 0} class:now={drums.step === s}>{s + 1}</span>{/each}
        {#each SEQ_ROWS as id (id)}
          <button class="rowname" onpointerdown={(e) => { e.preventDefault(); hit(id); }}>{shortName(id)}</button>
          {#each steps as s (s)}
            {@const val = drums.pattern[id]?.[s] ?? 0}
            <button class="cell {GROUP[id]}" class:on={val > 0} class:acc={val === 2} class:alt={Math.floor(s / 4) % 2 === 1} class:now={drums.step === s}
              aria-label={`${name(id)} ${s + 1}`} aria-pressed={val > 0}
              onclick={() => toggleCell(id, s)}></button>
          {/each}
        {/each}
      </div>
      <p class="hint">{t('dr.seqHint')}</p>
    </section>
  </div>

  <aside class="side">
    <section class="card">
      <label>
        <span class="lrow"><span>{t('sound.master')}</span><span class="mono v" class:loud={audio.masterDb > MASTER_WARN_DB}>{dbfs(audio.masterDb)}</span></span>
        <input type="range" min={MASTER_MIN_DB} max={MASTER_MAX_DB} step="1" value={audio.masterDb} oninput={(e) => engine.setMasterDb(+e.currentTarget.value)} />
      </label>
      <label>
        <span class="lrow"><span>{t('hp.velocity')}</span><span class="mono v">{Math.round(drums.velocity * 100)} %</span></span>
        <input type="range" min="0.1" max="1" step="0.01" value={drums.velocity} oninput={(e) => set('velocity', +e.currentTarget.value)} />
      </label>
      <label>
        <span class="lrow"><span>{t('hp.reverb')}</span><span class="mono v">{Math.round(drums.reverb * 100)} %</span></span>
        <input type="range" min="0" max="1" step="0.01" value={drums.reverb} oninput={(e) => set('reverb', +e.currentTarget.value)} />
      </label>
      <p class="hint">{t('dr.about')}</p>
      {#if drums.tuning === 'image'}<p class="hint">{t('dr.tuningNote')}</p>{/if}
    </section>
    <KeyBindings instrument="drums" defaults={kbDefaults} slots={PADS.map(id => ({ id, label: t(`dr.short.${id}` as never) }))} />
  </aside>
</div>

<style>
  .drums { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
  .stage { flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
  .side { flex: 1 1 280px; max-width: 380px; display: flex; flex-direction: column; gap: 14px; }
  @media (max-width: 899px) { .side { max-width: none; } }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chips button { min-height: 38px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); font-size: 12.5px; cursor: pointer; }
  .chips button.on { border-color: var(--accent); color: var(--accent); background: #e0b15a1a; }

  .pads { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; max-width: min(560px, 46vh); width: 100%; align-self: center; touch-action: none; user-select: none; -webkit-user-select: none; }
  .pad {
    position: relative; aspect-ratio: 1; border-radius: 12px; border: 1px solid #ffffff14; cursor: pointer; overflow: hidden;
    display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; padding: 8px; color: #f2f3f5;
    background: linear-gradient(180deg, #2b3037, #1d2126); box-shadow: inset 0 -3px 0 #00000055; -webkit-tap-highlight-color: transparent;
  }
  .pad.kick { background: linear-gradient(180deg, #4a2f2a, #2e1d1a); }
  .pad.snare { background: linear-gradient(180deg, #4a3f26, #2d2617); }
  .pad.hat { background: linear-gradient(180deg, #263f45, #18282c); }
  .pad.tom { background: linear-gradient(180deg, #2f3a4f, #1c2331); }
  .pad.cymbal { background: linear-gradient(180deg, #3d3a24, #262416); }
  .pad.perc { background: linear-gradient(180deg, #3a2c45, #241b2b); }
  .seg { display: inline-flex; border: 1px solid var(--line-strong); border-radius: 999px; padding: 2px; gap: 2px; }
  .seg button { min-height: 34px; padding: 0 12px; border-radius: 999px; border: 0; background: none; color: var(--text-3); font-size: 12.5px; cursor: pointer; }
  .seg button.on { background: var(--accent); color: #14171c; font-weight: 600; }
  .pad.withIcon { justify-content: flex-end; align-items: center; }
  .pad.withIcon .pn { text-align: center; }
  .pad.withIcon .pk { position: absolute; top: 6px; left: 8px; }
  .icon {
    position: absolute; left: 14%; right: 14%; top: 10%; bottom: 34%; background: #f2f3f5; opacity: 0.92; pointer-events: none;
    -webkit-mask-image: var(--icons); mask-image: var(--icons);
    -webkit-mask-size: 400% 400%; mask-size: 400% 400%;
    -webkit-mask-position: var(--ix) var(--iy); mask-position: var(--ix) var(--iy);
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  }
  .pn { position: relative; font-size: clamp(11px, 2.9vw, 13.5px); font-weight: 600; text-align: left; line-height: 1.15; pointer-events: none; }
  .pk { position: relative; font-family: var(--mono); font-size: 11px; color: #9aa3ae; pointer-events: none; }
  @media (pointer: coarse) { .pk { display: none; } }
  .glow { position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, #e0b15acc, #e0b15a22 70%); animation: fade 0.35s ease-out forwards; pointer-events: none; }
  @keyframes fade { from { opacity: calc(0.4 + 0.6 * var(--v)); } to { opacity: 0; } }

  .hint { margin: 0; font-size: 12px; color: var(--text-2); text-align: center; }
  .side .hint { text-align: left; }

  .seq { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
  .transport { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .play { min-height: 44px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--accent); background: #e0b15a1a; color: var(--accent); font-weight: 600; cursor: pointer; }
  .play.on { background: var(--accent); color: #14171c; }
  .bpm { display: flex; align-items: center; gap: 4px; border: 1px solid var(--line-strong); border-radius: 10px; padding: 0 4px; min-height: 44px; }
  .bpm button { width: 34px; height: 34px; border-radius: 8px; border: 0; background: #ffffff0d; color: var(--text); font-size: 16px; cursor: pointer; }
  .bpm input { width: 48px; background: none; border: 0; color: var(--text); text-align: center; font-size: 16px; }
  .bpm .u { font-size: 11px; color: var(--text-2); }
  select { min-height: 44px; border-radius: 10px; border: 1px solid var(--line-strong); background: var(--bg); color: var(--text-3); padding: 0 8px; font-size: 13px; }
  .ghost { min-height: 44px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); cursor: pointer; }
  .swing { display: flex; flex-direction: column; gap: 4px; font-size: 12px; max-width: 320px; }
  .pages { display: flex; gap: 6px; }
  .pages button { flex: 1; min-height: 36px; border-radius: 8px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); cursor: pointer; }
  .pages button.on { border-color: var(--accent); color: var(--accent); }

  .grid { display: grid; grid-template-columns: 64px repeat(var(--cols), minmax(0, 1fr)); gap: 3px; align-items: center; }
  .num { text-align: center; font-size: 10px; color: #6f7782; font-family: var(--mono); }
  .num.beat { color: var(--text-2); }
  .num.now { color: var(--accent); font-weight: 700; }
  .rowname { min-height: 32px; text-align: left; font-size: 11px; color: var(--text-3); background: none; border: 0; padding: 0 4px 0 0; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cell { min-height: 32px; border-radius: 5px; border: 0; background: #232830; cursor: pointer; padding: 0; }
  .cell.alt { background: #1b1f25; }
  .cell.now { outline: 1px solid #e0b15a88; }
  .cell.on { background: #8a6a3c; }
  .cell.on.acc { background: var(--accent); }
  .cell.on.kick { background: #b05a48; } .cell.on.acc.kick { background: #ff8a70; }
  .cell.on.hat { background: #3f8f9e; } .cell.on.acc.hat { background: #6fe0f2; }
  .cell.on.tom { background: #4f6fa8; } .cell.on.acc.tom { background: #8fb0ff; }
  .cell.on.perc { background: #7a5b95; } .cell.on.acc.perc { background: #c39bea; }
  @media (max-width: 640px) { .cell, .rowname { min-height: 36px; } .grid { grid-template-columns: 58px repeat(var(--cols), minmax(0, 1fr)); } }

  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
  .lrow { display: flex; justify-content: space-between; }
  .v { color: var(--text-2); }
  .loud { color: #f0a35a; }
  input[type='range'] { width: 100%; accent-color: var(--accent); min-height: 28px; }
</style>

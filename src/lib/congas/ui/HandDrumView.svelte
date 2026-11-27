<script lang="ts">
  import { onMount } from 'svelte';
  import { t, i18n } from '../../i18n/index.svelte';
  import { dbfs, num } from '../../format';
  import { audio, engine, MASTER_MAX_DB, MASTER_MIN_DB, MASTER_WARN_DB } from '../../audio/engine.svelte';
  import { DRUM_SIZE, IMAGE_NOTES, SETS, ZONE_BASS, ZONE_OPEN, handFreq, zoneStroke, type CongaTuning, type HandDrum, type HandPad, type HandSet, type HandStroke } from '../kit';
  import { HAND_STORES } from '../store.svelte';
  import KeyBindings from '../../keys/KeyBindings.svelte';
  import { keyLabel, resolve, keys } from '../../keys/bindings.svelte';

  let { set = 'congas' }: { set?: HandSet } = $props();
  // jedna sada na jednu instanci obrazovky (přepnutí nástroje = nová instance)
  // svelte-ignore state_referenced_locally
  const store = HAND_STORES[set];
  const congas = store.state;
  // svelte-ignore state_referenced_locally
  const def = SETS[set];
  const center = def.center;
  const hit = store.hit;
  const kbDefaults: Record<string, string> = { ...def.codes };
  const kb = $derived((keys.overrides, resolve(set, kbDefaults)));
  // svelte-ignore state_referenced_locally
  const P = set === 'bongos' ? 'bg' : 'cg';

  onMount(() => {
    const key = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const pad = kb.byCode[e.code] as HandPad | undefined;
      if (!pad) return;
      e.preventDefault();
      hit(pad, e.shiftKey ? 1 : congas.velocity);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  function velocityOf(e: PointerEvent): number {
    let v = congas.velocity;
    if (e.pressure > 0 && e.pressure !== 0.5 && e.pointerType !== 'mouse') v = 0.25 + 0.75 * e.pressure;
    return Math.min(1, Math.max(0.1, v));
  }

  function headDown(e: PointerEvent, drum: HandDrum) {
    e.preventDefault();
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    // obruč (0,92–1,0 viewBoxu) počítáme ještě jako okraj blány
    const d = Math.hypot(dx, dy) / 0.92;
    if (d > 1.09) return;
    hit(`${drum}.${zoneStroke(Math.min(d, 0.999), center)}` as HandPad, velocityOf(e));
  }

  function muteDown(e: PointerEvent, drum: HandDrum) {
    e.preventDefault();
    hit(`${drum}.mute` as HandPad, velocityOf(e));
  }

  function setOpt<K extends 'tuning' | 'velocity' | 'reverb' | 'labels'>(k: K, v: (typeof congas)[K]) {
    congas[k] = v;
    if (k === 'reverb') store.applyReverb();
    store.save();
  }

  const R = 92; // poloměr blány ve viewBoxu (obruč do 100)
  const strokeName = (s: HandStroke) => t(`cg.${s}` as never);
  const keyOf = (drum: HandDrum, s: HandStroke) => keyLabel(kb.bySlot[`${drum}.${s}`]);
  const flash = (drum: HandDrum, s: HandStroke) => congas.hits[`${drum}.${s}`];
</script>

<div class="congas" class:bongos={set === 'bongos'}>
  <div class="stage">
    <div class="chips">
      {#each ['natural', 'image'] as const as tu (tu)}
        <button class:on={congas.tuning === tu} onclick={() => setOpt('tuning', tu as CongaTuning)}>{t(`${P}.tuning.${tu}` as never)}</button>
      {/each}
      <button class:on={congas.labels} aria-pressed={congas.labels} onclick={() => setOpt('labels', !congas.labels)}>{t('dr.labels')}</button>
    </div>

    <div class="set" role="group" aria-label={t(`ins.name.${set}` as never)}>
      {#each def.drums as drum (drum)}
        {@const f = handFreq(congas.tuning, drum)}
        {@const fo = flash(drum, 'open')}
        {@const fs = flash(drum, 'slap')}
        {@const fb = flash(drum, center)}
        {@const fm = flash(drum, 'mute')}
        <div class="drum" style:--s={DRUM_SIZE[drum]}>
          <svg viewBox="-100 -100 200 200" class="head" role="button" tabindex="-1" aria-label={`${t(`cg.${drum}` as never)}: ${strokeName(center)} · ${strokeName('open')} · ${strokeName('slap')}`}
            onpointerdown={(e) => headDown(e, drum)} oncontextmenu={(e) => e.preventDefault()}>
            <defs>
              <radialGradient id={`skin-${drum}`} cx="45%" cy="40%" r="70%">
                <stop offset="0%" stop-color="#f1e4c6" />
                <stop offset="70%" stop-color="#ddc79b" />
                <stop offset="100%" stop-color="#b99a66" />
              </radialGradient>
            </defs>
            <circle r="100" class="hoop" />
            <circle r={R} fill={`url(#skin-${drum})`} />
            {#if fo}{#key fo.n}<circle r={R * (ZONE_OPEN + ZONE_BASS) / 2} class="fl ring" style:--v={fo.v} style:stroke-width={`${(ZONE_OPEN - ZONE_BASS) * R}`} />{/key}{/if}
            {#if fb}{#key fb.n}<circle r={R * ZONE_BASS} class="fl disk" style:--v={fb.v} />{/key}{/if}
            {#if fm}{#key fm.n}<circle r={R} class="fl disk mute" style:--v={fm.v} />{/key}{/if}
            {#if fs}{#key fs.n}<circle r={R * (1 + ZONE_OPEN) / 2} class="fl ring" style:--v={fs.v} style:stroke-width={`${(1 - ZONE_OPEN) * R}`} />{/key}{/if}
            <circle r={R * ZONE_OPEN} class="zone" />
            <circle r={R * ZONE_BASS} class="zone" />
            {#each [0, 60, 120, 180, 240, 300] as a (a)}
              <circle cx={96 * Math.cos((a * Math.PI) / 180)} cy={96 * Math.sin((a * Math.PI) / 180)} r="2.6" class="lug" />
            {/each}
            {#if congas.labels}
              <text y={-R * (1 + ZONE_OPEN) / 2 + 4} class="zl">{strokeName('slap')}</text>
              <text y={-R * (ZONE_OPEN + ZONE_BASS) / 2 + 4} class="zl">{strokeName('open')}</text>
              <text y="-6" class="zl">{strokeName(center)}</text>
            {/if}
            <text y={R * (1 + ZONE_OPEN) / 2 + 5} class="zk">{keyOf(drum, 'slap')}</text>
            <text y={R * (ZONE_OPEN + ZONE_BASS) / 2 + 5} class="zk">{keyOf(drum, 'open')}</text>
            <text y={congas.labels ? 16 : 5} class="zk">{keyOf(drum, center)}</text>
          </svg>
          <button class="mute" onpointerdown={(e) => muteDown(e, drum)} oncontextmenu={(e) => e.preventDefault()}>
            {strokeName('mute')} <span class="k mono">{keyOf(drum, 'mute')}</span>
          </button>
          <div class="info">
            <strong>{t(`cg.${drum}` as never)}</strong>
            <span class="mono hz">{num(f, i18n.locale, 2)} Hz{congas.tuning === 'image' ? ` · ${IMAGE_NOTES[drum].name} (${IMAGE_NOTES[drum].ratio})` : ''}</span>
            <span class="tag calc">{t('hp.calculated')}</span>
          </div>
        </div>
      {/each}
    </div>
    <p class="hint">{t(`${P}.hint` as never)}</p>
  </div>

  <aside class="side">
    <section class="card">
      <label>
        <span class="lrow"><span>{t('sound.master')}</span><span class="mono v" class:loud={audio.masterDb > MASTER_WARN_DB}>{dbfs(audio.masterDb)}</span></span>
        <input type="range" min={MASTER_MIN_DB} max={MASTER_MAX_DB} step="1" value={audio.masterDb} oninput={(e) => engine.setMasterDb(+e.currentTarget.value)} />
      </label>
      <label>
        <span class="lrow"><span>{t('hp.velocity')}</span><span class="mono v">{Math.round(congas.velocity * 100)} %</span></span>
        <input type="range" min="0.1" max="1" step="0.01" value={congas.velocity} oninput={(e) => setOpt('velocity', +e.currentTarget.value)} />
      </label>
      <label>
        <span class="lrow"><span>{t('hp.reverb')}</span><span class="mono v">{Math.round(congas.reverb * 100)} %</span></span>
        <input type="range" min="0" max="1" step="0.01" value={congas.reverb} oninput={(e) => setOpt('reverb', +e.currentTarget.value)} />
      </label>
      <p class="hint">{t(`${P}.about` as never)}</p>
      {#if congas.tuning === 'image'}<p class="hint">{t(`${P}.tuningNote` as never)}</p>{/if}
    </section>
    <KeyBindings instrument={set} defaults={kbDefaults}
      slots={def.pads.map(p => ({ id: p, label: `${t(`cg.${p.split('.')[0]}` as never)} · ${strokeName(p.split('.')[1] as HandStroke)}` }))} />
  </aside>
</div>

<style>
  .congas { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
  .stage { flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
  .side { flex: 1 1 280px; max-width: 380px; display: flex; flex-direction: column; gap: 14px; }
  @media (max-width: 899px) { .side { max-width: none; } }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chips button { min-height: 38px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); font-size: 12.5px; cursor: pointer; }
  .chips button.on { border-color: var(--accent); color: var(--accent); background: #e0b15a1a; }

  .set { display: flex; justify-content: center; align-items: flex-end; gap: clamp(6px, 2.5vw, 22px); user-select: none; -webkit-user-select: none; }
  .drum { flex: 0 1 calc(var(--s) * 230px); min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .head { width: 100%; height: auto; display: block; touch-action: none; cursor: pointer; -webkit-tap-highlight-color: transparent; overflow: visible; }
  .hoop { fill: #3a3f46; stroke: #1c1f23; stroke-width: 2; }
  .lug { fill: #c9ced6; }
  .zone { fill: none; stroke: #7a6040; stroke-opacity: 0.35; stroke-width: 1.2; stroke-dasharray: 4 4; pointer-events: none; }
  .zl { text-anchor: middle; font-size: 15px; fill: #5b4527; font-weight: 600; pointer-events: none; }
  .zk { text-anchor: middle; font-size: 12px; fill: #7a6040; font-family: var(--mono); pointer-events: none; }
  .fl { pointer-events: none; animation: fade 0.35s ease-out forwards; }
  .fl.ring { fill: none; stroke: #e0b15a; }
  .fl.disk { fill: #e0b15a; }
  .fl.mute { fill: #6b7380; }
  @keyframes fade { from { opacity: calc(0.35 + 0.5 * var(--v)); } to { opacity: 0; } }

  .mute {
    width: 100%; min-height: 40px; border-radius: 10px; border: 1px solid var(--line-strong); cursor: pointer; touch-action: none;
    background: linear-gradient(180deg, #2b3037, #1d2126); color: #f2f3f5; font-size: clamp(11px, 2.9vw, 13px); font-weight: 600; -webkit-tap-highlight-color: transparent;
  }
  .mute:active { background: #3a414b; }
  @media (max-width: 640px) { .zk, .k { display: none; } .congas:not(.bongos) .zl { font-size: 19px; } }
  .k { color: #9aa3ae; font-weight: 400; font-size: 11px; margin-left: 4px; }
  .info { display: flex; flex-direction: column; align-items: center; gap: 3px; text-align: center; font-size: 12.5px; }
  .hz { font-size: 11.5px; color: var(--text-2); }
  .tag { font-size: 10.5px; border-radius: 6px; padding: 2px 6px; }
  .calc { color: var(--tag-calc); border: 1px solid #2d5563; }

  .hint { margin: 0; font-size: 12px; color: var(--text-2); text-align: center; }
  .side .hint { text-align: left; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
  .lrow { display: flex; justify-content: space-between; }
  .v { color: var(--text-2); }
  .loud { color: #f0a35a; }
  input[type='range'] { width: 100%; accent-color: var(--accent); min-height: 28px; }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../i18n/index.svelte';
  import { dbfs } from '../../format';
  import { audio, engine, MASTER_MAX_DB, MASTER_MIN_DB, MASTER_WARN_DB } from '../../audio/engine.svelte';
  import { CAJON_CODES, CAJON_SLOTS, ZONE_SLAP, ZONE_TONE, faceStroke, slotHand, slotStroke, type CajonPad, type CajonStroke, type Hand } from '../kit';
  import { cajon, hit, save, applyReverb } from '../store.svelte';
  import KeyBindings from '../../keys/KeyBindings.svelte';
  import { keyLabel, resolve, keys } from '../../keys/bindings.svelte';

  const kbDefaults: Record<string, string> = { ...CAJON_CODES };
  const kb = $derived((keys.overrides, resolve('cajon', kbDefaults)));

  onMount(() => {
    const key = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const slot = kb.byCode[e.code];
      if (!slot) return;
      e.preventDefault();
      if (tag === 'BUTTON') el?.blur(); // mezerník nesmí „kliknout“ na tlačítko
      const hand: Hand = slot.endsWith('.S') ? (Math.random() < 0.5 ? 'L' : 'R') : slotHand(slot);
      hit(`cajon.${slotStroke(slot)}` as CajonPad, e.shiftKey ? 1 : cajon.velocity, hand);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  function velocityOf(e: PointerEvent): number {
    let v = cajon.velocity;
    if (e.pressure > 0 && e.pressure !== 0.5 && e.pointerType !== 'mouse') v = 0.25 + 0.75 * e.pressure;
    return Math.min(1, Math.max(0.1, v));
  }

  const W = 200, H = 290, M = 8; // viewBox a okraj desky
  function faceDown(e: PointerEvent) {
    e.preventDefault();
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width * W - M) / (W - 2 * M);
    const y = ((e.clientY - r.top) / r.height * H - M) / (H - 2 * M);
    if (x < -0.05 || x > 1.05 || y < -0.05 || y > 1.05) return;
    hit(`cajon.${faceStroke(Math.max(0, y))}` as CajonPad, velocityOf(e), x < 0.5 ? 'L' : 'R');
  }
  function ghostDown(e: PointerEvent, hand: Hand) {
    e.preventDefault();
    hit('cajon.ghost', velocityOf(e) * 0.85, hand);
  }

  function set<K extends 'wires' | 'velocity' | 'reverb' | 'labels'>(k: K, v: (typeof cajon)[K]) {
    cajon[k] = v;
    if (k === 'reverb') applyReverb();
    save();
  }

  const name = (s: CajonStroke) => t(`cj.${s}` as never);
  const keyOf = (slot: string) => keyLabel(kb.bySlot[slot]);
  const fl = (s: CajonStroke, h: Hand) => cajon.hits[`cajon.${s}.${h}`];
  const fy = (f: number) => M + f * (H - 2 * M);
  const IW = W - 2 * M;
  const handLabel = (slot: string) => (slot.endsWith('.S') ? t('cj.space') : slotHand(slot) === 'R' ? t('cj.right') : t('cj.left'));
</script>

<div class="cajon">
  <div class="stage">
    <div class="chips">
      <button class:on={cajon.wires} aria-pressed={cajon.wires} onclick={() => set('wires', !cajon.wires)}>{t('cj.wires')}</button>
      <button class:on={cajon.labels} aria-pressed={cajon.labels} onclick={() => set('labels', !cajon.labels)}>{t('dr.labels')}</button>
    </div>

    <div class="box">
      <svg viewBox={`0 0 ${W} ${H}`} class="face" role="button" tabindex="-1" aria-label={`${t('ins.name.cajon')}: ${name('slap')} · ${name('tone')} · ${name('bass')}`}
        onpointerdown={faceDown} oncontextmenu={(e) => e.preventDefault()}>
        <defs>
          <linearGradient id="cj-wood" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#d8a86f" />
            <stop offset="55%" stop-color="#c08848" />
            <stop offset="100%" stop-color="#9c6a35" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={W} height={H} rx="10" class="frame" />
        <rect x={M} y={M} width={IW} height={H - 2 * M} rx="5" fill="url(#cj-wood)" />
        {#each [0.12, 0.27, 0.41, 0.58, 0.72, 0.86] as gx (gx)}
          <path d={`M ${M + gx * IW} ${M + 4} C ${M + gx * IW + 6} ${H * 0.35}, ${M + gx * IW - 5} ${H * 0.65}, ${M + gx * IW + 3} ${H - M - 4}`} class="grain" />
        {/each}
        <!-- záblesky zón -->
        {#each ['L', 'R'] as const as hd (hd)}
          {@const s1 = fl('slap', hd)}
          {@const s2 = fl('tone', hd)}
          {#if s1}{#key s1.n}<rect x={hd === 'L' ? M : W / 2} y={M} width={IW / 2} height={fy(ZONE_SLAP) - M} class="fl" style:--v={s1.v} />{/key}{/if}
          {#if s2}{#key s2.n}<rect x={hd === 'L' ? M : W / 2} y={fy(ZONE_SLAP)} width={IW / 2} height={fy(ZONE_TONE) - fy(ZONE_SLAP)} class="fl" style:--v={s2.v} />{/key}{/if}
          {@const b = fl('bass', hd)}
          {#if b}{#key b.n}<ellipse cx={W / 2} cy={fy(0.68)} rx={IW * 0.42} ry={(H - 2 * M) * 0.2} class="fl" style:--v={b.v} />{/key}{/if}
          {@const g = fl('ghost', hd)}
          {#if g}{#key g.n}<rect x={hd === 'L' ? M : W / 2} y={M} width={IW / 2} height={H - 2 * M} class="fl ghost" style:--v={g.v} />{/key}{/if}
        {/each}
        <line x1={M} x2={W - M} y1={fy(ZONE_SLAP)} y2={fy(ZONE_SLAP)} class="zone" />
        <line x1={M} x2={W - M} y1={fy(ZONE_TONE)} y2={fy(ZONE_TONE)} class="zone" />
        {#each [[16, 16], [W - 16, 16], [16, H / 2], [W - 16, H / 2], [16, H - 16], [W - 16, H - 16], [W / 2, 14]] as [sx, sy] (`${sx}-${sy}`)}
          <circle cx={sx} cy={sy} r="2.6" class="screw" />
        {/each}
        {#if cajon.labels}
          <text x={W * 0.27} y={fy(ZONE_SLAP / 2) + 2} class="zl">{name('slap')}</text>
          <text x={W * 0.73} y={fy(ZONE_SLAP / 2) + 2} class="zl">{name('slap')}</text>
          <text x={W / 2} y={fy((ZONE_SLAP + ZONE_TONE) / 2) + 2} class="zl">{name('tone')}</text>
          <text x={W / 2} y={fy(0.7) - 4} class="zl">{name('bass')}</text>
        {/if}
        <text x={W * 0.27} y={fy(ZONE_SLAP / 2) + 17} class="zk">{keyOf('slap.L')}</text>
        <text x={W * 0.73} y={fy(ZONE_SLAP / 2) + 17} class="zk">{keyOf('slap.R')}</text>
        <text x={W * 0.27} y={fy((ZONE_SLAP + ZONE_TONE) / 2) + 6} class="zk">{keyOf('tone.L')}</text>
        <text x={W * 0.73} y={fy((ZONE_SLAP + ZONE_TONE) / 2) + 6} class="zk">{keyOf('tone.R')}</text>
        <text x={W / 2} y={fy(0.7) + 14} class="zk">{keyOf('bass.L')} · {keyOf('bass.R')} · {keyOf('bass.S')}</text>
      </svg>
      <div class="ghosts">
        <button class="ghostbtn" onpointerdown={(e) => ghostDown(e, 'L')} oncontextmenu={(e) => e.preventDefault()}>{name('ghost')} <span class="k mono">{keyOf('ghost.L')}</span></button>
        <button class="ghostbtn" onpointerdown={(e) => ghostDown(e, 'R')} oncontextmenu={(e) => e.preventDefault()}>{name('ghost')} <span class="k mono">{keyOf('ghost.R')}</span></button>
      </div>
    </div>
    <p class="hint">{t('cj.hint')}</p>
  </div>

  <aside class="side">
    <section class="card">
      <label>
        <span class="lrow"><span>{t('sound.master')}</span><span class="mono v" class:loud={audio.masterDb > MASTER_WARN_DB}>{dbfs(audio.masterDb)}</span></span>
        <input type="range" min={MASTER_MIN_DB} max={MASTER_MAX_DB} step="1" value={audio.masterDb} oninput={(e) => engine.setMasterDb(+e.currentTarget.value)} />
      </label>
      <label>
        <span class="lrow"><span>{t('hp.velocity')}</span><span class="mono v">{Math.round(cajon.velocity * 100)} %</span></span>
        <input type="range" min="0.1" max="1" step="0.01" value={cajon.velocity} oninput={(e) => set('velocity', +e.currentTarget.value)} />
      </label>
      <label>
        <span class="lrow"><span>{t('hp.reverb')}</span><span class="mono v">{Math.round(cajon.reverb * 100)} %</span></span>
        <input type="range" min="0" max="1" step="0.01" value={cajon.reverb} oninput={(e) => set('reverb', +e.currentTarget.value)} />
      </label>
      <p class="hint">{t('cj.about')}</p>
    </section>
    <KeyBindings instrument="cajon" defaults={kbDefaults} slots={CAJON_SLOTS.map(s => ({ id: s, label: `${name(slotStroke(s))} · ${handLabel(s)}` }))} />
  </aside>
</div>

<style>
  .cajon { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
  .stage { flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
  .side { flex: 1 1 280px; max-width: 380px; display: flex; flex-direction: column; gap: 14px; }
  @media (max-width: 899px) { .side { max-width: none; } }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chips button { min-height: 38px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); font-size: 12.5px; cursor: pointer; }
  .chips button.on { border-color: var(--accent); color: var(--accent); background: #e0b15a1a; }

  .box { align-self: center; width: min(300px, 70vw, 42vh); display: flex; flex-direction: column; gap: 8px; user-select: none; -webkit-user-select: none; }
  .face { width: 100%; height: auto; display: block; touch-action: none; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .frame { fill: #2a1d12; }
  .grain { fill: none; stroke: #7a4f22; stroke-opacity: 0.22; stroke-width: 1.4; pointer-events: none; }
  .zone { stroke: #5a3a1a; stroke-opacity: 0.4; stroke-width: 1.2; stroke-dasharray: 5 5; pointer-events: none; }
  .screw { fill: #e6e0d4; stroke: #6d5a40; stroke-width: 0.8; pointer-events: none; }
  .zl { text-anchor: middle; font-size: 15px; font-weight: 700; fill: #4a2f14; pointer-events: none; }
  .zk { text-anchor: middle; font-size: 12px; font-family: var(--mono); fill: #5e3e1c; pointer-events: none; }
  .fl { fill: #ffe2a8; pointer-events: none; animation: fade 0.35s ease-out forwards; }
  .fl.ghost { fill: #fff3d6; }
  @keyframes fade { from { opacity: calc(0.25 + 0.45 * var(--v)); } to { opacity: 0; } }
  .ghosts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .ghostbtn {
    min-height: 44px; border-radius: 10px; border: 1px solid var(--line-strong); cursor: pointer; touch-action: none;
    background: linear-gradient(180deg, #2b3037, #1d2126); color: #f2f3f5; font-size: 13px; font-weight: 600; -webkit-tap-highlight-color: transparent;
  }
  .ghostbtn:active { background: #3a414b; }
  .k { color: #9aa3ae; font-weight: 400; font-size: 11px; margin-left: 4px; }
  @media (max-width: 640px) { .zk, .k { display: none; } }

  .hint { margin: 0; font-size: 12px; color: var(--text-2); text-align: center; }
  .side .hint { text-align: left; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
  .lrow { display: flex; justify-content: space-between; }
  .v { color: var(--text-2); }
  .loud { color: #f0a35a; }
  input[type='range'] { width: 100%; accent-color: var(--accent); min-height: 28px; }
</style>

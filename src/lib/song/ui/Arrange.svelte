<script lang="ts">
  import { t } from '../../i18n/index.svelte';
  import { BEATS_PER_BAR, loopRange, songBeats, type Track } from '../model';
  import { song, setTrack, removeTrack, moveClip, beginDrag, setClip, addClip } from '../store.svelte';
  import { transport, setTrackLive, play, stop } from '../player.svelte';

  let { selected = $bindable<string | null>(null), ppb }: { selected: string | null; ppb: number } = $props();

  const total = $derived(songBeats(song.s) + BEATS_PER_BAR * 4); // místo na přidávání za koncem
  const bars = $derived(Math.ceil(total / BEATS_PER_BAR));
  const loop = $derived(loopRange(song.s));
  let openMixer = $state<string | null>(null);
  let confirmDel = $state<string | null>(null);

  // tah bloku
  let drag: { id: string; x0: number; start0: number; moved: boolean } | null = null;
  function clipDown(e: PointerEvent, id: string, start: number) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag = { id, x0: e.clientX, start0: start, moved: false };
  }
  function clipMove(e: PointerEvent) {
    if (!drag) return;
    const dBeats = (e.clientX - drag.x0) / ppb;
    if (!drag.moved && Math.abs(e.clientX - drag.x0) < 6) return;
    if (!drag.moved) { beginDrag(); drag.moved = true; }
    setClip(drag.id, { start: Math.max(0, Math.round(drag.start0 + dBeats)) }, false);
  }
  function clipUp() {
    if (!drag) return;
    if (!drag.moved) selected = selected === drag.id ? null : drag.id;
    else moveClip(drag.id, song.s.tracks.flatMap(t => t.clips).find(c => c.id === drag!.id)?.start ?? drag.start0);
    drag = null;
  }

  // klepnutí na pravítko = přeskočit přehrávání na takt
  function seek(e: PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const beat = Math.floor((e.clientX - r.left) / ppb / BEATS_PER_BAR) * BEATS_PER_BAR;
    const was = transport.playing;
    if (was) stop();
    transport.pos = beat;
    if (was) void play(beat);
  }

  function lane(e: PointerEvent, tr: Track) {
    // dvojité klepnutí do prázdné stopy = nový blok na taktu
    if (e.detail < 2) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const beat = Math.floor((e.clientX - r.left) / ppb / BEATS_PER_BAR) * BEATS_PER_BAR;
    const c = addClip(tr.id, beat, BEATS_PER_BAR * 2);
    if (c) selected = c.id;
  }

  function addBlock(tr: Track) {
    const end = tr.clips.reduce((a, c) => Math.max(a, c.start + c.len * c.repeat), 0);
    const c = addClip(tr.id, Math.ceil(end / BEATS_PER_BAR) * BEATS_PER_BAR, BEATS_PER_BAR * 2);
    if (c) selected = c.id;
  }

  const anySolo = $derived(song.s.tracks.some(x => x.solo));
  const instName = (tr: Track) => t(`ins.name.${tr.sound.instrument}` as never);
</script>

<div class="arr" style:--ppb={`${ppb}px`}>
  <div class="heads">
    <div class="ruler-head">{t('song.bars')}</div>
    {#each song.s.tracks as tr (tr.id)}
      <div class="head" class:muted={tr.mute || (anySolo && !tr.solo)}>
        <div class="hrow">
          <span class="tname" title={instName(tr)}>{tr.name}</span>
          <button class="ms" class:on={tr.mute} aria-pressed={tr.mute} title={t('lab.mute')} onclick={() => setTrack(tr.id, { mute: !tr.mute })}>M</button>
          <button class="ms solo" class:on={tr.solo} aria-pressed={tr.solo} title={t('lab.solo')} onclick={() => setTrack(tr.id, { solo: !tr.solo })}>S</button>
          <button class="ms" aria-expanded={openMixer === tr.id} title={t('song.mixer')} onclick={() => (openMixer = openMixer === tr.id ? null : tr.id)}>⋯</button>
        </div>
        <button class="addblk" onclick={() => addBlock(tr)}>+ {t('song.block')}</button>
      </div>
      {#if openMixer === tr.id}
        <div class="mixer">
          <label><span>{t('lab.volume')}</span><span class="mono">{tr.volumeDb > 0 ? '+' : ''}{tr.volumeDb} dB</span>
            <input type="range" min="-40" max="6" step="1" value={tr.volumeDb} onchange={(e) => setTrack(tr.id, { volumeDb: +e.currentTarget.value })} oninput={(e) => { setTrack(tr.id, { volumeDb: +e.currentTarget.value }, false); setTrackLive(tr.id); }} /></label>
          <label><span>{t('lab.pan')}</span><span class="mono">{Math.round(tr.pan * 100)}</span>
            <input type="range" min="-1" max="1" step="0.05" value={tr.pan} onchange={(e) => setTrack(tr.id, { pan: +e.currentTarget.value })} oninput={(e) => { setTrack(tr.id, { pan: +e.currentTarget.value }, false); setTrackLive(tr.id); }} /></label>
          <label><span>{t('hp.reverb')}</span><span class="mono">{Math.round(tr.reverb * 100)} %</span>
            <input type="range" min="0" max="1" step="0.01" value={tr.reverb} onchange={(e) => setTrack(tr.id, { reverb: +e.currentTarget.value })} oninput={(e) => { setTrack(tr.id, { reverb: +e.currentTarget.value }, false); setTrackLive(tr.id); }} /></label>
          {#if confirmDel === tr.id}
            <button class="del on" onclick={() => { removeTrack(tr.id); confirmDel = null; openMixer = null; }}>{t('rec.confirmDelete')}</button>
          {:else}
            <button class="del" onclick={() => (confirmDel = tr.id)}>{t('song.deleteTrack')}</button>
          {/if}
        </div>
      {/if}
    {/each}
  </div>

  <div class="scroll">
    <div class="timeline" style:width={`${total * ppb}px`}>
      <div class="ruler" role="slider" tabindex="0" aria-label={t('song.position')} aria-valuenow={Math.floor(transport.pos)} onpointerdown={seek}>
        {#each Array.from({ length: bars }, (_, i) => i) as b (b)}
          <span class="bar" style:left={`${b * BEATS_PER_BAR * ppb}px`}>{b + 1}</span>
        {/each}
        {#if song.s.loop.on}
          <span class="loopband" style:left={`${loop[0] * ppb}px`} style:width={`${(loop[1] - loop[0]) * ppb}px`}></span>
        {/if}
      </div>
      {#each song.s.tracks as tr (tr.id)}
        <div class="lane" class:muted={tr.mute || (anySolo && !tr.solo)} onpointerdown={(e) => lane(e, tr)} role="presentation">
          {#each tr.clips as c (c.id)}
            {#each Array.from({ length: Math.max(1, c.repeat) }, (_, r) => r) as r (r)}
              <div class="clip {tr.sound.instrument === 'drums' || tr.sound.instrument === 'congas' ? 'drums' : ''}" class:ghost={r > 0} class:sel={selected === c.id}
                style:left={`${(c.start + r * c.len) * ppb}px`} style:width={`${c.len * ppb - 2}px`}
                onpointerdown={(e) => clipDown(e, c.id, c.start)} onpointermove={clipMove} onpointerup={clipUp} onpointercancel={clipUp}
                role="button" tabindex="0" aria-label={`${tr.name} ${t('song.block')} ${r + 1}/${c.repeat}`}
                onkeydown={(e) => { if (e.key === 'Enter') selected = c.id; }}>
                <svg class="mini" viewBox={`0 0 ${c.len} 1`} preserveAspectRatio="none" aria-hidden="true">
                  {#each c.notes as n (n.id)}
                    <rect x={n.t} y={n.drum ? 0.45 : Math.max(0.05, Math.min(0.9, 1 - Math.log2((n.hz ?? 256) / 64) / 5))} width={Math.max(0.12, n.d)} height="0.1" />
                  {/each}
                </svg>
                {#if r === 0}<span class="clabel">{c.repeat > 1 ? `×${c.repeat}` : ''}</span>{/if}
              </div>
            {/each}
          {/each}
        </div>
        {#if openMixer === tr.id}<div class="lane spacer"></div>{/if}
      {/each}
      <span class="playhead" style:left={`${transport.pos * ppb}px`}></span>
    </div>
  </div>
</div>

<style>
  .arr { display: flex; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: var(--bg-raised); }
  .heads { flex: 0 0 150px; border-right: 1px solid var(--line); background: var(--panel); }
  @media (max-width: 640px) { .heads { flex-basis: 118px; } }
  .ruler-head, .ruler { height: 26px; }
  .ruler-head { font-size: 11px; color: var(--text-2); display: flex; align-items: center; padding: 0 8px; border-bottom: 1px solid var(--line); }
  .head { height: 64px; padding: 6px 8px; box-sizing: border-box; border-bottom: 1px solid var(--line); display: flex; flex-direction: column; gap: 4px; }
  .head.muted { opacity: 0.5; }
  .hrow { display: flex; align-items: center; gap: 3px; }
  .tname { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ms { width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--line-strong); background: none; color: var(--text-2); font-size: 11px; font-weight: 700; cursor: pointer; padding: 0; flex: 0 0 auto; }
  .ms.on { background: #c8423b33; border-color: #c8423b; color: #ffb4ae; }
  .ms.solo.on { background: #e0b15a33; border-color: var(--accent); color: var(--accent); }
  .addblk { align-self: flex-start; min-height: 24px; border: 0; background: none; color: var(--accent); font-size: 11.5px; padding: 0; cursor: pointer; }
  .mixer { height: 190px; box-sizing: border-box; padding: 6px 8px; border-bottom: 1px solid var(--line); display: flex; flex-direction: column; gap: 4px; background: var(--bg); }
  .mixer label { display: grid; grid-template-columns: 1fr auto; gap: 0 6px; font-size: 11px; color: var(--text-2); }
  .mixer input { grid-column: 1 / -1; width: 100%; accent-color: var(--accent); }
  .del { min-height: 28px; border-radius: 6px; border: 1px solid var(--line-strong); background: none; color: var(--text-2); font-size: 11px; cursor: pointer; }
  .del.on { background: #c8423b; border-color: #c8423b; color: #fff; }
  .scroll { flex: 1; overflow-x: auto; overflow-y: hidden; }
  .timeline { position: relative; min-width: 100%;
    background-image: linear-gradient(90deg, #ffffff10 1px, transparent 1px), linear-gradient(90deg, #ffffff06 1px, transparent 1px);
    background-size: calc(var(--ppb) * 4) 100%, var(--ppb) 100%; }
  .ruler { position: relative; border-bottom: 1px solid var(--line); cursor: pointer; touch-action: none; }
  .bar { position: absolute; top: 6px; font-size: 10.5px; color: var(--text-2); padding-left: 4px; font-family: var(--mono); }
  .loopband { position: absolute; bottom: 0; height: 5px; background: #e0b15a88; border-radius: 2px; }
  .lane { position: relative; height: 64px; border-bottom: 1px solid var(--line); }
  .lane.spacer { height: 190px; }
  .lane.muted { opacity: 0.45; }
  .clip { position: absolute; top: 6px; bottom: 6px; border-radius: 6px; background: #3a4b6a; border: 1px solid #6d86b5; cursor: grab; overflow: hidden; touch-action: none; }
  .clip.drums { background: #5a3a32; border-color: #b0715f; }
  .clip.ghost { opacity: 0.45; border-style: dashed; }
  .clip.sel { border-color: var(--accent); box-shadow: 0 0 0 2px #e0b15a66; }
  .mini { position: absolute; inset: 4px; width: calc(100% - 8px); height: calc(100% - 8px); fill: #e8eaedcc; pointer-events: none; }
  .clabel { position: absolute; right: 4px; top: 2px; font-size: 11px; font-weight: 700; color: var(--accent); pointer-events: none; }
  .playhead { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--accent); pointer-events: none; box-shadow: 0 0 6px #e0b15a; }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../i18n/index.svelte';
  import { engine } from '../../audio/engine.svelte';
  import { BEATS_PER_BAR, snap, type Clip, type SongNote, type Track } from '../model';
  import { addNote, updateNote, deleteNote, beginDrag } from '../store.svelte';
  import { transport } from '../player.svelte';
  import { playSongNote } from '../sound';
  import { rowIndexOf, rowsFor, type Row } from '../rows';
  import type { DrumId } from '../../drums/kit';

  let { track, clip, grid, ppb, selectedNote = $bindable<string | null>(null) }: {
    track: Track; clip: Clip; grid: number; ppb: number; selectedNote: string | null;
  } = $props();

  const isDrums = $derived(track.sound.instrument === 'drums');
  const rows = $derived<Row[]>(rowsFor(track, (d: DrumId) => t(`dr.short.${d}` as never)));
  const rowH = 24;
  const width = $derived(clip.len * ppb);
  let scroller: HTMLDivElement | undefined = $state();

  function preview(n: Pick<SongNote, 'hz' | 'drum' | 'v' | 'variant' | 'src'>) {
    void engine.start().then(() => {
      const ctx = engine.ctx, dest = engine.input;
      if (ctx && dest) playSongNote(ctx, dest, track.sound, { id: 'p', t: 0, d: 0.5, ...n, v: n.v ?? 0.7 }, ctx.currentTime, 0.4);
    });
  }

  // tah tónu: přesun (tělo) nebo délka (pravý okraj)
  let drag: { id: string; mode: 'move' | 'size'; x0: number; y0: number; t0: number; d0: number; row0: number; moved: boolean } | null = null;

  function gridPos(e: PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { beat: (e.clientX - r.left) / ppb, row: Math.floor((e.clientY - r.top) / rowH) };
  }

  function downGrid(e: PointerEvent) {
    if (e.target !== e.currentTarget) return;
    const { beat, row } = gridPos(e);
    const r = rows[row];
    if (!r || beat < 0 || beat >= clip.len) return;
    const tt = Math.max(0, Math.min(clip.len - 0.01, grid > 0 ? Math.floor(beat / grid) * grid : beat));
    const d = isDrums ? 0.25 : Math.max(grid || 0.25, 0.5);
    const n: Omit<SongNote, 'id'> = { t: Math.round(tt * 1000) / 1000, d, v: 0.75, ...(r.drum ? { drum: r.drum } : { hz: r.hz!, src: r.src! }) };
    selectedNote = addNote(clip.id, n);
    preview(n);
  }

  function downNote(e: PointerEvent, n: SongNote, mode: 'move' | 'size') {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag = { id: n.id, mode, x0: e.clientX, y0: e.clientY, t0: n.t, d0: n.d, row0: rowIndexOf(rows, n), moved: false };
    selectedNote = n.id;
  }

  function moveNote(e: PointerEvent) {
    if (!drag) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) { beginDrag(); drag.moved = true; }
    if (drag.mode === 'size') {
      const d = Math.max(grid || 0.05, snap(drag.d0 + dx / ppb, grid));
      updateNote(clip.id, drag.id, { d: Math.round(d * 1000) / 1000 }, false);
      return;
    }
    const tt = Math.max(0, Math.min(clip.len - (grid || 0.01), snap(drag.t0 + dx / ppb, grid)));
    const ri = Math.max(0, Math.min(rows.length - 1, drag.row0 + Math.round(dy / rowH)));
    const r = rows[ri]!;
    const cur = clip.notes.find(x => x.id === drag!.id);
    const patch: Partial<SongNote> = { t: Math.round(tt * 1000) / 1000 };
    if (r.drum) patch.drum = r.drum;
    else { patch.hz = r.hz!; patch.src = r.src!; }
    const rowChanged = cur && rowIndexOf(rows, cur) !== ri;
    updateNote(clip.id, drag.id, patch, false);
    if (rowChanged) preview({ ...patch, v: cur?.v ?? 0.7, variant: cur?.variant });
  }

  function upNote() {
    if (drag && !drag.moved) {
      const n = clip.notes.find(x => x.id === drag!.id);
      if (n) preview(n);
    }
    drag = null;
  }

  onMount(() => {
    // vystředit editor na tóny bloku
    const idx = clip.notes.length ? Math.min(...clip.notes.map(n => rowIndexOf(rows, n)).filter(i => i >= 0)) : rows.findIndex(r => r.key === 'C4');
    if (scroller && idx > 0) scroller.scrollTop = Math.max(0, idx * rowH - 60);
    const key = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNote) { e.preventDefault(); deleteNote(clip.id, selectedNote); selectedNote = null; }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  // ukazatel přehrávání uvnitř bloku (i při opakování)
  const playX = $derived.by(() => {
    const rel = transport.pos - clip.start;
    if (!transport.playing || rel < 0 || rel >= clip.len * clip.repeat) return null;
    return (rel % clip.len) * ppb;
  });
  const gridLines = $derived(grid > 0 ? grid * ppb : ppb / 4);
</script>

<div class="roll" bind:this={scroller}>
  <div class="inner" style:height={`${rows.length * rowH}px`}>
    <div class="labels">
      {#each rows as r (r.key)}
        <div class="lbl" class:black={!isDrums && r.label.includes('#') || r.label.startsWith('B')} class:scale={r.inScale} class:c={r.label.startsWith('C') && !r.label.startsWith('C#')}>{r.label}</div>
      {/each}
    </div>
    <div class="grid" role="grid" tabindex="-1" aria-label={t('song.editor')}
      style:width={`${width}px`} style:--beat={`${ppb}px`} style:--bar={`${ppb * BEATS_PER_BAR}px`} style:--sub={`${gridLines}px`} style:--rowh={`${rowH}px`}
      onpointerdown={downGrid}>
      {#each rows as r, i (r.key)}
        {#if !isDrums && (r.label.includes('#') || r.label.startsWith('B'))}<span class="rowbg" style:top={`${i * rowH}px`}></span>{/if}
      {/each}
      {#each clip.notes as n (n.id)}
        {@const ri = rowIndexOf(rows, n)}
        {#if ri >= 0}
          <div class="note" class:sel={selectedNote === n.id} class:out={n.t >= clip.len}
            style:left={`${n.t * ppb}px`} style:top={`${ri * rowH + 2}px`} style:width={`${Math.max(8, n.d * ppb - 1)}px`} style:--v={n.v}
            onpointerdown={(e) => downNote(e, n, 'move')} onpointermove={moveNote} onpointerup={upNote} onpointercancel={upNote}
            role="gridcell" tabindex="-1" aria-label={`${rows[ri]?.label} ${n.t}`}>
            <span class="handle" onpointerdown={(e) => downNote(e, n, 'size')} onpointermove={moveNote} onpointerup={upNote} role="presentation"></span>
          </div>
        {/if}
      {/each}
      {#if playX !== null}<span class="ph" style:left={`${playX}px`}></span>{/if}
    </div>
  </div>
</div>

<style>
  .roll { max-height: 360px; overflow: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--bg-raised); overscroll-behavior: contain; }
  .inner { display: flex; position: relative; }
  .labels { position: sticky; left: 0; z-index: 3; flex: 0 0 52px; background: var(--panel); border-right: 1px solid var(--line); }
  .lbl { height: 24px; box-sizing: border-box; font-size: 10.5px; font-family: var(--mono); color: var(--text-2); display: flex; align-items: center; padding-left: 6px; border-bottom: 1px solid #ffffff08; white-space: nowrap; overflow: hidden; }
  .lbl.black { background: #00000033; }
  .lbl.scale { color: var(--text); }
  .lbl.c { border-bottom-color: #ffffff20; }
  .grid { position: relative; flex: 0 0 auto; touch-action: none; cursor: crosshair;
    background-image:
      linear-gradient(90deg, #ffffff26 1px, transparent 1px),
      linear-gradient(90deg, #ffffff12 1px, transparent 1px),
      linear-gradient(90deg, #ffffff07 1px, transparent 1px),
      linear-gradient(180deg, #ffffff07 1px, transparent 1px);
    background-size: var(--bar) 100%, var(--beat) 100%, var(--sub) 100%, 100% var(--rowh); }
  .rowbg { position: absolute; left: 0; right: 0; height: 24px; background: #00000026; pointer-events: none; }
  .note { position: absolute; height: 20px; border-radius: 4px; cursor: grab; touch-action: none;
    background: color-mix(in srgb, var(--accent) calc(45% + 55% * var(--v)), #3a3020); border: 1px solid #00000066; box-sizing: border-box; }
  .note.sel { outline: 2px solid #fff; z-index: 2; }
  .handle { position: absolute; right: -4px; top: 0; bottom: 0; width: 12px; cursor: ew-resize; }
  .ph { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--signal); pointer-events: none; }
</style>

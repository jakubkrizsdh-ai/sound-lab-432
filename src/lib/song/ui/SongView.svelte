<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../i18n/index.svelte';
  import { INSTRUMENT_ORDER, type InstrumentId } from '../../instruments/defs';
  import { BEATS_PER_BAR, songBeats, beatsToSec } from '../model';
  import { song, undo, redo, setSong, addTrack, findClip, setClip, duplicateClip, deleteClip, quantizeClip, updateNote, deleteNote, newSong, importSong, exportSongJson, edit } from '../store.svelte';
  import { transport, play, stop, record, renderWav, setTrackNames } from '../player.svelte';
  import { download } from '../../recorder/store.svelte';
  import { formatDuration } from '../../audio/wav';
  import Arrange from './Arrange.svelte';
  import PianoRoll from './PianoRoll.svelte';

  let selected = $state<string | null>(null);
  let selectedNote = $state<string | null>(null);
  let grid = $state(0.25);
  let narrow = $state(typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches);
  let zoom = $state(1);
  let newInst = $state<InstrumentId>('handpan');
  let exporting = $state(false);
  let menu = $state(false);
  let fileIn: HTMLInputElement | undefined = $state();

  const ppbArr = $derived((narrow ? 14 : 22) * zoom);
  const ppbRoll = $derived((narrow ? 40 : 64) * zoom);
  const sel = $derived(selected ? findClip(selected) : null);
  const selNote = $derived(sel && selectedNote ? sel.clip.notes.find(n => n.id === selectedNote) ?? null : null);
  const posLabel = $derived(`${Math.floor(transport.pos / BEATS_PER_BAR) + 1}.${Math.floor(transport.pos % BEATS_PER_BAR) + 1}`);
  const lengthSec = $derived(beatsToSec(songBeats(song.s), song.s.bpm));

  onMount(() => {
    setTrackNames(Object.fromEntries(INSTRUMENT_ORDER.map(i => [i, t(`ins.name.${i}` as never)])));
    const mq = window.matchMedia('(max-width: 640px)');
    const on = () => (narrow = mq.matches);
    mq.addEventListener('change', on);
    const key = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    };
    window.addEventListener('keydown', key);
    return () => { mq.removeEventListener('change', on); window.removeEventListener('keydown', key); };
  });

  $effect(() => { if (selected && !findClip(selected)) selected = null; });

  function toggle() {
    if (transport.playing) stop();
    else void play();
  }

  async function exportWav() {
    exporting = true;
    try {
      const blob = await renderWav($state.snapshot(song.s) as typeof song.s);
      download(blob, song.s.name);
    } finally {
      exporting = false;
    }
  }

  function exportJson() {
    const blob = exportSongJson();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.s.name.replace(/[\\/:*?"<>|]+/g, '-')}.soundlab.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function importJson(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    if (!importSong(await f.text())) alert(t('song.importError'));
    (e.currentTarget as HTMLInputElement).value = '';
  }

  function addEmptyTrack() {
    addTrack({ instrument: newInst, ...(newInst === 'drums' ? { kit: 'acoustic', drumTuning: 'natural' } : {}) }, t(`ins.name.${newInst}` as never));
  }

  const setLoop = (patch: Partial<typeof song.s.loop>) => edit(s => { s.loop = { ...s.loop, ...patch }; });
</script>

<div class="song">
  <section class="transport">
    <button class="big play" class:on={transport.playing && !transport.recording} onclick={toggle} aria-label={transport.playing ? t('dr.stop') : t('dr.play')}>
      {transport.playing ? '■' : '▶'}
    </button>
    <button class="big rec" class:on={transport.recording} onclick={() => (transport.recording ? stop() : record())}>
      ● {transport.recording ? t('song.stopRec') : t('song.recordPlay')}
    </button>
    <span class="pos mono" aria-live="off">{posLabel}</span>
    <div class="bpm">
      <button aria-label="−1 BPM" onclick={() => setSong({ bpm: Math.max(30, song.s.bpm - 1) })}>−</button>
      <input class="mono" inputmode="numeric" value={song.s.bpm} aria-label="BPM" onchange={(e) => setSong({ bpm: Math.min(300, Math.max(30, parseInt(e.currentTarget.value) || song.s.bpm)) })} />
      <span>BPM</span>
      <button aria-label="+1 BPM" onclick={() => setSong({ bpm: Math.min(300, song.s.bpm + 1) })}>+</button>
    </div>
    <button class="chip" class:on={transport.metronome} aria-pressed={transport.metronome} onclick={() => (transport.metronome = !transport.metronome)}>♩ {t('song.metronome')}</button>
    <button class="chip" class:on={song.s.loop.on} aria-pressed={song.s.loop.on} onclick={() => setLoop({ on: !song.s.loop.on })}>⟳ {t('song.loop')}</button>
    {#if song.s.loop.on}
      <span class="loopsel">
        {t('song.bars')}
        <input class="mono" inputmode="numeric" aria-label={t('song.loopFrom')} value={song.s.loop.from + 1} onchange={(e) => setLoop({ from: Math.max(0, (parseInt(e.currentTarget.value) || 1) - 1) })} />
        –
        <input class="mono" inputmode="numeric" aria-label={t('song.loopTo')} value={song.s.loop.to > song.s.loop.from ? song.s.loop.to : ''} placeholder={t('song.end')} onchange={(e) => setLoop({ to: parseInt(e.currentTarget.value) || 0 })} />
      </span>
    {/if}
    <span class="sp"></span>
    <button class="chip" disabled={!song.canUndo} onclick={undo} title="Ctrl+Z">↶ {t('song.undo')}</button>
    <button class="chip" disabled={!song.canRedo} onclick={redo} title="Ctrl+Shift+Z">↷</button>
    <button class="chip" aria-expanded={menu} onclick={() => (menu = !menu)}>{t('song.file')} ▾</button>
  </section>

  {#if transport.recording}
    <p class="recinfo" class:count={transport.countIn > 0}>
      {#if transport.countIn > 0}{t('song.countIn')} {transport.countIn}…
      {:else}● {t('song.recHint')} <a href="#/instruments">{t('song.goInstruments')}</a> · {t('song.recNotes')}: {transport.takeNotes}{/if}
    </p>
  {/if}

  {#if menu}
    <section class="menu">
      <label class="name">{t('song.name')} <input value={song.s.name} onchange={(e) => setSong({ name: e.currentTarget.value.trim() || 'Skladba' })} /></label>
      <span class="muted">{t('song.length')}: {formatDuration(lengthSec)} · {songBeats(song.s) / BEATS_PER_BAR} {t('song.barsShort')}</span>
      <button class="chip" disabled={exporting || !song.s.tracks.length} onclick={exportWav}>⬇ {exporting ? t('song.rendering') : t('song.exportWav')}</button>
      <button class="chip" onclick={exportJson}>⬇ {t('song.exportJson')}</button>
      <button class="chip" onclick={() => fileIn?.click()}>⬆ {t('song.importJson')}</button>
      <input type="file" accept=".json,application/json" bind:this={fileIn} onchange={importJson} hidden />
      <button class="chip danger" onclick={() => { if (confirm(t('song.newConfirm'))) { stop(); newSong(); selected = null; } }}>{t('song.new')}</button>
    </section>
  {/if}

  {#if song.s.tracks.length === 0}
    <section class="empty">
      <h2>{t('song.emptyTitle')}</h2>
      <ol>
        <li>{t('song.step1')}</li>
        <li>{t('song.step2')}</li>
        <li>{t('song.step3')}</li>
      </ol>
    </section>
  {:else}
    <Arrange bind:selected ppb={ppbArr} />
  {/if}

  <div class="addtrack">
    <select bind:value={newInst} aria-label={t('song.instrument')}>
      {#each INSTRUMENT_ORDER as i (i)}<option value={i}>{t(`ins.name.${i}` as never)}</option>{/each}
    </select>
    <button class="chip" onclick={addEmptyTrack}>+ {t('song.addTrack')}</button>
    <span class="sp"></span>
    <span class="zoom">{t('song.zoom')}
      <button onclick={() => (zoom = Math.max(0.5, zoom / 1.25))} aria-label="−">−</button>
      <button onclick={() => (zoom = Math.min(3, zoom * 1.25))} aria-label="+">+</button>
    </span>
  </div>

  {#if sel}
    <section class="editor">
      <div class="etools">
        <strong>{sel.track.name}</strong>
        <span class="grp">{t('song.repeat')}
          <button onclick={() => setClip(sel.clip.id, { repeat: Math.max(1, sel.clip.repeat - 1) })}>−</button>
          <span class="mono val">×{sel.clip.repeat}</span>
          <button onclick={() => setClip(sel.clip.id, { repeat: Math.min(256, sel.clip.repeat + 1) })}>+</button>
        </span>
        <span class="grp">{t('song.length')}
          <button onclick={() => setClip(sel.clip.id, { len: Math.max(BEATS_PER_BAR, sel.clip.len - BEATS_PER_BAR) })}>−</button>
          <span class="mono val">{sel.clip.len / BEATS_PER_BAR} {t('song.barsShort')}</span>
          <button onclick={() => setClip(sel.clip.id, { len: Math.min(BEATS_PER_BAR * 64, sel.clip.len + BEATS_PER_BAR) })}>+</button>
        </span>
        <label class="grp">{t('song.grid')}
          <select bind:value={grid}>
            <option value={1}>1/4</option><option value={0.5}>1/8</option><option value={0.25}>1/16</option><option value={0.125}>1/32</option><option value={0}>{t('song.free')}</option>
          </select>
        </label>
        <button class="chip" onclick={() => quantizeClip(sel.clip.id, grid || 0.25)}>{t('song.quantize')}</button>
        <button class="chip" onclick={() => duplicateClip(sel.clip.id)}>{t('song.duplicate')}</button>
        <button class="chip danger" onclick={() => { deleteClip(sel.clip.id); selected = null; }}>{t('song.deleteBlock')}</button>
      </div>
      {#if selNote}
        <div class="ntools">
          <span class="muted">{t('song.note')}: {selNote.drum ? t(`dr.${selNote.drum}` as never) : `${selNote.src ? selNote.src.degree + selNote.src.octave : ''} ${selNote.hz?.toFixed(2)} Hz`}</span>
          <label class="grp">{t('hp.velocity')}
            <input type="range" min="0.05" max="1" step="0.01" value={selNote.v} onchange={(e) => updateNote(sel.clip.id, selNote.id, { v: +e.currentTarget.value })} />
            <span class="mono val">{Math.round(selNote.v * 100)} %</span>
          </label>
          <button class="chip danger" onclick={() => { deleteNote(sel.clip.id, selNote.id); selectedNote = null; }}>{t('song.deleteNote')}</button>
        </div>
      {/if}
      {#key sel.clip.id}
        <PianoRoll track={sel.track} clip={sel.clip} {grid} ppb={ppbRoll} bind:selectedNote />
      {/key}
      <p class="hint">{t('song.editorHint')}</p>
    </section>
  {:else if song.s.tracks.length}
    <p class="hint">{t('song.selectHint')}</p>
  {/if}
</div>

<style>
  .song { display: flex; flex-direction: column; gap: 12px; }
  .transport, .menu, .addtrack, .etools, .ntools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .transport { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 10px; }
  .big { min-height: 46px; min-width: 52px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--line-strong); background: none; color: var(--text); font-size: 15px; font-weight: 700; cursor: pointer; }
  .big.play.on { background: var(--accent); color: #14171c; border-color: var(--accent); }
  .big.rec { color: #ff8d86; border-color: #c8423b; font-size: 13px; }
  .big.rec.on { background: #c8423b; color: #fff; }
  .pos { font-size: 20px; min-width: 56px; }
  .bpm { display: flex; align-items: center; gap: 4px; border: 1px solid var(--line-strong); border-radius: 10px; padding: 0 4px; min-height: 44px; font-size: 11px; color: var(--text-2); }
  .bpm button { width: 30px; height: 30px; border-radius: 7px; border: 0; background: #ffffff0d; color: var(--text); cursor: pointer; }
  .bpm input { width: 42px; background: none; border: 0; color: var(--text); text-align: center; font-size: 15px; }
  .chip { min-height: 38px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); font-size: 12.5px; cursor: pointer; }
  .chip.on { border-color: var(--accent); color: var(--accent); background: #e0b15a1a; }
  .chip.danger { color: #ff8d86; }
  .chip:disabled { opacity: 0.4; cursor: default; }
  .loopsel { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-2); }
  .loopsel input { width: 54px; min-height: 32px; background: var(--bg); border: 1px solid var(--line-strong); border-radius: 6px; color: var(--text); text-align: center; }
  .sp { flex: 1; }
  .recinfo { margin: 0; padding: 10px 12px; border-radius: 10px; background: #c8423b22; border: 1px solid #c8423b; color: #ffd2cf; font-size: 13px; }
  .recinfo.count { font-size: 18px; font-weight: 700; text-align: center; }
  .recinfo a { color: var(--accent); font-weight: 600; }
  .menu { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 10px; }
  .name { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-2); }
  .name input { min-height: 36px; background: var(--bg); border: 1px solid var(--line-strong); border-radius: 8px; color: var(--text); padding: 0 8px; }
  .muted { font-size: 12px; color: var(--text-2); }
  .empty { background: var(--panel); border: 1px dashed var(--line-strong); border-radius: 14px; padding: 16px; }
  .empty h2 { margin: 0 0 8px; font-size: 15px; }
  .empty ol { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; color: var(--text-3); }
  select { min-height: 38px; background: var(--bg); border: 1px solid var(--line-strong); border-radius: 8px; color: var(--text); padding: 0 8px; }
  .zoom { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-2); }
  .zoom button, .grp button { width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--line-strong); background: none; color: var(--text); cursor: pointer; }
  .editor { background: var(--panel); border: 1px solid var(--accent); border-radius: 14px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .grp { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-2); }
  .val { min-width: 40px; text-align: center; color: var(--text); font-size: 12px; }
  .grp input[type='range'] { width: 110px; accent-color: var(--accent); }
  .hint { margin: 0; font-size: 12px; color: var(--text-2); }
</style>

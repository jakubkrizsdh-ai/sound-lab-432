<script lang="ts">
  import { onDestroy } from 'svelte';
  import { i18n, t } from '../i18n/index.svelte';
  import { formatDuration } from '../audio/wav';
  import { num } from '../format';
  import { rec, start, pause, resume, stop, remove, rename, blobOf, download, share, canShareFiles, MAX_SECONDS } from './store.svelte';
  import type { RecordingMeta } from './db';

  let playingId = $state<string | null>(null);
  let editing = $state<string | null>(null);
  let confirmDel = $state<string | null>(null);
  let audioEl: HTMLAudioElement | null = null;
  let url = '';
  const shareable = canShareFiles();
  const active = $derived(rec.state === 'recording' || rec.state === 'paused');

  async function play(r: RecordingMeta) {
    if (playingId === r.id) return stopPlay();
    stopPlay();
    const b = await blobOf(r.id);
    if (!b) return;
    url = URL.createObjectURL(b);
    audioEl = new Audio(url);
    audioEl.onended = stopPlay;
    playingId = r.id;
    await audioEl.play();
  }
  function stopPlay() {
    audioEl?.pause();
    audioEl = null;
    if (url) URL.revokeObjectURL(url);
    url = '';
    playingId = null;
  }
  onDestroy(stopPlay);

  async function exportWav(r: RecordingMeta) {
    const b = await blobOf(r.id);
    if (b) download(b, r.name);
  }
  async function shareWav(r: RecordingMeta) {
    const b = await blobOf(r.id);
    if (b && !(await share(b, r.name))) download(b, r.name);
  }
  const date = (ms: number) => new Date(ms).toLocaleString(i18n.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const mb = (bytes: number) => `${num(bytes / 1048576, i18n.locale, 1)} MB`;
</script>

<div class="studio">
  <section class="card recorder" class:active>
    <h2>{t('rec.title')}</h2>
    <p class="intro">{t('rec.intro')}</p>
    <div class="big">
      <span class="clock mono">{formatDuration(rec.seconds)}</span>
      {#if rec.state === 'idle'}
        <button class="btn rec" onclick={start}><span class="dot"></span>{t('rec.start')}</button>
      {:else if rec.state === 'saving'}
        <span class="muted">{t('rec.saving')}</span>
      {:else}
        {#if rec.state === 'recording'}<button class="btn" onclick={pause}>❚❚ {t('rec.pause')}</button>
        {:else}<button class="btn" onclick={resume}>● {t('rec.resume')}</button>{/if}
        <button class="btn stop" onclick={() => stop()}>■ {t('rec.stop')}</button>
      {/if}
    </div>
    <p class="hint">{t('rec.limit').replace('{min}', String(MAX_SECONDS / 60))}</p>
    {#if rec.error}<p class="err">{t('rec.error')}: {rec.error}</p>{/if}
  </section>

  <section class="card">
    <h2>{t('rec.list')} <span class="muted">({rec.list.length})</span></h2>
    {#if rec.list.length === 0}
      <p class="muted">{t('rec.empty')}</p>
    {:else}
      <ul class="list">
        {#each rec.list as r (r.id)}
          <li class:new={rec.lastSaved?.id === r.id}>
            <div class="row1">
              {#if editing === r.id}
                <input class="name-in" value={r.name} aria-label={t('rec.rename')}
                  onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') editing = null; }}
                  onblur={(e) => { void rename(r.id, e.currentTarget.value); editing = null; }} />
              {:else}
                <button class="name" onclick={() => (editing = r.id)} title={t('rec.rename')}>{r.name}</button>
              {/if}
              <span class="meta mono">{formatDuration(r.duration)}</span>
            </div>
            <div class="meta">{date(r.created)} · {mb(r.bytes)} · WAV 16 bit · {num(r.sampleRate, i18n.locale)} Hz</div>
            <div class="actions">
              <button class="btn" class:on={playingId === r.id} onclick={() => play(r)}>{playingId === r.id ? `■ ${t('rec.stopPlay')}` : `▶ ${t('rec.play')}`}</button>
              <button class="btn" onclick={() => exportWav(r)}>⬇ {t('rec.export')}</button>
              {#if shareable}<button class="btn" onclick={() => shareWav(r)}>{t('rec.share')}</button>{/if}
              {#if confirmDel === r.id}
                <button class="btn danger" onclick={() => { void remove(r.id); confirmDel = null; }}>{t('rec.confirmDelete')}</button>
                <button class="btn" onclick={() => (confirmDel = null)}>{t('rec.cancel')}</button>
              {:else}
                <button class="btn ghost" onclick={() => (confirmDel = r.id)}>{t('rec.delete')}</button>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
    <p class="hint">{t('rec.storageNote')}</p>
  </section>


</div>

<style>
  .studio { max-width: 820px; display: flex; flex-direction: column; gap: 16px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
  .recorder.active { border-color: #c8423b; }
  h2 { margin: 0; font-size: 15px; font-weight: 600; }
  .intro, .hint, .muted { margin: 0; font-size: 13px; color: var(--text-2); }
  .hint { font-size: 12px; }
  .err { margin: 0; font-size: 12px; color: #ff8d86; }
  .big { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .clock { font-size: 34px; min-width: 110px; }
  .btn { min-height: 44px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--line-strong); background: none; color: var(--text-3); font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
  .btn.rec { border-color: #c8423b; color: #ff8d86; font-weight: 700; }
  .btn.stop { border-color: #c8423b; color: #ff8d86; }
  .btn.on { border-color: var(--accent); color: var(--accent); }
  .btn.danger { border-color: #c8423b; background: #c8423b; color: #fff; }
  .btn.ghost { color: var(--text-2); }
  .dot { width: 12px; height: 12px; border-radius: 50%; background: #e5483f; }
  .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .list li { border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
  .list li.new { border-color: #e0b15a88; }
  .row1 { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .name { background: none; border: 0; padding: 0; color: var(--text); font-weight: 600; font-size: 14px; text-align: left; cursor: text; min-height: 32px; }
  .name-in { flex: 1; min-height: 36px; background: var(--bg); border: 1px solid var(--accent); border-radius: 8px; color: var(--text); padding: 0 8px; font-size: 14px; }
  .meta { font-size: 11.5px; color: var(--text-2); }
  .actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .actions .btn { min-height: 38px; font-size: 12.5px; }
  .plan ul { margin: 0; padding-left: 18px; font-size: 13px; color: var(--text-3); display: flex; flex-direction: column; gap: 4px; }
</style>

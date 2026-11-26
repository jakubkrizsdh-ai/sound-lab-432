<script lang="ts">
  import { t } from '../i18n/index.svelte';
  import RecordingsView from '../recorder/RecordingsView.svelte';
  import SongView from '../song/ui/SongView.svelte';
  import { rec } from '../recorder/store.svelte';

  const KEY = 'soundlab.studioTab';
  let tab = $state<'song' | 'recordings'>((() => { try { return (localStorage.getItem(KEY) as 'song' | 'recordings') ?? 'song'; } catch { return 'song'; } })());
  function setTab(v: 'song' | 'recordings') {
    tab = v;
    try { localStorage.setItem(KEY, v); } catch { /* */ }
  }
</script>

<div class="studio">
  <div class="tabs" role="tablist">
    <button role="tab" aria-selected={tab === 'song'} class:on={tab === 'song'} onclick={() => setTab('song')}>{t('song.tab')}</button>
    <button role="tab" aria-selected={tab === 'recordings'} class:on={tab === 'recordings'} onclick={() => setTab('recordings')}>{t('rec.list')} ({rec.list.length})</button>
  </div>
  {#if tab === 'song'}<SongView />{:else}<RecordingsView />{/if}
</div>

<style>
  .studio { display: flex; flex-direction: column; gap: 14px; }
  .tabs { display: flex; gap: 6px; }
  .tabs button { min-height: 40px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--line-strong); background: var(--panel); color: var(--text-3); font-size: 13px; cursor: pointer; }
  .tabs button.on { background: var(--accent); border-color: var(--accent); color: #14171c; font-weight: 600; }
</style>

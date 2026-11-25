<script lang="ts">
  import { t } from './lib/i18n/index.svelte';
  import { SECTIONS, sectionFromHash, type SectionId } from './lib/nav';
  import { needRefresh, updateServiceWorker } from './lib/pwa';
  import TopBar from './lib/components/TopBar.svelte';
  import SideNav from './lib/components/SideNav.svelte';
  import BottomNav from './lib/components/BottomNav.svelte';
  import Placeholder from './lib/components/Placeholder.svelte';
  import Settings from './lib/sections/Settings.svelte';
  import { engine } from './lib/audio/engine.svelte';

  let current = $state<SectionId>(sectionFromHash(location.hash));
  const section = $derived(SECTIONS.find(s => s.id === current)!);

  function onHash() {
    current = sectionFromHash(location.hash);
    document.getElementById('main')?.scrollTo(0, 0);
  }

  function stopAll() {
    engine.stopAll();
  }

  // Prohlížeče pustí zvuk až po gestu uživatele: první dotyk nebo klik zvuk zapne.
  function unlock() {
    if (!engine.running) void engine.start();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') stopAll();
  }

  $effect(() => {
    document.title = `${t(section.label)} · ${t('app.name')}`;
  });
</script>

<svelte:window onhashchange={onHash} onkeydown={onKey} onpointerdown={unlock} />

<div class="shell">
  <TopBar title={t(section.label)} onStopAll={stopAll} />
  <div class="body">
    <div class="side-wrap"><SideNav {current} /></div>
    <main id="main">
      {#if current === 'settings'}
        <Settings />
      {:else}
        {#key current}
          <Placeholder
            intro={`${current}.intro` as never}
            items={`${current}.items` as never}
            milestone={section.milestone}
            note={current === 'meditation' ? 'meditation.disclaimer' : undefined}
          />
        {/key}
      {/if}
    </main>
  </div>
  <div class="bottom-wrap"><BottomNav {current} /></div>

  {#if $needRefresh}
    <div class="toast" role="status">
      <span>{t('update.ready')}</span>
      <button onclick={() => updateServiceWorker(true)}>{t('update.reload')}</button>
    </div>
  {/if}
</div>

<style>
  .shell { height: 100dvh; display: flex; flex-direction: column; }
  .body { flex: 1; min-height: 0; display: flex; }
  main { flex: 1; min-width: 0; overflow-y: auto; padding: 20px 16px 24px; }
  .side-wrap { display: none; }
  @media (min-width: 900px) {
    .side-wrap { display: flex; }
    .bottom-wrap { display: none; }
    main { padding: 24px 28px; }
  }
  .toast {
    position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(90px + var(--safe-bottom));
    display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px;
    background: var(--panel); border: 1px solid var(--line-strong); font-size: 14px; z-index: 20;
  }
  .toast button { min-height: 36px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--accent); background: none; color: var(--accent); cursor: pointer; }
</style>

<script lang="ts">
  import { t } from '../i18n/index.svelte';
  import { SECTIONS, type SectionId } from '../nav';
  import Icon from './Icon.svelte';

  let { current }: { current: SectionId } = $props();
  let moreOpen = $state(false);

  const primary = SECTIONS.filter(s => s.primary);
  const secondary = SECTIONS.filter(s => !s.primary);
  const moreActive = $derived(secondary.some(s => s.id === current));
</script>

{#if moreOpen}
  <button class="scrim" aria-label={t('nav.more')} onclick={() => (moreOpen = false)}></button>
  <div class="sheet" role="dialog" aria-label={t('nav.more')}>
    {#each secondary as s (s.id)}
      <a href={'#/' + s.id} class:active={current === s.id} onclick={() => (moreOpen = false)}>
        <Icon d={s.icon} size={20} /><span>{t(s.label)}</span>
      </a>
    {/each}
  </div>
{/if}

<nav class="bottom" aria-label={t('nav.label')}>
  {#each primary as s (s.id)}
    <a href={'#/' + s.id} class:active={current === s.id} aria-current={current === s.id ? 'page' : undefined}>
      <Icon d={s.icon} /><span>{t(s.short)}</span>
    </a>
  {/each}
  <button class:active={moreActive} aria-expanded={moreOpen} onclick={() => (moreOpen = !moreOpen)}>
    <Icon d="M5 12h.01M12 12h.01M19 12h.01" /><span>{t('nav.more')}</span>
  </button>
</nav>

<style>
  .bottom {
    display: flex; justify-content: space-around; border-top: 1px solid var(--line);
    background: var(--bg-raised); padding: 6px 4px calc(8px + var(--safe-bottom));
  }
  .bottom a, .bottom button {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    min-width: 60px; min-height: 48px; border: 0; background: none; cursor: pointer;
    color: var(--text-2); text-decoration: none; font-size: 11px;
  }
  .bottom .active { color: var(--accent); }
  .scrim { position: fixed; inset: 0; background: #0009; border: 0; z-index: 10; }
  .sheet {
    position: fixed; left: 8px; right: 8px; bottom: calc(76px + var(--safe-bottom)); z-index: 11;
    background: var(--panel); border: 1px solid var(--line-strong); border-radius: 16px; padding: 8px;
    display: flex; flex-direction: column;
  }
  .sheet a { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 0 12px; border-radius: 10px; color: var(--text); text-decoration: none; }
  .sheet a.active { color: var(--accent); background: #e0b15a14; }
</style>

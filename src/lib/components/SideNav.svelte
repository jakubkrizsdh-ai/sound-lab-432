<script lang="ts">
  import { t } from '../i18n/index.svelte';
  import { SECTIONS, type SectionId } from '../nav';
  import Icon from './Icon.svelte';

  let { current }: { current: SectionId } = $props();
</script>

<nav class="side" aria-label={t('nav.label')}>
  {#each SECTIONS as s (s.id)}
    <a href={'#/' + s.id} class:active={current === s.id} aria-current={current === s.id ? 'page' : undefined}>
      <Icon d={s.icon} size={18} />
      <span>{t(s.label)}</span>
    </a>
  {/each}
</nav>

<style>
  .side { width: 228px; flex: 0 0 228px; border-right: 1px solid var(--line); padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; }
  a { display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 12px; border-radius: 8px; color: var(--text-3); text-decoration: none; font-size: 14px; }
  a:hover { background: #ffffff08; }
  a.active { background: #e0b15a1a; color: var(--accent); font-weight: 500; }
</style>

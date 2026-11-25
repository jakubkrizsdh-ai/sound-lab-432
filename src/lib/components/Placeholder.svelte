<script lang="ts">
  import { t, tl } from '../i18n/index.svelte';
  import type { MessageKey } from '../i18n/cs';

  let { intro, items, milestone, note }: { intro: MessageKey; items: MessageKey; milestone: string; note?: MessageKey } = $props();
</script>

<section class="ph">
  <p class="intro">{t(intro)}</p>
  <div class="card">
    <div class="head">
      <span>{t('section.planned')}</span>
      <span class="badge mono">{t('section.milestone')} {milestone}</span>
    </div>
    <ul>
      {#each tl(items) as item}<li>{item}</li>{/each}
    </ul>
  </div>
  {#if note}<p class="note">{t(note)}</p>{/if}
</section>

<style>
  .ph { max-width: 720px; display: flex; flex-direction: column; gap: 16px; }
  .intro { margin: 0; font-size: 15px; line-height: 1.5; color: var(--text-3); }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 16px; }
  .head { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--text-2); }
  .badge { font-size: 11px; color: var(--accent); border: 1px solid #5a4a2a; border-radius: 6px; padding: 2px 7px; }
  ul { margin: 10px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; font-size: 14px; line-height: 1.4; }
  .note { margin: 0; font-size: 12px; color: var(--tag-symbolic); border: 1px solid #4a3d63; border-radius: 8px; padding: 8px 10px; }
</style>

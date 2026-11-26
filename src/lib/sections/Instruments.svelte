<script lang="ts">
  import { t } from '../i18n/index.svelte';
  import { INSTRUMENT_ORDER } from '../instruments/defs';
  import { inst, select } from '../instruments/store.svelte';
  import HandpanView from '../handpan/ui/HandpanView.svelte';
  import InstrumentView from '../instruments/ui/InstrumentView.svelte';
  import DrumsView from '../drums/ui/DrumsView.svelte';
</script>

<div class="instruments">
  <div class="picker" role="tablist" aria-label={t('ins.choose')}>
    {#each INSTRUMENT_ORDER as id (id)}
      <button role="tab" aria-selected={inst.current === id} class:on={inst.current === id} onclick={() => select(id)}>
        {t(`ins.name.${id}` as never)}
      </button>
    {/each}
  </div>

  {#if inst.current === 'handpan'}
    <HandpanView />
  {:else if inst.current === 'drums'}
    <DrumsView />
  {:else}
    {#key inst.current}
      <InstrumentView id={inst.current} />
    {/key}
  {/if}
</div>

<style>
  .instruments { display: flex; flex-direction: column; gap: 14px; }
  .picker { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; margin: 0 -4px; padding-left: 4px; }
  .picker button {
    flex: 0 0 auto; min-height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--line-strong);
    background: var(--panel); color: var(--text-3); font-size: 13px; cursor: pointer; white-space: nowrap;
  }
  .picker button.on { border-color: var(--accent); color: #14171c; background: var(--accent); font-weight: 600; }
</style>

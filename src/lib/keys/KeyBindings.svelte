<script lang="ts">
  import { t } from '../i18n/index.svelte';
  import { bind, keyLabel, resetBindings, resolve, RESERVED, keys } from './bindings.svelte';

  let { instrument, defaults, slots }: { instrument: string; defaults: Record<string, string>; slots: { id: string; label: string }[] } = $props();
  let open = $state(false);
  let waiting = $state<string | null>(null);
  const map = $derived((keys.overrides, resolve(instrument, defaults)));
  const changed = $derived(Object.keys(keys.overrides[instrument] ?? {}).length > 0);

  function listen(e: KeyboardEvent) {
    if (!waiting) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.code === 'Escape') { waiting = null; return; }
    if (RESERVED.has(e.code)) return;
    bind(instrument, defaults, waiting, e.code);
    waiting = null;
  }
  $effect(() => {
    if (!waiting) return;
    window.addEventListener('keydown', listen, { capture: true });
    return () => window.removeEventListener('keydown', listen, { capture: true });
  });
</script>

<section class="kb">
  <button class="head" aria-expanded={open} onclick={() => { open = !open; waiting = null; }}>
    <span>⌨ {t('keys.title')}</span><span>{open ? '▴' : '▾'}</span>
  </button>
  {#if open}
    <p class="hint">{waiting ? t('keys.press') : t('keys.intro')}</p>
    <div class="grid">
      {#each slots as s (s.id)}
        <button class="slot" class:wait={waiting === s.id} onclick={() => (waiting = waiting === s.id ? null : s.id)}>
          <span class="lbl">{s.label}</span>
          <span class="key mono">{waiting === s.id ? '…' : keyLabel(map.bySlot[s.id]) || '—'}</span>
        </button>
      {/each}
    </div>
    {#if changed}<button class="reset" onclick={() => resetBindings(instrument)}>{t('keys.reset')}</button>{/if}
  {/if}
</section>

<style>
  .kb { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }
  .head { display: flex; justify-content: space-between; align-items: center; min-height: 36px; background: none; border: 0; color: var(--text); font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; }
  .hint { margin: 0; font-size: 12px; color: var(--text-2); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(86px, 1fr)); gap: 6px; }
  .slot { display: flex; justify-content: space-between; align-items: center; gap: 6px; min-height: 38px; padding: 0 8px; border-radius: 8px; border: 1px solid var(--line-strong); background: var(--bg); color: var(--text-3); cursor: pointer; font-size: 12px; }
  .slot.wait { border-color: var(--accent); color: var(--accent); }
  .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .key { min-width: 22px; text-align: center; padding: 2px 5px; border-radius: 5px; background: #ffffff10; color: var(--text); font-size: 12px; }
  .reset { align-self: flex-start; min-height: 32px; background: none; border: 0; color: var(--accent); font-size: 12px; cursor: pointer; padding: 0; }
</style>

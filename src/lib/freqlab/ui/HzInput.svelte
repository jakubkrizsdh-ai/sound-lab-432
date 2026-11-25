<script lang="ts">
  import { i18n } from '../../i18n/index.svelte';
  import { num } from '../../format';
  import { LIMITS } from '../types';

  let { value, onchange, label, disabled = false }: { value: number; onchange: (hz: number) => void; label: string; disabled?: boolean } = $props();
  let text = $state('');
  let editing = $state(false);
  $effect(() => {
    if (!editing) text = num(value, i18n.locale, 3).replace(/\s/g, '');
  });

  function commit() {
    editing = false;
    const v = parseFloat(text.replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(v)) onchange(Math.min(LIMITS.freqMax, Math.max(LIMITS.freqMin, Math.round(v * 1000) / 1000)));
    else text = num(value, i18n.locale, 3);
  }
</script>

<input class="hz mono" type="text" inputmode="decimal" aria-label={label} {disabled}
  bind:value={text}
  onfocus={() => (editing = true)}
  onblur={commit}
  onkeydown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }} />

<style>
  .hz {
    width: 100%; min-width: 0; min-height: 44px; text-align: right; font-size: 24px;
    background: transparent; border: 0; border-bottom: 1px solid var(--line-strong); color: var(--text); padding: 0 4px;
  }
  .hz:focus { outline: none; border-bottom-color: var(--accent); }
  .hz:disabled { color: var(--text-2); }
</style>

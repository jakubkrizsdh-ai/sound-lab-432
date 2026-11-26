<script lang="ts">
  import { inst } from '../store.svelte';
  let { k, dur = 1.5, round = true }: { k: string; dur?: number; round?: boolean } = $props();
  const h = $derived(inst.hits[k]);
</script>

{#if h}
  {#key h.n}
    <span class="glow" class:round style:--v={h.v} style:--d={`${dur}s`}></span>
  {/key}
{/if}

<style>
  .glow {
    position: absolute; inset: 0; pointer-events: none; border-radius: 10px;
    background: radial-gradient(ellipse, #e0b15a99 0%, #e0b15a2a 55%, transparent 75%);
    animation: fade var(--d) ease-out forwards;
  }
  .glow.round { border-radius: 50%; }
  @keyframes fade { from { opacity: calc(0.3 + 0.7 * var(--v)); } to { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .glow { animation-duration: 0.3s; } }
</style>

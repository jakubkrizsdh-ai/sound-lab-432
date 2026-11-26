<script lang="ts">
  import { t } from '../../i18n/index.svelte';
  import { KIT_HOTSPOTS, KIT_SIZE, hotspotAt, type DrumId } from '../kit';
  import { drums, hit } from '../store.svelte';
  import kitUrl from '../assets/kit.webp';

  let { labels }: { labels: boolean } = $props();

  function down(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * KIT_SIZE;
    const y = ((e.clientY - r.top) / r.height) * KIT_SIZE;
    const id = hotspotAt(x, y);
    if (!id) return;
    e.preventDefault();
    let v = drums.velocity;
    if (e.pressure > 0 && e.pressure !== 0.5 && e.pointerType !== 'mouse') v = 0.25 + 0.75 * e.pressure;
    hit(id, v);
  }
  const name = (id: DrumId) => t(`dr.${id}` as never);
  // jeden popisek na zvuk (kopák má dvě klikací místa)
  const labelSpots = KIT_HOTSPOTS.filter((h, i, all) => all.findIndex(x => x.id === h.id) === i);
</script>

<div class="kit" role="group" aria-label={t('dr.kitView')} onpointerdown={down} oncontextmenu={(e) => e.preventDefault()}>
  <img src={kitUrl} alt={t('dr.kitAlt')} draggable="false" />
  <svg viewBox={`0 0 ${KIT_SIZE} ${KIT_SIZE}`} aria-hidden="true">
    {#each KIT_HOTSPOTS as h, i (i)}
      {@const hh = drums.hits[h.id]}
      {#if hh}
        {#key hh.n}
          {#if h.shape === 'ellipse'}
            <ellipse class="glow" cx={h.cx} cy={h.cy} rx={h.rx} ry={h.ry} style:--v={hh.v} />
          {:else}
            <rect class="glow" x={h.x0} y={h.y0} width={h.x1 - h.x0} height={h.y1 - h.y0} rx="24" style:--v={hh.v} />
          {/if}
        {/key}
      {/if}
    {/each}
    {#if labels}
      {#each labelSpots as h (h.id)}
        <g class="lbl" transform={`translate(${h.label[0]} ${h.label[1]})`}>
          {@const w = name(h.id).length * 19 + 34}
          <rect x={-w / 2} y="-30" width={w} height="56" rx="12" />
          <text text-anchor="middle" y="9">{name(h.id)}</text>
        </g>
      {/each}
    {/if}
  </svg>
</div>
<p class="hint">{t('dr.kitHint')}</p>

<style>
  .kit {
    position: relative; width: 100%; max-width: min(760px, 78vh); aspect-ratio: 1; align-self: center;
    border-radius: 16px; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none;
    -webkit-touch-callout: none; cursor: pointer; background: #12141a;
  }
  img { width: 100%; height: 100%; display: block; pointer-events: none; }
  svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .glow { fill: #e0b15a; mix-blend-mode: screen; animation: fade 0.45s ease-out forwards; }
  @keyframes fade { from { opacity: calc(0.25 + 0.45 * var(--v)); } to { opacity: 0; } }
  .lbl rect { fill: #0b0d10d9; stroke: #ffffff40; stroke-width: 2; }
  .lbl text { fill: #f2f3f5; font: 600 34px var(--font); }
  .hint { margin: 0; font-size: 12px; color: var(--text-2); text-align: center; }
</style>

<script lang="ts">
  import { i18n, t } from '../../i18n/index.svelte';
  import { num, signedCents } from '../../format';
  import { isNoise, waveValue, type ToneWave } from '../../audio/waves';
  import { dbToGain } from '../../audio/engine.svelte';
  import { cents } from '../../tuning/ratio';
  import { lab } from '../store.svelte';

  const W = 300;
  const tonal = $derived(lab.gens.filter(g => !isNoise(g.wave)));
  const playing = $derived(tonal.filter(g => lab.running[g.id] && !g.mute && (!lab.gens.some(x => x.solo) || g.solo)));
  const src = $derived(playing.length ? playing : tonal);

  /** Vypočtený součet (20 ms) – stejné fáze jako při společném spuštění. */
  const sumPath = $derived.by(() => {
    const n = 300, dur = 0.02;
    const ys: number[] = [];
    let peak = 0;
    for (let i = 0; i <= n; i++) {
      const tt = (i / n) * dur;
      let y = 0;
      for (const g of src) y += g.amp * dbToGain(g.volumeDb) * waveValue(g.wave as ToneWave, g.freq, tt, g.phaseDeg, g.harmonics, 32);
      ys.push(y);
      peak = Math.max(peak, Math.abs(y));
    }
    const k = 44 / Math.max(1, peak);
    return { d: ys.map((y, i) => `${i ? 'L' : 'M'}${((i / n) * W).toFixed(1)} ${(50 - y * k).toFixed(1)}`).join(' '), peak };
  });

  /** Obálka rázů prvních dvou tónových generátorů za 1 s: |A1 + A2·e^{iΔωt}|. */
  const beat = $derived.by(() => {
    const [a, b] = src;
    if (!a || !b) return null;
    const a1 = a.amp * dbToGain(a.volumeDb), a2 = b.amp * dbToGain(b.volumeDb);
    const df = Math.abs(a.freq - b.freq);
    const n = 200, pts: string[] = [];
    const max = a1 + a2 || 1;
    for (let i = 0; i <= n; i++) {
      const tt = i / n;
      const e = Math.sqrt(a1 * a1 + a2 * a2 + 2 * a1 * a2 * Math.cos(2 * Math.PI * df * tt));
      pts.push(`${i ? 'L' : 'M'}${((i / n) * W).toFixed(1)} ${(54 - (e / max) * 50).toFixed(1)}`);
    }
    return { d: pts.join(' ') + ` L${W} 54 L0 54 Z`, df };
  });

  const pairs = $derived.by(() => {
    const out: { name: string; beat: number; cents: number }[] = [];
    src.forEach((a, i) => src.slice(i + 1).forEach((b) => {
      const ia = lab.gens.indexOf(a) + 1, ib = lab.gens.indexOf(b) + 1;
      out.push({ name: `G${ia} – G${ib}`, beat: Math.abs(a.freq - b.freq), cents: cents(b.freq, a.freq) });
    }));
    return out.slice(0, 12);
  });
</script>

<aside class="panel" aria-label={t('lab.panel')}>
  <div class="block">
    <div class="head"><span>{t('lab.sum')}</span><span>{playing.length ? `${playing.length} ${t('lab.playingCount')}` : t('lab.nothingPlaying')}</span></div>
    <svg viewBox="0 0 300 100" role="img" aria-label={t('lab.sum')}>
      <line x1="0" y1="50" x2="300" y2="50" stroke="var(--line-strong)" />
      <path d={sumPath.d} fill="none" stroke="var(--signal)" stroke-width="1.4" />
    </svg>
  </div>

  {#if beat}
    <div class="block">
      <div class="head"><span>{t('lab.beatEnvelope')}</span><span class="mono sig">{num(beat.df, i18n.locale, 3)} Hz</span></div>
      <svg viewBox="0 0 300 56" role="img" aria-label={t('lab.beatEnvelope')}>
        <line x1="0" y1="54" x2="300" y2="54" stroke="var(--line-strong)" />
        <path d={beat.d} fill="#5cc8e61f" stroke="var(--signal)" stroke-width="1.4" />
      </svg>
      <p class="hint">{beat.df === 0 ? t('lab.beatsNone') : beat.df < 20 ? t('lab.beatsAudible') : t('lab.beatsRough')}</p>
    </div>
  {/if}

  {#if pairs.length}
    <table>
      <thead><tr><th>{t('lab.pair')}</th><th class="r">{t('lab.beats')}</th><th class="r">{t('lab.interval')}</th></tr></thead>
      <tbody>
        {#each pairs as p (p.name)}
          <tr><td>{p.name}</td><td class="r mono">{num(p.beat, i18n.locale, 3)} Hz</td><td class="r mono">{signedCents(p.cents, i18n.locale)}</td></tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <div class="tags">
    <span class="tag calc">{t('lab.calculatedFromSettings')}</span>
    <span class="tag meas">{t('lab.measuredLater')}</span>
  </div>
</aside>

<style>
  .panel { display: flex; flex-direction: column; gap: 14px; background: var(--bg-raised); border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
  .block { display: flex; flex-direction: column; gap: 6px; }
  .head { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--text-2); }
  .sig { color: var(--signal); }
  svg { width: 100%; height: auto; display: block; }
  .hint { margin: 0; font-size: 11px; color: var(--text-2); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { font-size: 11px; font-weight: 500; color: var(--text-2); text-align: left; padding: 4px 0; }
  td { padding: 7px 0; border-top: 1px solid var(--line); }
  .r { text-align: right; }
  .tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .tag { font-size: 11px; border-radius: 6px; padding: 3px 7px; }
  .calc { color: var(--tag-calc); border: 1px solid #2d5563; }
  .meas { color: var(--tag-measured); border: 1px solid #2f5a42; }
</style>

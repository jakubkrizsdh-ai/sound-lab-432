<script lang="ts">
  import { i18n, t } from '../../i18n/index.svelte';
  import { num, signedCents } from '../../format';
  import { cents } from '../../tuning/ratio';
  import { PRESETS, pitch, type Pitch } from '../../tuning/systems';
  import { periodMs, wavelength } from '../../physics';
  import { CHAKRA_BY_NOTE } from '../../handpan/model';

  let { p, symbolic }: { p: Pitch; symbolic: boolean } = $props();
  const deg = $derived(p.source.degree);
  const oct = $derived(p.source.octave);
  const c432 = $derived(cents(p.hz, pitch(PRESETS.et432, deg, oct).hz));
  const c440 = $derived(cents(p.hz, pitch(PRESETS.et440, deg, oct).hz));
  const chakra = $derived(symbolic ? CHAKRA_BY_NOTE[deg] : undefined);
</script>

<section class="card">
  <div class="row"><span class="note">{deg}<sub>{oct}</sub></span><span class="mono hz">{num(p.hz, i18n.locale, 3)} Hz</span></div>
  <dl>
    {#if p.source.ratio}<dt>{t('hp.ratio')}</dt><dd class="mono">{p.source.ratio}</dd>{/if}
    <dt>{t('hp.period')}</dt><dd class="mono">{num(periodMs(p.hz), i18n.locale, 3)} ms</dd>
    <dt>{t('hp.wavelength')}</dt><dd class="mono">{num(wavelength(p.hz), i18n.locale, 3)} m</dd>
    <dt>{t('hp.vsEt432')}</dt><dd class="mono">{signedCents(c432, i18n.locale)}</dd>
    <dt>{t('hp.vsEt440')}</dt><dd class="mono">{signedCents(c440, i18n.locale)}</dd>
  </dl>
  <div class="tags">
    <span class="tag calc">{t('hp.calculated')}</span>
    {#if chakra}<span class="tag sym">{t('hp.symbolic')}: {chakra}</span>{/if}
  </div>
</section>

<style>
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
  .row { display: flex; justify-content: space-between; align-items: baseline; }
  .note { font-size: 26px; font-weight: 600; }
  .hz { font-size: 19px; color: var(--accent); }
  dl { margin: 0; display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; font-size: 13px; }
  dt { color: var(--text-2); }
  dd { margin: 0; text-align: right; }
  .tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .tag { font-size: 11px; border-radius: 6px; padding: 3px 7px; }
  .calc { color: var(--tag-calc); border: 1px solid #2d5563; }
  .sym { color: var(--tag-symbolic); border: 1px solid #4a3d63; }
</style>

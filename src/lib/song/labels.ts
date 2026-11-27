/** Názvy bubnů / conga úderů pro editor a studio (přes i18n). */
import { t } from '../i18n/index.svelte';
import { isCongaPad } from '../congas/kit';
import type { PercId } from './model';

export function percName(d: PercId, short = true): string {
  if (isCongaPad(d)) {
    const [drum, stroke] = d.split('.');
    return `${t(`cg.${drum}` as never)} ${t(`cg.short.${stroke}` as never)}`;
  }
  return t((short ? `dr.short.${d}` : `dr.${d}`) as never);
}

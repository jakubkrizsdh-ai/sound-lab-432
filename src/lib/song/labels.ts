/** Názvy bubnů / conga úderů pro editor a studio (přes i18n). */
import { t } from '../i18n/index.svelte';
import { isHandPad } from '../congas/kit';
import { isCajonPad } from '../cajon/kit';
import type { PercId } from './model';

export function percName(d: PercId, short = true): string {
  if (isCajonPad(d)) return `${t('ins.name.cajon' as never)} ${t(`cj.short.${d.split('.')[1]}` as never)}`;
  if (isHandPad(d)) {
    const [drum, stroke] = d.split('.');
    return `${t(`cg.${drum}` as never)} ${t(`cg.short.${stroke}` as never)}`;
  }
  return t((short ? `dr.short.${d}` : `dr.${d}`) as never);
}

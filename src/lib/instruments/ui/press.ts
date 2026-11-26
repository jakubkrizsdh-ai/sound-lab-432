import type { Pitch } from '../../tuning/systems';
import { inst, noteOff, noteOn, settingsOf } from '../store.svelte';

export interface PressParams {
  key: string;
  pitch: Pitch;
  /** síla podle místa úderu (střed silněji) */
  position?: boolean;
}

/**
 * Svelte akce pro hratelný prvek: dotyk/klik = začátek tónu, puštění = konec (u držených nástrojů).
 * Každý prst je samostatný (pointer capture), takže funguje hra více prsty najednou.
 */
export function press(node: HTMLElement, params: PressParams) {
  let p = params;
  const pointers = new Set<number>();

  const down = (e: PointerEvent) => {
    e.preventDefault();
    try { node.setPointerCapture(e.pointerId); } catch { /* */ }
    pointers.add(e.pointerId);
    let v = settingsOf(inst.current).velocity;
    if (e.pressure > 0 && e.pressure !== 0.5 && e.pointerType !== 'mouse') v = 0.25 + 0.75 * e.pressure;
    if (p.position) {
      const r = node.getBoundingClientRect();
      const d = Math.min(1, Math.hypot((e.clientX - r.left - r.width / 2) / (r.width / 2), (e.clientY - r.top - r.height / 2) / (r.height / 2)));
      v *= 1.08 - 0.25 * d;
    }
    noteOn(p.key, p.pitch, Math.min(1, Math.max(0.05, v)));
  };
  const up = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size === 0) noteOff(p.key);
  };
  const ctx = (e: Event) => e.preventDefault();

  node.addEventListener('pointerdown', down);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', up);
  node.addEventListener('contextmenu', ctx);
  return {
    update(np: PressParams) {
      p = np;
    },
    destroy() {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', up);
      node.removeEventListener('contextmenu', ctx);
    }
  };
}

/**
 * Stav frekvenční laboratoře: seznam generátorů a jejich běžící instance.
 * Generátory hrají dál i při přepnutí na jinou sekci; STOP ALL je zastaví.
 */
import { engine } from '../audio/engine.svelte';
import { Generator } from '../audio/generator';
import type { Plan } from '../audio/automation';
import { defaultGenerator, LIMITS, type GeneratorSettings } from './types';

let nextId = 1;
const newId = () => `g${nextId++}`;

export type MotionKind = 'sweep' | 'glissando' | 'steps';

export const lab = $state({
  gens: [defaultGenerator(newId(), 432), { ...defaultGenerator(newId(), 436), pan: 0 }] as GeneratorSettings[],
  running: {} as Record<string, boolean>,
  motion: {} as Record<string, MotionKind | undefined>
});

const instances = new Map<string, Generator>();

function audible(g: GeneratorSettings): boolean {
  const anySolo = lab.gens.some(x => x.solo);
  return !g.mute && (!anySolo || g.solo);
}

function applyAudibility() {
  for (const g of lab.gens) instances.get(g.id)?.setAudible(audible(g));
}

function launch(g: GeneratorSettings, when?: number) {
  const input = engine.input;
  const ctx = engine.ctx;
  if (!input || !ctx) return;
  const inst = new Generator(ctx, input, $state.snapshot(g) as GeneratorSettings, audible(g));
  inst.onEnded = () => {
    engine.removeVoice(inst);
    if (instances.get(g.id) === inst) {
      instances.delete(g.id);
      lab.running[g.id] = false;
      lab.motion[g.id] = undefined;
    }
  };
  instances.set(g.id, inst);
  engine.addVoice(inst);
  inst.start(when ?? ctx.currentTime);
  lab.running[g.id] = true;
}

export async function toggle(id: string) {
  const g = lab.gens.find(x => x.id === id);
  if (!g) return;
  const inst = instances.get(id);
  if (inst) {
    inst.stop();
    instances.delete(id);
    engine.removeVoice(inst);
    lab.running[id] = false;
    lab.motion[id] = undefined;
    return;
  }
  await engine.start();
  launch(g);
}

/** Spustí všechny zastavené generátory ve stejném okamžiku – fáze mezi nimi pak platí přesně. */
export async function startAll() {
  await engine.start();
  const ctx = engine.ctx;
  if (!ctx) return;
  // Běžící se zastaví a spustí znovu, aby fáze všech začala ve stejný okamžik.
  stopAllGenerators();
  const when = ctx.currentTime + 0.05;
  for (const g of lab.gens) launch(g, when);
}

export function stopAllGenerators() {
  for (const [id, inst] of instances) {
    inst.stop();
    engine.removeVoice(inst);
    lab.running[id] = false;
    lab.motion[id] = undefined;
  }
  instances.clear();
}

export function update(id: string, patch: Partial<GeneratorSettings>) {
  const i = lab.gens.findIndex(x => x.id === id);
  if (i < 0) return;
  const next = { ...lab.gens[i]!, ...patch } as GeneratorSettings;
  lab.gens[i] = next;
  instances.get(id)?.update($state.snapshot(next) as GeneratorSettings);
  if ('mute' in patch || 'solo' in patch) applyAudibility();
}

export function add() {
  if (lab.gens.length >= LIMITS.maxGenerators) return;
  const last = lab.gens.at(-1);
  lab.gens.push(defaultGenerator(newId(), last ? last.freq : 432));
}

export function remove(id: string) {
  const inst = instances.get(id);
  if (inst) {
    inst.stop();
    engine.removeVoice(inst);
    instances.delete(id);
  }
  lab.gens = lab.gens.filter(g => g.id !== id);
  delete lab.running[id];
  delete lab.motion[id];
  applyAudibility();
}

export function currentFrequency(id: string): number | null {
  return instances.get(id)?.currentFrequency ?? null;
}

export function planFinished(id: string): boolean {
  return instances.get(id)?.planFinished() ?? false;
}

/** Spustí pohyb frekvence; zastavený generátor se nejdřív zapne. */
export async function runMotion(id: string, kind: MotionKind, plan: Plan) {
  if (!instances.get(id)) await toggle(id);
  const inst = instances.get(id);
  if (!inst) return;
  inst.runPlan(plan);
  lab.motion[id] = kind;
}

/** Zastaví pohyb a uloží frekvenci, na které se zastavil. */
export function stopMotion(id: string) {
  const inst = instances.get(id);
  lab.motion[id] = undefined;
  if (!inst) return;
  const hz = inst.stopPlan();
  const i = lab.gens.findIndex(x => x.id === id);
  if (i >= 0) lab.gens[i] = { ...lab.gens[i]!, freq: Math.round(hz * 1000) / 1000, pitch: undefined };
}

/** Rychlé ukázky – nastaví generátory (nespouští je). */
export function loadPreset(name: 'beats' | 'fifth' | 'image') {
  stopAllGenerators();
  nextId = 1;
  if (name === 'beats') {
    lab.gens = [defaultGenerator(newId(), 432), defaultGenerator(newId(), 436)];
  } else if (name === 'fifth') {
    lab.gens = [defaultGenerator(newId(), 256), defaultGenerator(newId(), 384)];
  } else {
    lab.gens = [128, 256, 512].map(f => ({ ...defaultGenerator(newId(), f), amp: 0.3 }));
  }
  lab.running = {};
  lab.motion = {};
}

if (typeof window !== 'undefined') {
  window.addEventListener('soundlab:stop-all', () => {
    for (const inst of instances.values()) inst.stop();
    instances.clear();
    lab.running = {};
    lab.motion = {};
  });
}

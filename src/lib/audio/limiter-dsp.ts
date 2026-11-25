/**
 * Stereo limiter s předstihem (lookahead) a odhadem mezivzorkových špiček.
 * Čistý výpočet bez Web Audio – běží v AudioWorkletu a dá se testovat v Node.
 *
 * Princip: signál se zpozdí o `lookahead` vzorků. Pro každý příchozí vzorek se spočítá
 * potřebné zesílení (strop / špička). Zesílení klesá plynule (attack) už během předstihu,
 * takže když špička dorazí na výstup, je ztlumená. Pojistka na výstupu zaručí strop vždy.
 */
export interface LimiterOptions {
  sampleRate: number;
  ceilingDb?: number;     // výchozí −1 dBFS
  lookaheadMs?: number;   // výchozí 5 ms
  attackMs?: number;      // výchozí 1 ms
  releaseMs?: number;     // výchozí 120 ms
}

export class LimiterDSP {
  readonly ceiling: number;
  private readonly la: number;
  private readonly bufL: Float32Array;
  private readonly bufR: Float32Array;
  // Monotónní fronta (klouzavé minimum požadovaného zesílení přes okno předstihu, O(1))
  private readonly qVal: Float32Array;
  private readonly qIdx: Float64Array;
  private qHead = 0;
  private qTail = 0;
  private t = 0;
  private w = 0;
  private gain = 1;
  private readonly attackCoef: number;
  private readonly releaseCoef: number;
  // posledních několik vstupních vzorků pro odhad mezivzorkové špičky
  private h: number[] = [0, 0, 0, 0];
  /** Největší ztlumení od posledního přečtení, v dB (kladné číslo). */
  maxReductionDb = 0;

  constructor(o: LimiterOptions) {
    this.ceiling = 10 ** ((o.ceilingDb ?? -1) / 20);
    this.la = Math.max(1, Math.round(((o.lookaheadMs ?? 5) / 1000) * o.sampleRate));
    this.bufL = new Float32Array(this.la);
    this.bufR = new Float32Array(this.la);
    this.qVal = new Float32Array(this.la + 1);
    this.qIdx = new Float64Array(this.la + 1);
    this.attackCoef = Math.exp(-1 / (((o.attackMs ?? 1) / 1000) * o.sampleRate));
    this.releaseCoef = Math.exp(-1 / (((o.releaseMs ?? 120) / 1000) * o.sampleRate));
  }

  get latencySamples(): number {
    return this.la;
  }

  /** Odhad špičky mezi vzorky (Catmull-Rom ve třech bodech mezi h1 a h2). */
  private interPeak(h0: number, h1: number, h2: number, h3: number): number {
    let p = Math.max(Math.abs(h1), Math.abs(h2));
    for (const t of [0.25, 0.5, 0.75]) {
      const t2 = t * t, t3 = t2 * t;
      const v = 0.5 * (2 * h1 + (-h0 + h2) * t + (2 * h0 - 5 * h1 + 4 * h2 - h3) * t2 + (-h0 + 3 * h1 - 3 * h2 + h3) * t3);
      p = Math.max(p, Math.abs(v));
    }
    return p;
  }

  /** Zpracuje blok vzorků na místě. Pravý kanál může chybět (mono). */
  process(left: Float32Array, right?: Float32Array): void {
    const n = left.length;
    for (let i = 0; i < n; i++) {
      const xl = left[i]!;
      const xr = right ? right[i]! : xl;
      const m = Math.max(Math.abs(xl), Math.abs(xr));
      const h = this.h;
      h.shift();
      h.push(m);
      const peak = Math.max(m, this.interPeak(h[0]!, h[1]!, h[2]!, h[3]!));
      const need = peak > this.ceiling ? this.ceiling / peak : 1;

      // zápis do zpožďovací linky, čtení nejstaršího vzorku
      const pos = this.w;
      const outL = this.bufL[pos]!;
      const outR = this.bufR[pos]!;
      this.bufL[pos] = xl;
      this.bufR[pos] = xr;
      this.w = (pos + 1) % this.la;

      // klouzavé minimum požadavků za posledních `la` vzorků
      const cap = this.la + 1;
      const t = this.t++;
      while (this.qTail !== this.qHead && this.qVal[(this.qTail - 1 + cap) % cap]! >= need) {
        this.qTail = (this.qTail - 1 + cap) % cap;
      }
      this.qVal[this.qTail] = need;
      this.qIdx[this.qTail] = t;
      this.qTail = (this.qTail + 1) % cap;
      while (this.qIdx[this.qHead]! <= t - this.la) this.qHead = (this.qHead + 1) % cap;
      const target = this.qVal[this.qHead]!;

      if (target < this.gain) this.gain = target + (this.gain - target) * this.attackCoef;
      else this.gain = target + (this.gain - target) * this.releaseCoef;

      // zaručený strop pro právě odcházející vzorek
      const outPeak = Math.max(Math.abs(outL), Math.abs(outR));
      let g = this.gain;
      if (outPeak * g > this.ceiling) g = this.ceiling / outPeak;

      left[i] = outL * g;
      if (right) right[i] = outR * g;
      if (g < 1) {
        const red = -20 * Math.log10(g);
        if (red > this.maxReductionDb) this.maxReductionDb = red;
      }
    }
  }

  reset(): void {
    this.bufL.fill(0);
    this.bufR.fill(0);
    this.qHead = this.qTail = 0;
    this.t = 0;
    this.h = [0, 0, 0, 0];
    this.gain = 1;
    this.maxReductionDb = 0;
  }
}

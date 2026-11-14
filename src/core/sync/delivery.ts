// Ball-pinned delivery (F-SYNC). Items are held until the listener's playhead reaches their anchor. Pure.
export interface Anchored { id: string; anchorSeq: number; sentAt: number }

/** FR-007: anchor = latest completed (revealed) ball at send time; before the first ball → 0. */
export const anchorFor = (playheadSeq: number) => Math.max(0, playheadSeq);

export class DeliveryQueue<T extends Anchored> {
  private pending: T[] = [];
  private delivered = new Set<string>();
  add(item: T) { if (!this.delivered.has(item.id) && !this.pending.some((p) => p.id === item.id)) this.pending.push(item); }
  /** FR-008: return items whose anchor ≤ playhead, in anchor order then send time. */
  release(playheadSeq: number): T[] {
    const due = this.pending.filter((p) => p.anchorSeq <= playheadSeq)
      .sort((a, b) => a.anchorSeq - b.anchorSeq || a.sentAt - b.sentAt);
    if (!due.length) return [];
    const ids = new Set(due.map((d) => d.id));
    this.pending = this.pending.filter((p) => !ids.has(p.id));
    due.forEach((d) => this.delivered.add(d.id));
    return due;
  }
  get size() { return this.pending.length; }
}

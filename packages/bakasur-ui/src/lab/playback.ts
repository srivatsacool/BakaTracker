/*
 * BAKASUR-UI — Original Bakasur work (Phase 7).
 *
 * Lab playback driver: deterministic elapsed-time accumulation over the
 * preset timeline. No rAF in here, no Date.now — the component feeds
 * timestamps in (`tick`), so tests drive time by hand and playback stays
 * exactly reproducible. Looping and the end stop are the caller's call;
 * this only reports where the playhead is.
 */

export class LabPlayback {
  private running = false
  private elapsed = 0
  private anchor = 0

  get isPlaying(): boolean {
    return this.running
  }

  get time(): number {
    return this.elapsed
  }

  play(nowMs: number, from?: number): void {
    if (from !== undefined) this.elapsed = Math.max(0, from)
    this.anchor = nowMs
    this.running = true
  }

  pause(nowMs: number): void {
    if (!this.running) return
    this.elapsed += Math.max(0, (nowMs - this.anchor) / 1000)
    this.running = false
  }

  reset(): void {
    this.elapsed = 0
    this.running = false
  }

  seek(t: number, nowMs?: number): void {
    this.elapsed = Math.max(0, t)
    // While playing, re-anchor so the seek doesn't jump on the next tick.
    if (this.running) this.anchor = nowMs ?? this.anchor
  }

  /**
   * Advance to `nowMs`. Returns the clamped elapsed time; `ended` is true
   * when the playhead reached `duration` (caller stops or loops).
   */
  tick(nowMs: number, duration: number): { elapsed: number; ended: boolean } {
    if (this.running) this.elapsed += Math.max(0, (nowMs - this.anchor) / 1000)
    this.anchor = nowMs
    const total = Math.max(0.05, duration)
    if (this.elapsed >= total) return { elapsed: total, ended: true }
    return { elapsed: this.elapsed, ended: false }
  }
}

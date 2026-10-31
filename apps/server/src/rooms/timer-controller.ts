/**
 * Manages named server timers for a room with clean disposal and test-speed scaling.
 */
export class TimerController {
  private timers = new Map<string, NodeJS.Timeout>();
  private timerScale: number;

  constructor(timerScale = 1.0) {
    this.timerScale = timerScale > 0 ? timerScale : 1.0;
  }

  /**
   * Schedules a named timer, clearing any previously scheduled timer with the same name.
   */
  set(name: string, delayMs: number, callback: () => void): void {
    this.clear(name);

    const scaledDelay = Math.max(0, Math.round(delayMs * this.timerScale));
    const handle = setTimeout(() => {
      this.timers.delete(name);
      callback();
    }, scaledDelay);

    this.timers.set(name, handle);
  }

  /**
   * Clears a named timer if active.
   */
  clear(name: string): void {
    const handle = this.timers.get(name);
    if (handle) {
      clearTimeout(handle);
      this.timers.delete(name);
    }
  }

  /**
   * Clears all active timers in the room to prevent leaked timer handles.
   */
  clearAll(): void {
    for (const handle of this.timers.values()) {
      clearTimeout(handle);
    }
    this.timers.clear();
  }

  /**
   * Checks whether a named timer is currently running.
   */
  has(name: string): boolean {
    return this.timers.has(name);
  }

  /**
   * Returns current timer scale multiplier.
   */
  getScale(): number {
    return this.timerScale;
  }
}

/**
 * In-memory sliding window rate limiter per socket or IP.
 */
export class RateLimiter {
  private timestamps = new Map<string, number[]>();

  /**
   * Checks whether the given key has exceeded the limit within windowMs.
   * Returns true if allowed, false if rate limited.
   */
  public check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const list = this.timestamps.get(key) || [];
    const windowStart = now - windowMs;
    const recent = list.filter((t) => t > windowStart);

    if (recent.length >= limit) {
      this.timestamps.set(key, recent);
      return false;
    }

    recent.push(now);
    this.timestamps.set(key, recent);
    return true;
  }

  /**
   * Resets rate limit records for a key or clears all.
   */
  public clear(key?: string): void {
    if (key) {
      this.timestamps.delete(key);
    } else {
      this.timestamps.clear();
    }
  }
}

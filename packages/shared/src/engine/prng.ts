import { CUSTOMER_ORDERS } from '../data/customer-orders.js';
import type { CustomerOrder } from '../types/models.js';

/**
 * Pure 32-bit PRNG using the Mulberry32 algorithm.
 * Guarantees identical sequence across platforms (Node, V8, Browser).
 */
export function createPrng(seed: number): () => number {
  let a = seed >>> 0;
  return function mulberry32(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * Deterministic coin flip between seat 0 and seat 1.
 * Returns 0 or 1.
 */
export function coinFlip(seed: number, roundIndex: number, salt = 0): 0 | 1 {
  const hash = (seed ^ Math.imul(roundIndex + 1, 0x9e3779b9) ^ salt) >>> 0;
  const prng = createPrng(hash);
  return prng() < 0.5 ? 0 : 1;
}

/**
 * Selects N unique customer orders deterministically based on seed.
 */
export function pickDeterministicCustomerOrders(seed: number, count = 2): CustomerOrder[] {
  const prng = createPrng(seed);
  const pool = [...CUSTOMER_ORDERS];
  const selected: CustomerOrder[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(prng() * pool.length);
    selected.push(pool.splice(idx, 1)[0]!);
  }

  return selected;
}

import type { TierId } from '@bidding-kitchen/shared';

export interface QueueTicket {
  ticketId: string;
  socketId: string;
  nickname: string;
  tier: TierId;
  enqueuedAt: number;
}

export type EnqueueResult =
  | { matched: false; ticketId: string }
  | {
      matched: true;
      ticketId: string;
      ticketA: QueueTicket;
      ticketB: QueueTicket;
      tier: TierId;
    };

export class MatchmakingQueue {
  private queues: Record<TierId, QueueTicket[]> = {
    STREET: [],
    BISTRO: [],
    CHEFS_TABLE: [],
  };
  private ticketMap: Map<string, QueueTicket> = new Map();
  private socketTicketMap: Map<string, string> = new Map();

  /**
   * Enqueues a player for a specific tier.
   * If an opponent is already waiting in that tier, pairs them immediately (FIFO)
   * and removes both from the queue.
   */
  public enqueue(entry: { socketId: string; nickname: string; tier: TierId }): EnqueueResult {
    // If the socket was already in queue for any tier, remove the old ticket first
    this.leaveQueueBySocket(entry.socketId);

    const ticketId = `ticket_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const fullTicket: QueueTicket = {
      ...entry,
      ticketId,
      enqueuedAt: Date.now(),
    };

    const tierQueue = this.queues[entry.tier];
    if (tierQueue && tierQueue.length > 0) {
      // FIFO match found!
      const ticketA = tierQueue.shift()!;
      this.ticketMap.delete(ticketA.ticketId);
      this.socketTicketMap.delete(ticketA.socketId);

      return {
        matched: true,
        ticketId,
        ticketA,
        ticketB: fullTicket,
        tier: entry.tier,
      };
    }

    // No opponent waiting; append to queue
    tierQueue.push(fullTicket);
    this.ticketMap.set(ticketId, fullTicket);
    this.socketTicketMap.set(entry.socketId, ticketId);

    return {
      matched: false,
      ticketId,
    };
  }

  /**
   * Removes a player from the queue using their ticket ID.
   */
  public leaveQueue(ticketId: string): boolean {
    const ticket = this.ticketMap.get(ticketId);
    if (!ticket) return false;

    this.ticketMap.delete(ticketId);
    this.socketTicketMap.delete(ticket.socketId);

    const tierQueue = this.queues[ticket.tier];
    if (tierQueue) {
      const idx = tierQueue.findIndex((t) => t.ticketId === ticketId);
      if (idx !== -1) {
        tierQueue.splice(idx, 1);
      }
    }
    return true;
  }

  /**
   * Removes a player from the queue by their socket ID.
   */
  public leaveQueueBySocket(socketId: string): boolean {
    const ticketId = this.socketTicketMap.get(socketId);
    if (!ticketId) return false;
    return this.leaveQueue(ticketId);
  }

  /**
   * Prunes a disconnected socket from the matchmaking queue.
   */
  public pruneDisconnected(socketId: string): boolean {
    return this.leaveQueueBySocket(socketId);
  }

  /**
   * Returns current count of queued players per tier.
   */
  public getQueueStats(): Record<TierId, number> {
    return {
      STREET: this.queues.STREET.length,
      BISTRO: this.queues.BISTRO.length,
      CHEFS_TABLE: this.queues.CHEFS_TABLE.length,
    };
  }

  /**
   * Checks if a socket is currently waiting in any queue.
   */
  public isSocketEnqueued(socketId: string): boolean {
    return this.socketTicketMap.has(socketId);
  }

  /**
   * Retrieves ticket details by ticket ID.
   */
  public getTicket(ticketId: string): QueueTicket | undefined {
    return this.ticketMap.get(ticketId);
  }

  /**
   * Clears all queues (used in tests/resets).
   */
  public clear(): void {
    this.queues.STREET = [];
    this.queues.BISTRO = [];
    this.queues.CHEFS_TABLE = [];
    this.ticketMap.clear();
    this.socketTicketMap.clear();
  }
}

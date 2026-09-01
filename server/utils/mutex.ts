/**
 * KeyedMutex provides concurrency control for async operations on keyed resources.
 * Ensures that simultaneous operations on the exact same resource (e.g. candidate evaluations,
 * candidate status modifications) are executed strictly sequentially without race conditions.
 */
export class KeyedMutex {
  private queues: Map<string, Promise<void>> = new Map();

  /**
   * Executes a critical asynchronous task while holding an exclusive lock on the given key.
   * Other tasks with the same key will wait until the previous one finishes.
   */
  async runExclusive<T>(key: string, task: () => Promise<T>): Promise<T> {
    const currentQueue = this.queues.get(key) || Promise.resolve();

    let releaseLock: () => void;
    const nextInQueue = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    // Append to queue
    this.queues.set(key, currentQueue.then(() => nextInQueue));

    try {
      // Wait for our turn
      await currentQueue;
      return await task();
    } finally {
      // Release lock for the next task
      releaseLock!();
      // Cleanup map if this was the last queued task
      if (this.queues.get(key) === nextInQueue) {
        this.queues.delete(key);
      }
    }
  }
}

export const candidateMutex = new KeyedMutex();
export const roomMutex = new KeyedMutex();
export const globalMutex = new KeyedMutex();


type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitStats {
  failures: number;
  lastFailure: number;
  state: CircuitState;
}

export class CircuitBreaker {
  private static instance: CircuitBreaker;
  private circuits = new Map<string, CircuitStats>();
  
  private readonly FAILURE_THRESHOLD = 5;
  private readonly RESET_TIMEOUT = 60000; // 60s

  private constructor() {}

  static getInstance(): CircuitBreaker {
    if (!CircuitBreaker.instance) {
      CircuitBreaker.instance = new CircuitBreaker();
    }
    return CircuitBreaker.instance;
  }

  private getStats(key: string): CircuitStats {
    if (!this.circuits.has(key)) {
      this.circuits.set(key, { failures: 0, lastFailure: 0, state: 'CLOSED' });
    }
    return this.circuits.get(key)!;
  }

  public async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const stats = this.getStats(key);

    if (stats.state === 'OPEN') {
      if (Date.now() - stats.lastFailure > this.RESET_TIMEOUT) {
        stats.state = 'HALF_OPEN';
        console.log(`[CircuitBreaker] ${key} entering HALF_OPEN state.`);
      } else {
        throw new Error(`CircuitBreaker: ${key} is OPEN. Requests blocked.`);
      }
    }

    try {
      const result = await fn();
      
      if (stats.state === 'HALF_OPEN') {
        stats.state = 'CLOSED';
        stats.failures = 0;
        console.log(`[CircuitBreaker] ${key} recovered. State CLOSED.`);
      }
      return result;

    } catch (error) {
      stats.failures++;
      stats.lastFailure = Date.now();
      
      if (stats.failures >= this.FAILURE_THRESHOLD) {
        stats.state = 'OPEN';
        console.error(`[CircuitBreaker] ${key} threshold reached. State OPEN.`);
      }
      
      throw error;
    }
  }

  public reset(key: string) {
    this.circuits.delete(key);
  }
}

export const circuitBreaker = CircuitBreaker.getInstance();

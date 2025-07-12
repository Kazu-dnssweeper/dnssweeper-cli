/**
 * オブジェクトプール実装（メモリ効率向上）
 */

export interface PoolableObject {
  reset(): void;
}

export class ObjectPool<T extends PoolableObject> {
  private pool: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T;
  private maxSize: number;
  private resetFn?: (obj: T) => void;

  constructor(
    factory: () => T,
    options: {
      maxSize?: number;
      initialSize?: number;
      resetFn?: (obj: T) => void;
    } = {}
  ) {
    this.factory = factory;
    this.maxSize = options.maxSize || 100;
    this.resetFn = options.resetFn;

    // 初期オブジェクトを作成
    const initialSize = options.initialSize || 10;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createObject());
    }
  }

  /**
   * オブジェクトを取得
   */
  acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else if (this.inUse.size < this.maxSize) {
      obj = this.createObject();
    } else {
      throw new Error('ObjectPool: プールが満杯です');
    }

    this.inUse.add(obj);
    return obj;
  }

  /**
   * オブジェクトを返却
   */
  release(obj: T): void {
    if (!this.inUse.has(obj)) {
      return;
    }

    this.inUse.delete(obj);
    this.resetObject(obj);
    this.pool.push(obj);
  }

  /**
   * 複数オブジェクトを一括取得
   */
  acquireBatch(count: number): T[] {
    const objects: T[] = [];
    for (let i = 0; i < count; i++) {
      objects.push(this.acquire());
    }
    return objects;
  }

  /**
   * 複数オブジェクトを一括返却
   */
  releaseBatch(objects: T[]): void {
    for (const obj of objects) {
      this.release(obj);
    }
  }

  /**
   * プールの状態を取得
   */
  getStats(): {
    poolSize: number;
    inUseSize: number;
    totalSize: number;
    utilization: number;
  } {
    const poolSize = this.pool.length;
    const inUseSize = this.inUse.size;
    const totalSize = poolSize + inUseSize;
    const utilization = totalSize > 0 ? (inUseSize / totalSize) * 100 : 0;

    return {
      poolSize,
      inUseSize,
      totalSize,
      utilization,
    };
  }

  /**
   * プールをクリア
   */
  clear(): void {
    this.pool = [];
    this.inUse.clear();
  }

  /**
   * オブジェクトを作成
   */
  private createObject(): T {
    return this.factory();
  }

  /**
   * オブジェクトをリセット
   */
  private resetObject(obj: T): void {
    if (this.resetFn) {
      this.resetFn(obj);
    } else {
      obj.reset();
    }
  }
}

/**
 * 汎用的なオブジェクトプール用クラス
 */
export class PoolableRecord implements PoolableObject {
  public data: Record<string, any> = {};

  reset(): void {
    this.data = {};
  }
}

/**
 * 配列プール用クラス
 */
export class PoolableArray<T> implements PoolableObject {
  public items: T[] = [];

  reset(): void {
    this.items = [];
  }

  push(...items: T[]): void {
    this.items.push(...items);
  }

  get length(): number {
    return this.items.length;
  }
}
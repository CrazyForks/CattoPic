class ImageQueue {
  private queue: string[] = [];
  private loading: Set<string> = new Set();
  private maxConcurrent: number = 10;
  private preloadCache: Map<string, HTMLImageElement> = new Map();
  private maxCacheSize: number = 50;
  private lowPriorityQueue: string[] = [];

  constructor(maxConcurrent: number = 10, maxCacheSize: number = 50) {
    this.maxConcurrent = maxConcurrent;
    this.maxCacheSize = maxCacheSize;
  }

  add(imageUrl: string, highPriority: boolean = false) {
    if (this.preloadCache.has(imageUrl) || this.loading.has(imageUrl)) {
      return;
    }

    if (highPriority) {
      if (!this.queue.includes(imageUrl)) {
        this.queue.unshift(imageUrl);
      }
    } else {
      if (!this.lowPriorityQueue.includes(imageUrl)) {
        this.lowPriorityQueue.push(imageUrl);
      }
    }
    
    this.processQueue();
  }

  private async processQueue() {
    if (this.loading.size >= this.maxConcurrent) {
      return;
    }

    // Process high priority queue first
    let url = this.queue.shift();
    if (!url && this.lowPriorityQueue.length > 0) {
      url = this.lowPriorityQueue.shift();
    }
    
    if (!url) return;

    this.loading.add(url);

    try {
      const img = await this.preloadImage(url);
      this.addToCache(url, img);
    } catch (error) {
      console.error(`Failed to preload image: ${url}`, error);
    } finally {
      this.loading.delete(url);
      this.processQueue();
    }
  }

  private preloadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('Image load timeout'));
      }, 20000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Image load failed'));
      };

      // Enable browser caching
      img.setAttribute('crossOrigin', 'anonymous');
      img.src = url;
    });
  }

  private addToCache(url: string, img: HTMLImageElement) {
    // Implement LRU cache
    if (this.preloadCache.size >= this.maxCacheSize) {
      const oldestEntry = Array.from(this.preloadCache.entries())[0];
      if (oldestEntry) {
        this.preloadCache.delete(oldestEntry[0]);
      }
    }
    this.preloadCache.set(url, img);
  }

  getPreloadedImage(url: string): HTMLImageElement | undefined {
    const img = this.preloadCache.get(url);
    if (img) {
      img.dataset.lastUsed = Date.now().toString();
    }
    return img;
  }

  isPreloaded(url: string): boolean {
    return this.preloadCache.has(url);
  }

  clear() {
    this.queue = [];
    this.lowPriorityQueue = [];
    this.loading.clear();
    this.preloadCache.clear();
  }

  // 清理长时间未使用的缓存
  cleanupUnusedCache(maxAgeMs: number = 5 * 60 * 1000) {
    const now = Date.now();
    for (const [url, img] of Array.from(this.preloadCache.entries())) {
      const lastUsed = parseInt(img.dataset.lastUsed || '0');
      if (now - lastUsed > maxAgeMs) {
        this.preloadCache.delete(url);
      }
    }
  }
}

export const imageQueue = new ImageQueue(10, 50); 
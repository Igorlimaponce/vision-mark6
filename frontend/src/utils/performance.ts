// Utilitários de performance conforme seção 13 do manual

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

export const batchRequests = <T>(
  requests: (() => Promise<T>)[],
  batchSize: number = 5
): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const results: T[] = [];
    let completed = 0;
    let hasError = false;

    const processBatch = (startIndex: number) => {
      const batch = requests.slice(startIndex, startIndex + batchSize);
      
      Promise.allSettled(batch.map(request => request()))
        .then(batchResults => {
          if (hasError) return;

          batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              results[startIndex + index] = result.value;
            } else {
              hasError = true;
              reject(result.reason);
              return;
            }
          });

          completed += batch.length;

          if (completed >= requests.length) {
            resolve(results);
          } else {
            processBatch(startIndex + batchSize);
          }
        })
        .catch(reject);
    };

    processBatch(0);
  });
};

export const retry = async <T>(
  func: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await func();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
};

export const measurePerformance = (name: string) => {
  const start = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - start;
      console.debug(`Performance [${name}]: ${duration.toFixed(2)}ms`);
      return duration;
    }
  };
};

export const lazyLoad = <T>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: T
): Promise<T> => {
  return importFunc()
    .then(module => module.default)
    .catch(() => {
      if (fallback) {
        return fallback;
      }
      throw new Error('Failed to lazy load module');
    });
};

export const virtualScroll = (
  items: any[],
  containerHeight: number,
  itemHeight: number,
  scrollTop: number
) => {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight),
    items.length
  );

  return {
    startIndex,
    endIndex,
    visibleItems: items.slice(startIndex, endIndex),
    offsetY: startIndex * itemHeight,
    totalHeight: items.length * itemHeight,
  };
};

export const optimizeImages = (
  src: string,
  width?: number,
  height?: number,
  quality: number = 80
): string => {
  // Implementação básica - pode ser extendida com serviços como Cloudinary
  const params = new URLSearchParams();
  
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  if (quality !== 80) params.append('q', quality.toString());

  const queryString = params.toString();
  return queryString ? `${src}?${queryString}` : src;
};

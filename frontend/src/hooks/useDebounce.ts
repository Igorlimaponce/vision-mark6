import { useState, useEffect, useCallback } from 'react';

interface UseDebounceOptions {
  delay?: number;
}

export const useDebounce = <T>(value: T, options: UseDebounceOptions = {}) => {
  const { delay = 300 } = options;
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

interface UseDebouncedCallbackOptions {
  delay?: number;
  leading?: boolean;
  trailing?: boolean;
}

export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  options: UseDebouncedCallbackOptions = {}
) => {
  const { delay = 300, leading = false, trailing = true } = options;
  const [lastCallTime, setLastCallTime] = useState<number | null>(null);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (leading && (!lastCallTime || now - lastCallTime > delay)) {
        callback(...args);
        setLastCallTime(now);
      }

      if (trailing) {
        const newTimeoutId = setTimeout(() => {
          callback(...args);
          setLastCallTime(Date.now());
          setTimeoutId(null);
        }, delay);
        
        setTimeoutId(newTimeoutId as any);
      }
    },
    [callback, delay, leading, trailing, lastCallTime, timeoutId]
  );

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return debouncedCallback;
};

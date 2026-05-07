import { useState, useCallback } from 'react';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useApi<T>(
  apiFunc: (...args: any[]) => Promise<T>,
  options: UseApiOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: any[]) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFunc(...args);
        setData(result);
        options.onSuccess?.(result);
        return result;
      } catch (err: any) {
        const message = err.message || 'Error inesperado';
        setError(message);
        options.onError?.(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunc, options.onSuccess, options.onError]
  );

  return { data, loading, error, execute };
}

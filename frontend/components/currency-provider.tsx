'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '@/lib/api';

interface CurrencyProviderProps {
  userId: string;
  children: React.ReactNode;
}

interface CurrencyContextValue {
  currency: string;
  setCurrency: (currency: string) => void;
  formatCurrency: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const DEFAULT_CURRENCY = 'USD';

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ userId, children }: CurrencyProviderProps) {
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);

  useEffect(() => {
    fetch(apiUrl('/api/profile'), {
      headers: { 'x-user-id': userId },
    })
      .then((response) => response.json())
      .then((data) => setCurrency(data.data?.currency || DEFAULT_CURRENCY))
      .catch((error) => console.error('Error fetching profile currency:', error));
  }, [userId]);

  const formatCurrency = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        ...options,
      }).format(Number(value || 0));
    } catch {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: DEFAULT_CURRENCY,
        ...options,
      }).format(Number(value || 0));
    }
  }, [currency]);

  const value = useMemo(() => ({
    currency,
    setCurrency,
    formatCurrency,
  }), [currency, formatCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }

  return context;
}

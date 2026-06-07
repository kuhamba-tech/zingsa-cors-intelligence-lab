import React, { createContext, useContext } from 'react';
import { useCorsNetworkData } from '../hooks/useCorsNetworkData.js';

const CorsAlertDataContext = createContext(null);

export function CorsAlertDataProvider({ children }) {
  const value = useCorsNetworkData();
  return (
    <CorsAlertDataContext.Provider value={value}>
      {children}
    </CorsAlertDataContext.Provider>
  );
}

export function useCorsAlertData() {
  const ctx = useContext(CorsAlertDataContext);
  if (!ctx) throw new Error('useCorsAlertData must be used within CorsAlertDataProvider');
  return ctx;
}

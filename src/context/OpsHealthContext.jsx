import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCorsStationHealth } from '../services/corsApi.js';
import { ZIMBABWE_CORS_STATIONS } from '../data/zimbabweCorsStations.js';
import { loadCorsAlertSettings } from '../utils/corsAlertSettings.js';
import { summarizeActiveAlertsFromHealth, summarizeZimHealth } from '../utils/corsNetworkData.js';

const REFRESH_MS = 5 * 60 * 1000;

const OpsHealthContext = createContext(null);

export function OpsHealthProvider({ children }) {
  const [healthPayload, setHealthPayload] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const health = await getCorsStationHealth({ country: 'Zimbabwe' }).catch(() => null);
      setHealthPayload(health);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const zimIds = useMemo(() => ZIMBABWE_CORS_STATIONS.map(s => s.id), []);
  const healthStats = useMemo(() => summarizeZimHealth(healthPayload, zimIds), [healthPayload, zimIds]);
  const alertStats = useMemo(
    () => summarizeActiveAlertsFromHealth(healthPayload, { thresholds: loadCorsAlertSettings().thresholds }),
    [healthPayload],
  );

  const stationIssues = (healthStats.offline ?? 0) + (healthStats.degraded ?? 0);
  const alertCount = alertStats.count ?? 0;
  const badgeCount = stationIssues > 0 ? stationIssues : alertCount;
  const alertsPath = stationIssues > 0
    ? '/alerts?tab=stations'
    : alertCount > 0
      ? '/alerts?tab=alerts'
      : '/alerts';

  const value = useMemo(() => ({
    healthPayload,
    healthStats,
    alertStats,
    loading,
    refresh,
    stationIssues,
    alertCount,
    badgeCount,
    alertsPath,
  }), [
    healthPayload,
    healthStats,
    alertStats,
    loading,
    refresh,
    stationIssues,
    alertCount,
    badgeCount,
    alertsPath,
  ]);

  return (
    <OpsHealthContext.Provider value={value}>
      {children}
    </OpsHealthContext.Provider>
  );
}

export function useOpsHealth() {
  const ctx = useContext(OpsHealthContext);
  if (!ctx) throw new Error('useOpsHealth must be used within OpsHealthProvider');
  return ctx;
}

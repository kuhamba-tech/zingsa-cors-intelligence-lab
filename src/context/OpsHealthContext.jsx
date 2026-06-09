import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCorsStationHealth } from '../services/corsApi.js';
import { ZIMBABWE_CORS_STATIONS } from '../data/zimbabweCorsStations.js';
import { loadCorsAlertSettings } from '../utils/corsAlertSettings.js';
import { summarizeActiveAlertsFromHealth, summarizeZimHealth } from '../utils/corsNetworkData.js';

const REFRESH_MS = 5 * 60 * 1000;
const ZIM_IDS = ZIMBABWE_CORS_STATIONS.map(s => s.id);
const TOTAL_STATIONS = ZIMBABWE_CORS_STATIONS.length;

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

  const healthStats = useMemo(
    () => summarizeZimHealth(healthPayload, ZIM_IDS),
    [healthPayload],
  );

  const alertStats = useMemo(
    () => summarizeActiveAlertsFromHealth(healthPayload, { thresholds: loadCorsAlertSettings().thresholds }),
    [healthPayload],
  );

  /**
   * networkMetrics is the SINGLE SOURCE OF TRUTH for all aggregate network numbers.
   * Every page must read from here — never re-derive from healthPayload independently.
   *
   *  healthPct  = online / total          → "Network Health" (29%)
   *  uptimePct  = (online×100 + degraded×50) / total  → "Uptime" (65%)
   */
  const networkMetrics = useMemo(() => {
    const online   = healthStats.online   ?? 0;
    const degraded = healthStats.degraded ?? 0;
    const offline  = healthStats.offline  ?? 0;
    const total    = TOTAL_STATIONS;
    const healthPct = total ? Math.round((online / total) * 100) : 0;
    const uptimePct = total ? Math.round((online * 100 + degraded * 50) / total) : 0;
    return {
      total,
      online,
      degraded,
      offline,
      healthPct,
      uptimePct,
      alertCount:    alertStats.count    ?? 0,
      criticalCount: alertStats.critical ?? 0,
      warningCount:  alertStats.warning  ?? 0,
    };
  }, [healthStats, alertStats]);

  const stationIssues = networkMetrics.offline + networkMetrics.degraded;
  const badgeCount    = stationIssues > 0 ? stationIssues : networkMetrics.alertCount;
  const alertsPath    = stationIssues > 0
    ? '/alerts?tab=stations'
    : networkMetrics.alertCount > 0
      ? '/alerts?tab=alerts'
      : '/alerts';

  const value = useMemo(() => ({
    healthPayload,
    healthStats,
    alertStats,
    networkMetrics,
    loading,
    refresh,
    stationIssues,
    alertCount: networkMetrics.alertCount,
    badgeCount,
    alertsPath,
  }), [
    healthPayload,
    healthStats,
    alertStats,
    networkMetrics,
    loading,
    refresh,
    stationIssues,
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

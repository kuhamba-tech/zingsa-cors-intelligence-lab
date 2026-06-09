import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCorsCatalog, getCorsDemoAnalysis } from '../services/corsApi.js';
import { useOpsHealth } from '../context/OpsHealthContext.jsx';
import { loadCorsAlertSettings, saveCorsAlertSettings } from '../utils/corsAlertSettings.js';
import {
  buildAlertsFromStations,
  buildAlertSummary,
  buildGnssAvailability,
  buildHealthSegments,
  buildMapStations,
  buildNetworkTrendSeries,
  buildNotifications,
  buildStationTableData,
  buildSystemLogEntries,
  computeNetworkStatus,
} from '../utils/corsNetworkData.js';

export function useCorsNetworkData() {
  const { healthPayload, loading: healthLoading, refresh: refreshHealth } = useOpsHealth();
  const [analysisPayload, setAnalysisPayload] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [demoAlertScenarios, setDemoAlertScenariosState] = useState(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('zingsa-demo-alert-scenarios') === '1';
    } catch {
      return false;
    }
  });

  const setDemoAlertScenarios = useCallback((value) => {
    setDemoAlertScenariosState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem('zingsa-demo-alert-scenarios', next ? '1' : '0');
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  }, []);
  const [alertSettings, setAlertSettings] = useState(() => loadCorsAlertSettings());

  const updateAlertSettings = useCallback((patch) => {
    setAlertSettings(prev => {
      const next = {
        thresholds: { ...prev.thresholds, ...patch.thresholds },
        notifications: { ...prev.notifications, ...patch.notifications },
      };
      saveCorsAlertSettings(next);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [, analysis, catalogRes] = await Promise.all([
        refreshHealth(),
        getCorsDemoAnalysis({ station: 'ZINH', region: 'zimbabwe', source: 'tec-analysis' }),
        getCorsCatalog().catch(() => null),
      ]);
      setAnalysisPayload(analysis);
      setCatalog(catalogRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [refreshHealth]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [refresh]);

  const mapStations = useMemo(
    () => buildMapStations(healthPayload, { useDemoOverrides: demoAlertScenarios }),
    [healthPayload, demoAlertScenarios],
  );

  const stationTableData = useMemo(
    () => buildStationTableData(mapStations),
    [mapStations],
  );

  const healthSegments = useMemo(
    () => buildHealthSegments(mapStations),
    [mapStations],
  );

  const healthTotal = useMemo(
    () => healthSegments.reduce((sum, h) => sum + h.value, 0),
    [healthSegments],
  );

  const alerts = useMemo(
    () => buildAlertsFromStations(mapStations, {
      includeResolved: demoAlertScenarios,
      thresholds: alertSettings.thresholds,
      stationTableData,
    }),
    [mapStations, demoAlertScenarios, alertSettings.thresholds, stationTableData],
  );

  const activeAlerts = useMemo(
    () => alerts.filter(a => a.status === 'active'),
    [alerts],
  );

  const notifications = useMemo(
    () => buildNotifications(alerts),
    [alerts],
  );

  const networkStatus = useMemo(
    () => computeNetworkStatus(mapStations, alerts),
    [mapStations, alerts],
  );

  const gnssAvailability = useMemo(
    () => buildGnssAvailability(stationTableData),
    [stationTableData],
  );

  const alertSummary = useMemo(
    () => buildAlertSummary(alerts),
    [alerts],
  );

  const avgUptime = useMemo(() => {
    if (!stationTableData.length) return 99.2;
    const sum = stationTableData.reduce((acc, st) => acc + st.uptime, 0);
    return Math.round((sum / stationTableData.length) * 10) / 10;
  }, [stationTableData]);

  const avgSignalQuality = useMemo(() => {
    if (!stationTableData.length) return 78;
    return Math.round(stationTableData.reduce((acc, st) => acc + st.gnssQuality, 0) / stationTableData.length);
  }, [stationTableData]);

  const { signalData, accuracyData } = useMemo(
    () => buildNetworkTrendSeries(stationTableData),
    [stationTableData],
  );

  const systemLogs = useMemo(
    () => buildSystemLogEntries({ mapStations, alerts, healthPayload, catalog }),
    [mapStations, alerts, healthPayload, catalog],
  );

  return {
    loading: loading || healthLoading,
    error,
    refresh,
    catalog,
    analysisPayload,
    healthPayload,
    mapStations,
    stationTableData,
    healthSegments,
    healthTotal,
    alerts,
    activeAlerts,
    notifications,
    networkStatus,
    gnssAvailability,
    alertSummary,
    avgUptime,
    avgSignalQuality,
    signalData,
    accuracyData,
    systemLogs,
    selectedStationId,
    setSelectedStationId,
    showNotifications,
    setShowNotifications,
    demoAlertScenarios,
    setDemoAlertScenarios,
    alertSettings,
    updateAlertSettings,
  };
}

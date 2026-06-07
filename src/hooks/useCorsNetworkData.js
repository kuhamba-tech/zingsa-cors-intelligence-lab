import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCorsCatalog, getCorsDemoAnalysis, getCorsStationHealth } from '../services/corsApi.js';
import {
  buildAlertsFromStations,
  buildAlertSummary,
  buildGnssAvailability,
  buildHealthSegments,
  buildMapStations,
  buildNotifications,
  buildStationTableData,
  computeNetworkStatus,
} from '../utils/corsNetworkData.js';

function genSeries(base, amp, n = 25) {
  return Array.from({ length: n }, (_, i) =>
    Math.round((base + Math.sin(i * 0.6) * amp + (Math.random() - 0.5) * amp * 0.5) * 10) / 10,
  );
}

export function useCorsNetworkData() {
  const [healthPayload, setHealthPayload] = useState(null);
  const [analysisPayload, setAnalysisPayload] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [health, analysis, catalogRes] = await Promise.all([
        getCorsStationHealth({ country: 'Zimbabwe' }),
        getCorsDemoAnalysis({ station: 'ZINH', region: 'zimbabwe', source: 'tec-analysis' }),
        getCorsCatalog({ source: 'tec-analysis' }).catch(() => null),
      ]);
      setHealthPayload(health);
      setAnalysisPayload(analysis);
      setCatalog(catalogRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [refresh]);

  const mapStations = useMemo(
    () => buildMapStations(healthPayload),
    [healthPayload],
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
    () => buildAlertsFromStations(mapStations),
    [mapStations],
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

  const signalData = useMemo(() => genSeries(avgSignalQuality, 8), [avgSignalQuality]);
  const accuracyData = useMemo(() => genSeries(1.8, 0.4), []);

  const handleAlertAction = useCallback((alert, action) => {
    setSelectedStationId(alert.station);
    if (action === 'investigate' || action === 'monitor') {
      setShowNotifications(false);
    }
  }, []);

  return {
    loading,
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
    signalData,
    accuracyData,
    selectedStationId,
    setSelectedStationId,
    showNotifications,
    setShowNotifications,
    handleAlertAction,
  };
}

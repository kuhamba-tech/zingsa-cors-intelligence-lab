import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  APPLICATION_VIEWS,
  ANALYSIS_METHODS,
  LAB_REGIONS,
  buildLiveIPMetrics,
  generateDemoIPMetrics,
  getLiveErrorForRegion,
  getStationsForRegion,
} from '../data/corsIntelligenceLabData.js';
import { buildCorsHealthSummaries, corsHealthRisk } from '../data/corsHealthPersonas.js';
import { getCorsCatalog, getCorsDemoAnalysis, getCorsStationHealth } from '../services/corsApi.js';
import { fetchLiveKp, getDemoSpaceWeather } from '../services/spaceWeatherApi.js';
import { ZIMBABWE_CORS_STATIONS } from '../data/zimbabweCorsStations.js';
import {
  buildBridgeMonitoringMetrics,
  buildCorsServiceMetrics,
  mapStationFromHealth,
  mergeMetricsWithHealth,
} from '../utils/corsNetworkData.js';

function isValidApp(id) {
  return APPLICATION_VIEWS.some(view => view.id === id);
}

export function useNationalCorsLab(searchParams, setSearchParams) {
  const [shareCopied, setShareCopied] = useState(false);
  const [liveMode, setLiveModeState] = useState(() => {
    const liveParam = searchParams.get('live');
    if (liveParam === '1') return true;
    if (liveParam === '0') return false;
    try {
      return typeof window !== 'undefined' && localStorage.getItem('zingsa-cors-live-mode') === '1';
    } catch {
      return false;
    }
  });

  const setLiveMode = useCallback((value) => {
    setLiveModeState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      try {
        localStorage.setItem('zingsa-cors-live-mode', next ? '1' : '0');
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  }, []);
  const [regionId, setRegionId] = useState(() => {
    const region = searchParams.get('region');
    return LAB_REGIONS.some(r => r.id === region) ? region : 'zimbabwe';
  });
  const [stationId, setStationId] = useState(() => searchParams.get('station')?.toUpperCase() || 'ZINH');
  const [analysisTab, setAnalysisTab] = useState('monitoring');
  const [selectedMethod, setSelectedMethod] = useState('monitoring');
  const [analysisDate, setAnalysisDate] = useState('2024-04-01');
  const [analysisTime, setAnalysisTime] = useState('03:37');
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [mapView, setMapView] = useState('overview');
  const [spaceWeatherView, setSpaceWeatherView] = useState(() => {
    const app = searchParams.get('app');
    return isValidApp(app) ? app : 'cors-health';
  });
  const [corsAnalysisResult, setCorsAnalysisResult] = useState(null);
  const [corsPersonaView, setCorsPersonaView] = useState('overview');
  const [gnssCatalog, setGnssCatalog] = useState(null);
  const [gnssRefreshing, setGnssRefreshing] = useState(false);
  const [healthPayload, setHealthPayload] = useState(null);
  const [analysisStale, setAnalysisStale] = useState(false);
  const [lastRunInputs, setLastRunInputs] = useState({ date: '2024-04-01', time: '03:37' });

  const isCorsHealthMode = spaceWeatherView === 'cors-health';
  const isBridgeMonitoring = spaceWeatherView === 'bridge-monitoring';
  const applicationLabel = {
    ionosphere: 'Ionospheric IP',
    'space-weather': 'Space Weather',
    'cors-health': 'CORS Health',
    'bridge-monitoring': 'Bridge Monitoring',
    'tec-analysis': 'TEC Analysis',
  }[spaceWeatherView] || spaceWeatherView;
  const showCorsStationMap = (isCorsHealthMode || isBridgeMonitoring) && regionId === 'zimbabwe' && mapView !== 'settings';
  const activeAppView = useMemo(
    () => APPLICATION_VIEWS.find(view => view.id === spaceWeatherView),
    [spaceWeatherView],
  );

  const stations = useMemo(() => getStationsForRegion(regionId), [regionId]);
  const region = useMemo(() => LAB_REGIONS.find(r => r.id === regionId) || LAB_REGIONS[0], [regionId]);
  const liveError = getLiveErrorForRegion(regionId, liveMode);
  const visibleMethods = ANALYSIS_METHODS.filter(m => m.tab === analysisTab);

  useEffect(() => {
    const list = getStationsForRegion(regionId);
    if (list.length && !list.find(s => s.id === stationId)) setStationId(list[0].id);
  }, [regionId, stationId]);

  useEffect(() => {
    const urlStation = searchParams.get('station')?.toUpperCase();
    if (!urlStation || urlStation === stationId) return;
    const list = getStationsForRegion(regionId);
    if (list.some(s => s.id === urlStation)) setStationId(urlStation);
  }, [searchParams, regionId, stationId]);

  useEffect(() => {
    const urlApp = searchParams.get('app');
    if (urlApp && isValidApp(urlApp) && urlApp !== spaceWeatherView) setSpaceWeatherView(urlApp);
  }, [searchParams, spaceWeatherView]);

  useEffect(() => {
    const urlRegion = searchParams.get('region');
    if (urlRegion && LAB_REGIONS.some(r => r.id === urlRegion) && urlRegion !== regionId) setRegionId(urlRegion);
  }, [searchParams, regionId]);

  useEffect(() => {
    const liveParam = searchParams.get('live');
    if (liveParam === '1' && !liveMode) setLiveMode(true);
    else if (liveParam === '0' && liveMode) setLiveMode(false);
  }, [searchParams, liveMode, setLiveMode]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (spaceWeatherView !== 'cors-health') params.set('app', spaceWeatherView);
    if (stationId && stationId !== 'ZINH') params.set('station', stationId);
    if (regionId !== 'zimbabwe') params.set('region', regionId);
    if (liveMode) params.set('live', '1');
    else params.set('live', '0');
    const next = params.toString();
    // Use functional form so searchParams is NOT a dependency — prevents the
    // ping-pong where a Link navigation clears params and the effect re-fires.
    setSearchParams(prev => (prev.toString() === next ? prev : params), { replace: true });
  }, [spaceWeatherView, stationId, regionId, liveMode, setSearchParams]);

  const copyShareLink = useCallback(() => {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    setAnalysisStale(false);
    const station = stations.find(s => s.id === stationId);
    try {
      const healthPromise = regionId === 'zimbabwe'
        ? getCorsStationHealth({ country: 'Zimbabwe' }).catch(() => null)
        : getCorsStationHealth({ country: region.label }).catch(() => null);

      if (liveMode) {
        if (regionId === 'madagascar') throw new Error('Madagascar CORS streams unavailable');
        const [noaa, health] = await Promise.all([
          fetchLiveKp().catch(() => getDemoSpaceWeather()),
          healthPromise,
        ]);
        setHealthPayload(health);
        setMetrics(mergeMetricsWithHealth(buildLiveIPMetrics(noaa, health, regionId, station?.name || stationId), health));
      } else {
        const health = await healthPromise;
        setHealthPayload(health);
        const demo = await getCorsDemoAnalysis({
          station: stationId,
          region: regionId,
          date: analysisDate,
          time: analysisTime,
          source: 'tec-analysis',
        });
        const nextMetrics = demo.metrics || generateDemoIPMetrics(regionId, station?.name || stationId);
        if (selectedMethod === 'location') {
          nextMetrics.summary = `${nextMetrics.summary || ''} Location-based corridor analysis for ${station?.name || stationId} in ${region.label}.`.trim();
        } else {
          nextMetrics.summary = `${nextMetrics.summary || ''} Monitoring & analysis view for ${station?.name || stationId}.`.trim();
        }
        setMetrics(mergeMetricsWithHealth(nextMetrics, health));
        if (!demo.hasArchive && demo.message) setApiError(demo.message);
      }
      setLastRunInputs({ date: analysisDate, time: analysisTime });
    } catch (err) {
      setApiError(err.message);
      setMetrics(generateDemoIPMetrics(regionId, station?.name || stationId));
    } finally {
      setLoading(false);
    }
  }, [liveMode, regionId, stationId, stations, region.label, analysisDate, analysisTime, selectedMethod]);

  const refreshGnssCatalog = useCallback(async ({ refresh = false } = {}) => {
    setGnssRefreshing(true);
    try {
      const catalog = await getCorsCatalog({ refresh });
      setGnssCatalog(catalog);
      if (catalog?.dateRange?.to && !liveMode) {
        setAnalysisDate(prev => prev || catalog.dateRange.to);
      }
      return catalog;
    } catch {
      setGnssCatalog(null);
      return null;
    } finally {
      setGnssRefreshing(false);
    }
  }, [liveMode]);

  useEffect(() => {
    if (!liveMode) refreshGnssCatalog();
  }, [liveMode, refreshGnssCatalog]);

  useEffect(() => {
    if (gnssCatalog?.dateRange?.to) setAnalysisDate(gnssCatalog.dateRange.to);
  }, [gnssCatalog?.dateRange?.to]);

  useEffect(() => { runAnalysis(); }, [liveMode, regionId, stationId, runAnalysis]);

  useEffect(() => {
    if (!liveMode) return undefined;
    const id = setInterval(runAnalysis, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [liveMode, runAnalysis]);

  useEffect(() => {
    if (!liveMode && (analysisDate !== lastRunInputs.date || analysisTime !== lastRunInputs.time)) {
      setAnalysisStale(true);
    }
  }, [analysisDate, analysisTime, lastRunInputs, liveMode]);

  const handleSelectStation = useCallback((id) => {
    setStationId(id);
    setMapView('overview');
  }, []);

  const handleOpenIntegrity = useCallback((id) => {
    setStationId(id);
    setMapView('integrity');
  }, []);

  const refreshPageData = useCallback(async () => {
    if (!liveMode) await refreshGnssCatalog({ refresh: true });
    await runAnalysis();
  }, [liveMode, refreshGnssCatalog, runAnalysis]);

  const kpStatus = metrics ? { label: metrics.ipLevel, color: metrics.ipColor } : { label: 'Loading', color: '#22d3ee' };

  const corsMapStations = useMemo(() => {
    if (regionId !== 'zimbabwe') return [];
    const statusMap = Object.fromEntries((metrics?.stationStatuses || []).map(s => [s.id, s.status]));
    const healthById = Object.fromEntries((healthPayload?.stations || []).map(s => [s.station_id, s]));
    return ZIMBABWE_CORS_STATIONS.map(st => {
      const mapped = mapStationFromHealth(st, healthById);
      return { ...mapped, status: mapped.status || statusMap[st.id] || st.status };
    });
  }, [regionId, metrics, healthPayload]);

  const corsPersonaSummaries = useMemo(() => {
    const station = stations.find(s => s.id === stationId);
    const stationName = station?.name?.split(' (')[0] || stationId;
    const onlineCount = metrics?.stationStatuses?.filter(s => s.status === 'online').length ?? 0;
    const total = metrics?.stationStatuses?.length || 1;
    const healthPct = Math.round((onlineCount / total) * 100);
    return buildCorsHealthSummaries({ stationName, region: region.label, onlineCount, totalStations: total, healthPct });
  }, [stations, stationId, region.label, metrics]);

  const corsRisk = useMemo(() => corsHealthRisk(metrics), [metrics]);

  const corsHealthMetrics = useMemo(
    () => (metrics ? buildCorsServiceMetrics(healthPayload, metrics, { liveMode }) : null),
    [metrics, healthPayload, liveMode],
  );

  const bridgeMonitoringMetrics = useMemo(
    () => (metrics ? buildBridgeMonitoringMetrics(healthPayload, metrics, corsHealthMetrics) : null),
    [metrics, healthPayload, corsHealthMetrics],
  );

  const overviewPersonaSummary = useMemo(() => {
    if (!isCorsHealthMode || !metrics) return null;
    return corsPersonaSummaries.farmer;
  }, [isCorsHealthMode, metrics, corsPersonaSummaries]);

  return {
    shareCopied,
    liveMode,
    setLiveMode,
    regionId,
    setRegionId,
    stationId,
    setStationId,
    analysisTab,
    setAnalysisTab,
    selectedMethod,
    setSelectedMethod,
    analysisDate,
    setAnalysisDate,
    analysisTime,
    setAnalysisTime,
    loading,
    metrics,
    apiError,
    setApiError,
    mapView,
    setMapView,
    spaceWeatherView,
    setSpaceWeatherView,
    corsAnalysisResult,
    setCorsAnalysisResult,
    corsPersonaView,
    setCorsPersonaView,
    gnssCatalog,
    gnssRefreshing,
    healthPayload,
    analysisStale,
    isCorsHealthMode,
    isBridgeMonitoring,
    applicationLabel,
    showCorsStationMap,
    activeAppView,
    stations,
    region,
    liveError,
    visibleMethods,
    copyShareLink,
    runAnalysis,
    handleSelectStation,
    handleOpenIntegrity,
    refreshPageData,
    kpStatus,
    corsMapStations,
    corsPersonaSummaries,
    corsRisk,
    corsHealthMetrics,
    bridgeMonitoringMetrics,
    overviewPersonaSummary,
  };
}

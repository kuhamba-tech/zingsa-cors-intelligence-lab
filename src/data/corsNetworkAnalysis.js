/**
 * ZimCORS network RTK / NRTK feasibility analysis.
 *
 * Case 1 – Single Baseline RTK:  reliable range ≤ 30 km (nominal), 10–20 km (adverse ionosphere)
 *           accuracy:  H(rms) = 8 mm + 1 ppm,  V(rms) = 15 mm + 1 ppm
 *
 * Case 2 – Network RTK (NRTK):  inter-CORS spacing 50–80 km, cluster ≥ 4 stations
 *           rover max baseline from nearest CORS ≈ 40–60 km
 */

import { ZIMBABWE_CORS_STATIONS } from './zimbabweCorsStations.js';

const EARTH_R = 6371.0088;

function haversineKm(a, b) {
  const rad = d => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

// RTK accuracy formula (IEC / Leica spec)
export const rtkHaccMm  = km => 8  + km;   // 1 ppm = 1 mm/km
export const rtkVaccMm  = km => 15 + km;

const RTK_OPTIMAL_KM = 30;
const NRTK_MIN_KM    = 50;
const NRTK_MAX_KM    = 80;

// Distance buckets for the distribution chart
const BUCKETS = [
  { lo: 0,   hi: 30,  label: '≤ 30 km',   note: 'Single RTK (optimal)' },
  { lo: 30,  hi: 50,  label: '30–50 km',  note: 'Single RTK (marginal)' },
  { lo: 50,  hi: 80,  label: '50–80 km',  note: 'NRTK spacing (ideal)' },
  { lo: 80,  hi: 150, label: '80–150 km', note: 'NRTK marginal / PPK' },
  { lo: 150, hi: Infinity, label: '> 150 km', note: 'PPP / static survey' },
];

export function analyseNetworkRtk() {
  const stations = ZIMBABWE_CORS_STATIONS.map(s => ({
    id:     s.id.replace(/_$/, ''),
    name:   s.name,
    lat:    s.lat,
    lon:    s.lon,
    status: s.status,
  }));

  // Build all N(N-1)/2 pairwise distances
  const allPairs = [];
  for (let i = 0; i < stations.length; i++) {
    for (let j = i + 1; j < stations.length; j++) {
      const km = Math.round(haversineKm(stations[i], stations[j]) * 10) / 10;
      allPairs.push({ from: stations[i], to: stations[j], km });
    }
  }

  // Nearest real neighbour per station (>1 km to exclude duplicate-site placements)
  const nearestMap = new Map();
  for (const st of stations) {
    const candidates = allPairs
      .filter(p => (p.from.id === st.id || p.to.id === st.id) && p.km > 1.0)
      .map(p => ({ other: p.from.id === st.id ? p.to : p.from, km: p.km }))
      .sort((a, b) => a.km - b.km);
    if (candidates.length) nearestMap.set(st.id, candidates[0]);
  }

  // Classified pair sets (exclude co-located duplicates)
  const realPairs       = allPairs.filter(p => p.km > 1.0);
  const rtkOptimalPairs = realPairs.filter(p => p.km <= RTK_OPTIMAL_KM);
  const rtkMarginalPairs= realPairs.filter(p => p.km > RTK_OPTIMAL_KM && p.km <= 50);
  const ntrkRangePairs  = realPairs.filter(p => p.km >= NRTK_MIN_KM && p.km <= NRTK_MAX_KM);

  // Bucket counts for the distribution bar
  const buckets = BUCKETS.map(b => ({
    ...b,
    count: realPairs.filter(p => p.km > b.lo && p.km <= b.hi).length,
  }));

  // Per-station NRTK-range neighbour count (needed for cluster detection)
  const ntrkNbrCount = new Map(stations.map(st => [st.id, 0]));
  for (const p of ntrkRangePairs) {
    ntrkNbrCount.set(p.from.id, ntrkNbrCount.get(p.from.id) + 1);
    ntrkNbrCount.set(p.to.id,   ntrkNbrCount.get(p.to.id)   + 1);
  }

  // NRTK cluster candidates: stations with ≥ 3 neighbours in 50–80 km
  const clusterCandidates = stations.filter(st => (ntrkNbrCount.get(st.id) || 0) >= 3);

  // Stations with 1–2 NRTK neighbours (partial candidates)
  const partialCandidates = stations.filter(st => (ntrkNbrCount.get(st.id) || 0) >= 1 && (ntrkNbrCount.get(st.id) || 0) < 3);

  // Avg nearest-neighbour spacing (real pairs only)
  const nearestKms = [...nearestMap.values()].map(v => v.km);
  const avgNearestKm = nearestKms.length
    ? Math.round((nearestKms.reduce((s, v) => s + v, 0) / nearestKms.length) * 10) / 10
    : null;

  const minNearestKm = nearestKms.length ? Math.min(...nearestKms) : null;
  const maxNearestKm = nearestKms.length ? Math.round(Math.max(...nearestKms) * 10) / 10 : null;

  // Worst-isolated station
  const worstStation = stations.find(st => nearestMap.get(st.id)?.km === maxNearestKm) || null;

  // Accuracy at mean nearest neighbour
  const meanKm = avgNearestKm ?? 120;
  const hAccAtMean = Math.round(rtkHaccMm(meanKm));
  const vAccAtMean = Math.round(rtkVaccMm(meanKm));

  return {
    stationCount:    stations.length,
    totalRealPairs:  realPairs.length,
    rtkOptimalPairs,
    rtkMarginalPairs,
    ntrkRangePairs,
    ntrkRangePairs_sorted: [...ntrkRangePairs].sort((a, b) => a.km - b.km),
    buckets,
    avgNearestKm,
    minNearestKm,
    maxNearestKm,
    worstStation,
    clusterCandidates,
    partialCandidates,
    hAccAtMean,
    vAccAtMean,
    nearestMap,
  };
}

export { BUCKETS };

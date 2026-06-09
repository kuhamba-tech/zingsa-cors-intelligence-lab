/**
 * In-memory store for NTRIP monitoring state.
 * Persists snapshots to JSON on disk for restart recovery.
 *
 * Schema mirrors these logical tables:
 *   ntrip_casters · ntrip_mountpoints · cors_stations
 *   ntrip_stream_status · rtcm_messages · ntrip_alerts · ntrip_statistics
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir      = path.dirname(fileURLToPath(import.meta.url));
const STORE_FILE = path.join(__dir, '../../data/ntrip-store.json');
const MAX_HIST   = 500;  // max history entries per mountpoint
const MAX_ALERTS = 200;  // rolling alert buffer

function now() { return Date.now(); }

function loadFromDisk() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    }
  } catch { /* corrupt file — start fresh */ }
  return {};
}

function saveToDisk(state) {
  try {
    const dir = path.dirname(STORE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2));
  } catch { /* non-fatal */ }
}

class NtripStore {
  constructor() {
    const saved = loadFromDisk();

    /** ntrip_casters */
    this.caster = saved.caster || {
      host: null, port: null, name: 'ZINGSACORS',
      online: false, lastChecked: null, lastOnline: null,
      totalMountpoints: 0, activeMountpoints: 0,
      version: null, software: null,
    };

    /** ntrip_mountpoints: Map mountpoint → record */
    this.mountpoints = new Map(Object.entries(saved.mountpoints || {}));

    /** cors_stations: Map stationId → record */
    this.stations = new Map(Object.entries(saved.stations || {}));

    /** ntrip_stream_status: Map mountpoint → latest stats */
    this.streamStatus = new Map(Object.entries(saved.streamStatus || {}));

    /** ntrip_statistics: Map mountpoint → array of historic snapshots */
    this.statistics = new Map(Object.entries(saved.statistics || {}));

    /** ntrip_alerts: rolling array */
    this.alerts = saved.alerts || [];

    /** rtcm_messages: Map mountpoint → typeCounts */
    this.rtcmMessages = new Map(Object.entries(saved.rtcmMessages || {}));

    // Auto-persist every 30 s
    setInterval(() => this._persist(), 30_000);
  }

  // ── Caster ────────────────────────────────────────────────────

  setCasterInfo(info) {
    Object.assign(this.caster, info, { lastChecked: now() });
    if (info.online) this.caster.lastOnline = now();
  }

  getCasterStatus() {
    const mps = [...this.streamStatus.values()];
    const active = mps.filter(s => s.connected).length;
    const avgLat = mps.length
      ? Math.round(mps.filter(s => s.latencyMs).reduce((a, s) => a + (s.latencyMs || 0), 0) / mps.length)
      : null;
    return {
      ...this.caster,
      activeMountpoints: active,
      totalMountpoints:  this.mountpoints.size,
      networkHealth:     this._networkHealth(),
      averageLatencyMs:  avgLat,
    };
  }

  // ── Mountpoints ───────────────────────────────────────────────

  setMountpoints(streams) {
    this.mountpoints.clear();
    for (const s of streams) {
      this.mountpoints.set(s.mountpoint, {
        mountpoint:     s.mountpoint,
        identifier:     s.identifier,
        format:         s.format,
        formatDetails:  s.formatDetails,
        constellations: s.constellations || [],
        navSystem:      s.navSystem,
        country:        s.country,
        lat:            s.lat,
        lon:            s.lon,
        network:        s.network,
        stationId:      s.mountpoint.replace(/_.*$/, ''),
      });
    }
    this.caster.totalMountpoints = this.mountpoints.size;
  }

  getMountpoints() {
    return [...this.mountpoints.values()].map(mp => ({
      ...mp,
      status:  this.streamStatus.get(mp.mountpoint) || null,
      station: this.stations.get(mp.stationId) || null,
    }));
  }

  // ── Stations ──────────────────────────────────────────────────

  upsertStation(stationId, info) {
    const existing = this.stations.get(stationId) || {};
    this.stations.set(stationId, { ...existing, ...info, stationId, updatedAt: now() });
  }

  getStations() {
    return [...this.stations.values()].map(s => ({
      ...s,
      health: this._stationHealth(s.stationId),
    }));
  }

  // ── Stream status ─────────────────────────────────────────────

  updateStreamStatus(mountpoint, stats) {
    this.streamStatus.set(mountpoint, { ...stats, updatedAt: now() });

    // Append to history
    const hist = this.statistics.get(mountpoint) || [];
    hist.push({
      timestamp:   stats.timestamp || now(),
      latencyMs:   stats.latencyMs,
      bytesPerSec: stats.bytesPerSec,
      healthScore: stats.healthScore,
      connected:   stats.connected,
    });
    if (hist.length > MAX_HIST) hist.splice(0, hist.length - MAX_HIST);
    this.statistics.set(mountpoint, hist);

    // Update RTCM message type counts
    if (stats.typeCounts) this.rtcmMessages.set(mountpoint, stats.typeCounts);

    // Sync mountpoint constellations from live RTCM
    if (stats.constellations?.length) {
      const mp = this.mountpoints.get(mountpoint);
      if (mp) mp.constellations = stats.constellations;
    }
  }

  getStreamHealth() {
    return [...this.streamStatus.values()];
  }

  getStreamHistory(mountpoint) {
    return this.statistics.get(mountpoint) || [];
  }

  // ── Alerts ────────────────────────────────────────────────────

  addAlert(alert) {
    const rec = {
      id:          `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp:   now(),
      resolved:    false,
      ...alert,
    };
    this.alerts.unshift(rec);
    if (this.alerts.length > MAX_ALERTS) this.alerts.pop();
    return rec;
  }

  resolveAlert(id) {
    const a = this.alerts.find(x => x.id === id);
    if (a) { a.resolved = true; a.resolvedAt = now(); }
  }

  getAlerts({ activeOnly = true, limit = 50 } = {}) {
    const list = activeOnly ? this.alerts.filter(a => !a.resolved) : this.alerts;
    return list.slice(0, limit);
  }

  // ── Helpers ───────────────────────────────────────────────────

  _networkHealth() {
    const total = this.mountpoints.size;
    if (!total) return 'unknown';
    const online = [...this.streamStatus.values()].filter(s => s.connected).length;
    const pct = online / total;
    if (pct >= 0.9)  return 'healthy';
    if (pct >= 0.7)  return 'degraded';
    if (pct >= 0.4)  return 'warning';
    return 'critical';
  }

  _stationHealth(stationId) {
    const mp  = [...this.mountpoints.values()].find(m => m.stationId === stationId);
    if (!mp) return 'unknown';
    const st  = this.streamStatus.get(mp.mountpoint);
    if (!st) return 'unknown';
    if (st.healthScore >= 80) return 'healthy';
    if (st.healthScore >= 50) return 'degraded';
    return 'offline';
  }

  _persist() {
    saveToDisk({
      caster:       this.caster,
      mountpoints:  Object.fromEntries(this.mountpoints),
      stations:     Object.fromEntries(this.stations),
      streamStatus: Object.fromEntries(this.streamStatus),
      statistics:   Object.fromEntries(
        [...this.statistics.entries()].map(([k, v]) => [k, v.slice(-100)])
      ),
      alerts:       this.alerts.slice(0, 100),
      rtcmMessages: Object.fromEntries(this.rtcmMessages),
    });
  }
}

export const store = new NtripStore();

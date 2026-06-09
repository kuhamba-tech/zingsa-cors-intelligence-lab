/**
 * NTRIP Alert Engine
 * Monitors stream status snapshots and raises/clears alerts automatically.
 */

import { store } from '../store/index.mjs';

// Thresholds (seconds / ms)
const THRESHOLDS = {
  NO_DATA_WARNING_S:  10,
  OFFLINE_S:          60,
  HIGH_LATENCY_MS:  5000,
  RECONNECT_WARN_S:   30,
};

/** Alert severity levels */
export const SEVERITY = { INFO: 'info', WARNING: 'warning', CRITICAL: 'critical' };

/** Internal dedup map: key → alert id (prevents flooding) */
const activeKeys = new Map();

function raiseIfNew(key, alert) {
  if (activeKeys.has(key)) return;
  const rec = store.addAlert(alert);
  activeKeys.set(key, rec.id);
}

function clearIfExists(key) {
  const id = activeKeys.get(key);
  if (id) { store.resolveAlert(id); activeKeys.delete(key); }
}

/** Evaluate a single mountpoint's stats and raise/clear alerts */
export function evaluateMountpoint(mountpoint, stats) {
  const ageSec = stats.correctionAgeSec;
  const nowMs  = Date.now();

  // ── Offline ────────────────────────────────────────────────
  const offlineKey = `offline:${mountpoint}`;
  if (!stats.connected || (ageSec !== null && ageSec > THRESHOLDS.OFFLINE_S)) {
    raiseIfNew(offlineKey, {
      type:       'MOUNTPOINT_OFFLINE',
      severity:   SEVERITY.CRITICAL,
      mountpoint,
      message:    `Mountpoint ${mountpoint} is offline. No data for ${Math.round(ageSec ?? 0)}s.`,
    });
  } else {
    clearIfExists(offlineKey);
  }

  // ── No-data warning (not yet offline) ─────────────────────
  const noDataKey = `nodata:${mountpoint}`;
  if (stats.connected && ageSec !== null && ageSec > THRESHOLDS.NO_DATA_WARNING_S && ageSec <= THRESHOLDS.OFFLINE_S) {
    raiseIfNew(noDataKey, {
      type:       'NO_RTCM_DATA',
      severity:   SEVERITY.WARNING,
      mountpoint,
      message:    `No RTCM data received from ${mountpoint} for ${Math.round(ageSec)}s.`,
    });
  } else {
    clearIfExists(noDataKey);
  }

  // ── High latency ──────────────────────────────────────────
  const latKey = `latency:${mountpoint}`;
  if (stats.connected && stats.latencyMs !== null && stats.latencyMs > THRESHOLDS.HIGH_LATENCY_MS) {
    raiseIfNew(latKey, {
      type:       'HIGH_LATENCY',
      severity:   SEVERITY.WARNING,
      mountpoint,
      message:    `High correction latency on ${mountpoint}: ${stats.latencyMs}ms (threshold ${THRESHOLDS.HIGH_LATENCY_MS}ms).`,
    });
  } else {
    clearIfExists(latKey);
  }

  // ── Low health score ──────────────────────────────────────
  const healthKey = `health:${mountpoint}`;
  if (stats.connected && stats.healthScore < 40) {
    raiseIfNew(healthKey, {
      type:       'STREAM_DEGRADED',
      severity:   SEVERITY.WARNING,
      mountpoint,
      message:    `Stream health on ${mountpoint} is critical (score: ${stats.healthScore}/100).`,
    });
  } else {
    clearIfExists(healthKey);
  }
}

/** Called when caster connection fails */
export function alertCasterDown(host) {
  const key = `caster:down:${host}`;
  raiseIfNew(key, {
    type:     'CASTER_UNAVAILABLE',
    severity: SEVERITY.CRITICAL,
    message:  `NTRIP caster ${host} is unreachable. Check network and credentials.`,
  });
}

/** Called when caster is reachable again */
export function clearCasterDown(host) {
  clearIfExists(`caster:down:${host}`);
}

/** Called on authentication failure */
export function alertAuthFailed(host) {
  const key = `caster:auth:${host}`;
  raiseIfNew(key, {
    type:     'AUTH_FAILURE',
    severity: SEVERITY.CRITICAL,
    message:  `Authentication failed for caster ${host}. Verify NTRIP_USERNAME and NTRIP_PASSWORD.`,
  });
}

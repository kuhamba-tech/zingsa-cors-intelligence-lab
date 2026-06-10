/**
 * GET /api/ntrip/uptime?period=7d
 * Returns per-station uptime % and the UP/DOWN event log.
 * Requires Vercel KV storage (set KV_REST_API_URL + KV_REST_API_TOKEN).
 */
import { kvAvailable, kvGet } from './_kv.mjs';

const OFFICIAL = [
  { id: 'ZINH', name: 'ZINGSA HQ'      },
  { id: 'LUPA', name: 'Lupane'         },
  { id: 'MUTA', name: 'Mutare'         },
  { id: 'BULA', name: 'Bulawayo'       },
  { id: 'GWER', name: 'Gweru'          },
  { id: 'HACY', name: 'Harare Central' },
  { id: 'MASV', name: 'Masvingo'       },
  { id: 'HARA', name: 'Harare'         },
  { id: 'CENT', name: 'Centenary'      },
  { id: 'KARO', name: 'Karoi'          },
  { id: 'KWEK', name: 'Kwekwe'         },
  { id: 'GOKW', name: 'Gokwe'          },
  { id: 'GSU_', name: 'GSU'            },
  { id: 'CHIR', name: 'Chiredzi'       },
  { id: 'CHIM', name: 'Chimanimani'    },
  { id: 'CHIV', name: 'Chivhu'         },
  { id: 'KARI', name: 'Kariba'         },
  { id: 'MUTO', name: 'Mutoko'         },
  { id: 'TSHO', name: 'Tsholotsho'     },
  { id: 'VICF', name: 'Victoria Falls' },
  { id: 'GUTU', name: 'Gutu'           },
  { id: 'MATA', name: 'Mataga'         },
  { id: 'BEIT', name: 'Beitbridge'     },
  { id: 'BING', name: 'Binga'          },
];

/** Calculate uptime % for a single station over the period. */
function calcUptime(stationId, eventsInPeriod, currentStatus, periodStart, now) {
  const stEvts = eventsInPeriod
    .filter(e => e.stationId === stationId)
    .sort((a, b) => a.ts - b.ts);

  if (stEvts.length === 0) {
    // No changes logged — assume station has been in its current state the whole period
    return { uptimePct: currentStatus === 'online' ? 100 : currentStatus === 'offline' ? 0 : null, events: 0 };
  }

  let uptimeMs = 0, downtimeMs = 0;
  // Initial status: derive from the first event in the period
  // (the event records prevStatus = what it was before the change)
  let prevStatus = stEvts[0].prevStatus || (currentStatus === 'online' ? 'offline' : 'online');
  let prevTs = periodStart;

  for (const ev of stEvts) {
    const dur = ev.ts - prevTs;
    if (prevStatus === 'online')  uptimeMs   += dur;
    if (prevStatus === 'offline') downtimeMs += dur;
    prevStatus = ev.newStatus;
    prevTs     = ev.ts;
  }

  // Final segment to now
  const finalDur = now - prevTs;
  if (prevStatus === 'online')  uptimeMs   += finalDur;
  if (prevStatus === 'offline') downtimeMs += finalDur;

  const total = uptimeMs + downtimeMs;
  return {
    uptimePct:   total > 0 ? Math.round((uptimeMs / total) * 1000) / 10 : null,
    uptimeMs,
    downtimeMs,
    events:      stEvts.length,
  };
}

function fmtDuration(ms) {
  if (!ms) return '0s';
  const s = Math.round(ms / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

export default async function handler(req, res) {
  const period = req.query?.period || '7d';
  const days   = period === '30d' ? 30 : period === '24h' ? 1 : 7;
  const now    = Date.now();
  const cutoff = now - days * 24 * 3600 * 1000;

  if (!kvAvailable()) {
    return res.json({
      available: false,
      message:   'Uptime logging requires Vercel KV. Create a KV store in your Vercel dashboard → Storage, link it to this project, then redeploy.',
      stations:  [],
      events:    [],
      summary:   null,
    });
  }

  const [storedState, allEvents] = await Promise.all([
    kvGet('ntrip:state').catch(() => null),
    kvGet('ntrip:events').catch(() => null),
  ]);

  const state  = storedState || {};
  const events = (allEvents  || []).filter(e => e.ts >= cutoff);

  const stations = OFFICIAL.map(st => {
    const stId   = st.id.replace(/_$/, '');
    const stored = state[stId] || {};
    const curr   = stored.status || 'unknown';
    const uptime = calcUptime(stId, events, curr, cutoff, now);

    return {
      stationId:    stId,
      stationName:  st.name,
      currentStatus: curr,
      since:         stored.since || null,
      uptimePct:     uptime.uptimePct,
      downtimeHuman: uptime.downtimeMs ? fmtDuration(uptime.downtimeMs) : '0s',
      eventCount:    uptime.events,
    };
  });

  // Network-wide summary
  const tracked  = stations.filter(s => s.uptimePct !== null);
  const avgUptime = tracked.length
    ? Math.round(tracked.reduce((a, s) => a + s.uptimePct, 0) / tracked.length * 10) / 10
    : null;
  const worstStation = tracked.sort((a, b) => a.uptimePct - b.uptimePct)[0] || null;
  const totalEvents  = events.length;
  const downEvents   = events.filter(e => e.event === 'DOWN').length;

  res.json({
    available:   true,
    period,
    generatedAt: now,
    stations,
    events:      events.slice(0, 200), // most recent 200 events in period
    summary: {
      avgUptimePct:   avgUptime,
      totalEvents,
      downEvents,
      upEvents:       totalEvents - downEvents,
      worstStation:   worstStation ? { id: worstStation.stationId, name: worstStation.stationName, uptimePct: worstStation.uptimePct } : null,
      trackedSince:   storedState ? Math.min(...Object.values(state).map(s => s.since || now)) : null,
    },
  });
}

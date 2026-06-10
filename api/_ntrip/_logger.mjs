/**
 * CORS network uptime logger.
 * Polls the NTRIP caster, compares to the last stored state,
 * and writes UP / DOWN events to Vercel KV.
 *
 * Called as a fire-and-forget side-effect of /api/ntrip/status
 * and from the daily Vercel cron job.
 */
import { fetchCasterData } from './_live.mjs';
import { kvAvailable, kvGet, kvSet } from './_kv.mjs';

const STATE_KEY    = 'ntrip:state';    // current known status of each station
const EVENTS_KEY   = 'ntrip:events';  // UP/DOWN event log (newest first)
const LAST_LOG_KEY = 'ntrip:last_log'; // timestamp of last log run (rate limiter)

const LOG_INTERVAL_MS = 60_000; // minimum gap between log runs
const MAX_EVENTS      = 1_000;  // keep at most 1 000 events (~3–6 months for a healthy network)
const TTL_SECS        = 35 * 24 * 3600; // 35-day KV TTL

// Official 24-station Zimbabwe CORS catalogue
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

/**
 * Run one logging cycle.
 * Safe to call as fire-and-forget — all errors are caught.
 * Returns a summary object (for debugging / cron responses).
 */
export async function logSnapshot() {
  if (!kvAvailable()) return { skipped: true, reason: 'KV not configured' };

  // Rate limiting — don't log more than once per minute
  const lastLog = await kvGet(LAST_LOG_KEY).catch(() => null);
  const now     = Date.now();
  if (lastLog && now - lastLog < LOG_INTERVAL_MS) {
    return { skipped: true, reason: 'rate limited', nextInMs: LOG_INTERVAL_MS - (now - lastLog) };
  }

  // Mark log start immediately so parallel calls don't race
  await kvSet(LAST_LOG_KEY, now, Math.ceil(LOG_INTERVAL_MS / 1000) + 5);

  // Fetch caster data — if caster is unreachable we don't log (unknown state)
  let caster = null;
  try { caster = await fetchCasterData(); } catch { /* unreachable */ }

  if (!caster || caster.unauthorized) {
    return { skipped: true, reason: caster?.unauthorized ? 'auth-error' : 'caster-unreachable' };
  }

  // Build set of active station IDs from sourcetable
  const activeIds = new Set(
    (caster.streams || []).map(s => s.mountpoint.replace(/_.*/, '').replace(/_$/, ''))
  );

  // Load stored state
  const storedState = await kvGet(STATE_KEY).catch(() => null) || {};
  const newState    = { ...storedState };
  const newEvents   = [];

  for (const st of OFFICIAL) {
    const stId   = st.id.replace(/_$/, '');
    const isOnline = activeIds.has(stId);
    const curr     = isOnline ? 'online' : 'offline';
    const prev     = storedState[stId]?.status ?? 'unknown';

    // Log event only when status changes (and we knew the previous state)
    if (prev !== 'unknown' && prev !== curr) {
      newEvents.push({
        id:          `${stId}_${now}`,
        stationId:   stId,
        stationName: st.name,
        event:       curr === 'online' ? 'UP' : 'DOWN',
        ts:          now,
        prevStatus:  prev,
        newStatus:   curr,
      });
    }

    newState[stId] = {
      status: curr,
      name:   st.name,
      // Preserve "since" timestamp — only reset when status actually changed
      since: prev !== curr ? now : (storedState[stId]?.since ?? now),
    };
  }

  // Persist updated state
  await kvSet(STATE_KEY, newState, TTL_SECS);

  // Prepend new events (newest first) and cap list
  if (newEvents.length > 0) {
    const existing = await kvGet(EVENTS_KEY).catch(() => null) || [];
    const updated  = [...newEvents, ...existing].slice(0, MAX_EVENTS);
    await kvSet(EVENTS_KEY, updated, TTL_SECS);
  }

  return {
    logged:    true,
    ts:        now,
    stations:  OFFICIAL.length,
    online:    activeIds.size,
    offline:   OFFICIAL.length - activeIds.size,
    newEvents: newEvents.length,
    events:    newEvents,
  };
}

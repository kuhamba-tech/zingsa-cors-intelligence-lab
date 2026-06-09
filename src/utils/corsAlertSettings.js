export const DEFAULT_ALERT_THRESHOLDS = {
  latencyWarn: 500,
  latencyCrit: 1000,
  signalWarn: 60,
  signalCrit: 40,
  gapWarn: 60,
  gapCrit: 300,
};

export const DEFAULT_NOTIFICATION_PREFS = {
  email: true,
  sms: false,
  whatsapp: true,
  webhook: false,
};

const STORAGE_KEY = 'zingsa-cors-alert-settings';

export function loadCorsAlertSettings() {
  if (typeof window === 'undefined') {
    return {
      thresholds: { ...DEFAULT_ALERT_THRESHOLDS },
      notifications: { ...DEFAULT_NOTIFICATION_PREFS },
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        thresholds: { ...DEFAULT_ALERT_THRESHOLDS },
        notifications: { ...DEFAULT_NOTIFICATION_PREFS },
      };
    }
    const parsed = JSON.parse(raw);
    return {
      thresholds: { ...DEFAULT_ALERT_THRESHOLDS, ...parsed.thresholds },
      notifications: { ...DEFAULT_NOTIFICATION_PREFS, ...parsed.notifications },
    };
  } catch {
    return {
      thresholds: { ...DEFAULT_ALERT_THRESHOLDS },
      notifications: { ...DEFAULT_NOTIFICATION_PREFS },
    };
  }
}

export function saveCorsAlertSettings({ thresholds, notifications }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ thresholds, notifications }));
}

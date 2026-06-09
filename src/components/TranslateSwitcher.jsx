import React, { useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';

const UN_LANGUAGES = [
  { code: 'en',    flag: 'GB', name: 'English',    native: null },
  { code: 'ar',    flag: 'SA', name: 'Arabic',     native: 'العربية' },
  { code: 'zh-CN', flag: 'CN', name: 'Chinese',    native: '中文' },
  { code: 'fr',    flag: 'FR', name: 'French',     native: 'Français' },
  { code: 'ru',    flag: 'RU', name: 'Russian',    native: 'Русский' },
  { code: 'es',    flag: 'ES', name: 'Spanish',    native: 'Español' },
];

const ZW_LANGUAGES = [
  { code: 'sn', flag: 'ZW', name: 'Shona',   native: 'ChiShona' },
  { code: 'nd', flag: 'ZW', name: 'Ndebele', native: 'IsiNdebele', unavailable: true },
  { code: 'tn', flag: 'BW', name: 'Tswana',  native: 'Setswana' },
  { code: 'nb', flag: 'ZW', name: 'Nambya',  native: 'Dinambya',   unavailable: true },
];

const OTHER_LANGUAGES = [
  { code: 'ja', flag: 'JP', name: 'Japanese',   native: '日本語' },
  { code: 'pt', flag: 'PT', name: 'Portuguese', native: 'Português' },
  { code: 'de', flag: 'DE', name: 'German',     native: 'Deutsch' },
  { code: 'hi', flag: 'IN', name: 'Hindi',      native: 'हिन्दी' },
];

const LANG_META = {
  'en':    { flag: 'GB', short: 'EN' },
  'ar':    { flag: 'SA', short: 'AR' },
  'zh-CN': { flag: 'CN', short: 'ZH' },
  'fr':    { flag: 'FR', short: 'FR' },
  'ru':    { flag: 'RU', short: 'RU' },
  'es':    { flag: 'ES', short: 'ES' },
  'sn':    { flag: 'ZW', short: 'SN' },
  'tn':    { flag: 'BW', short: 'TN' },
  'ja':    { flag: 'JP', short: 'JA' },
  'pt':    { flag: 'PT', short: 'PT' },
  'de':    { flag: 'DE', short: 'DE' },
  'hi':    { flag: 'IN', short: 'HI' },
};

/* Read the active language from Google's cookie: googtrans=/en/fr */
function readCookieLang() {
  const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[a-z-]+\/([a-zA-Z-]+)/);
  return m ? m[1] : 'en';
}

/* Wipe the Google Translate cookies so the page reloads clean in English */
function clearTranslateCookies() {
  const host = window.location.hostname;
  const expires = 'expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = `googtrans=; ${expires}`;
  document.cookie = `googtrans=; ${expires} domain=${host};`;
  document.cookie = `googtrans=; ${expires} domain=.${host};`;
}

function LanguageRow({ lang, current, onSelect }) {
  const isActive = current === lang.code;
  return (
    <button
      type="button"
      className={`ts-lang-row${isActive ? ' active' : ''}${lang.unavailable ? ' unavailable' : ''}`}
      onClick={() => !lang.unavailable && onSelect(lang.code)}
      title={lang.unavailable ? 'Not yet available in Google Translate' : undefined}
    >
      <span className="ts-flag">{lang.flag}</span>
      <span className="ts-lang-names">
        <span className="ts-lang-name">{lang.name}</span>
        {lang.native && <span className="ts-lang-native">{lang.native}</span>}
        {lang.unavailable && <span className="ts-lang-unavail">Coming soon</span>}
      </span>
      {isActive && <span className="ts-check">✓</span>}
    </button>
  );
}

export default function TranslateSwitcher() {
  const [open, setOpen]       = useState(false);
  const [current, setCurrent] = useState(readCookieLang);
  const [ready, setReady]     = useState(false);
  const ref = useRef(null);

  /* Poll until Google Translate widget is ready */
  useEffect(() => {
    const id = setInterval(() => {
      if (document.querySelector('.goog-te-combo')) {
        setReady(true);
        /* Sync state with whatever language Google already loaded from the cookie */
        setCurrent(readCookieLang());
        clearInterval(id);
      }
    }, 400);
    return () => clearInterval(id);
  }, []);

  /* Close panel on outside click */
  useEffect(() => {
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function handleSelect(code) {
    setOpen(false);

    if (code === 'en') {
      /* Restore English: clear cookies then reload — the only reliable method */
      clearTranslateCookies();
      window.location.reload();
      return;
    }

    /* Switch to another language via the hidden combo */
    const select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = code;
      select.dispatchEvent(new Event('change'));
      setCurrent(code);
    } else {
      /* Widget not ready yet — set cookie manually and reload */
      clearTranslateCookies();
      document.cookie = `googtrans=/en/${code}; path=/;`;
      document.cookie = `googtrans=/en/${code}; path=/; domain=${window.location.hostname};`;
      window.location.reload();
    }
  }

  const badge = LANG_META[current] || { flag: 'GB', short: 'EN' };

  return (
    <div className="ts-root" ref={ref}>
      {/* Suppress Google's injected top bar */}
      <style>{`
        .goog-te-banner-frame,
        .skiptranslate > iframe { display: none !important; }
        body { top: 0 !important; }
      `}</style>

      <button
        type="button"
        className={`ts-trigger${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
        title="Translate this site"
      >
        <span className="ts-trigger-flag">{badge.flag}</span>
        <span className="ts-trigger-code">{badge.short}</span>
        <span className="ts-trigger-caret">{open ? '∨' : '∧'}</span>
        <Globe size={15} />
      </button>

      {open && (
        <div className="ts-panel">
          <div className="ts-panel-header">
            <span className="ts-panel-icon">⟨×⟩</span>
            <div>
              <div className="ts-panel-title">Translate this site</div>
              <div className="ts-panel-sub">
                UN languages + Shona, Ndebele, Tswana, Nambya, Japanese &amp; more
              </div>
            </div>
          </div>

          <div className="ts-section-label">UN OFFICIAL LANGUAGES</div>
          {UN_LANGUAGES.map(l => (
            <LanguageRow key={l.code} lang={l} current={current} onSelect={handleSelect} />
          ))}

          <div className="ts-section-label">ZIMBABWE LANGUAGES</div>
          {ZW_LANGUAGES.map(l => (
            <LanguageRow key={l.code} lang={l} current={current} onSelect={handleSelect} />
          ))}

          <div className="ts-section-label">OTHER</div>
          {OTHER_LANGUAGES.map(l => (
            <LanguageRow key={l.code} lang={l} current={current} onSelect={handleSelect} />
          ))}

          {!ready && (
            <div className="ts-loading">Loading translation engine…</div>
          )}
        </div>
      )}
    </div>
  );
}

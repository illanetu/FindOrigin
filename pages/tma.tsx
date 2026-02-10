import Head from 'next/head';
import Script from 'next/script';
import { useState, useCallback, useEffect } from 'react';
import type { ThemeParams } from '@/types/telegram-webapp';

interface SourceAnalysis {
  sourceUrl: string;
  sourceTitle: string;
  relevanceScore: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  explanation: string;
  matches: string[];
}

interface AnalysisResult {
  sources: SourceAnalysis[];
  summary: string;
}

const MIN_RELEVANCE = 50;
const TOP_SOURCES = 3;

export default function TmaPage() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeParams>({});

  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      setTheme(tg.themeParams || {});
      document.documentElement.style.setProperty('--tg-bg', tg.themeParams?.bg_color || '#fff');
      document.documentElement.style.setProperty('--tg-text', tg.themeParams?.text_color || '#000');
      document.documentElement.style.setProperty('--tg-hint', tg.themeParams?.hint_color || '#999');
      document.documentElement.style.setProperty('--tg-link', tg.themeParams?.link_color || '#2481cc');
      document.documentElement.style.setProperty('--tg-button', tg.themeParams?.button_color || '#2481cc');
      document.documentElement.style.setProperty('--tg-button-text', tg.themeParams?.button_text_color || '#fff');
    }
  }, [tg]);

  const submit = useCallback(async () => {
    const trimmed = text.trim();
    if (trimmed.length < 10) {
      setError('Введите не менее 10 символов.');
      return;
    }
    if (!tg?.initData) {
      setError('Откройте приложение из Telegram (меню бота → Mini App).');
      return;
    }

    setError(null);
    setResult(null);
    setStatus('Запрос отправлен...');
    setLoading(true);

    try {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${base}/api/tma/find-sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, initData: tg.initData }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка сервера');
        setStatus(null);
        setLoading(false);
        return;
      }

      setResult(data as AnalysisResult);
      setStatus(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сети');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [text, tg?.initData]);

  const relevantSources = result
    ? result.sources
        .filter((s) => s.relevanceScore >= MIN_RELEVANCE)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, TOP_SOURCES)
    : [];

  return (
    <>
      <Head>
        <title>FindOrigin — поиск источников</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content={theme.bg_color || '#ffffff'} />
      </Head>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <div className="tma">
        <header className="tma-header">
          <h1 className="tma-title">FindOrigin</h1>
          <p className="tma-subtitle">Вставьте текст или утверждение — найдём источники</p>
        </header>

        <main className="tma-main">
          <textarea
            className="tma-textarea"
            placeholder="Например: «В 2024 году инфляция в России составила 7,4%»"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            disabled={loading}
          />
          <button
            type="button"
            className="tma-button"
            onClick={submit}
            disabled={loading}
          >
            {loading ? 'Поиск...' : 'Найти источники'}
          </button>

          {status && <p className="tma-status">{status}</p>}
          {error && <p className="tma-error">{error}</p>}

          {result && (
            <section className="tma-results">
              <h2 className="tma-results-title">Результаты</h2>
              {relevantSources.length === 0 ? (
                <p className="tma-no-sources">Нет источников с релевантностью не менее 50%.</p>
              ) : (
                <ul className="tma-sources">
                  {relevantSources.map((source, idx) => (
                    <li key={source.sourceUrl + idx} className="tma-source">
                      <div className="tma-source-header">
                        <span className="tma-source-badge">
                          {source.confidenceLevel === 'high' ? '✅' : source.confidenceLevel === 'medium' ? '⚠️' : '❓'}
                          {' '}
                          {source.relevanceScore}%
                        </span>
                        <a
                          href={source.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tma-source-link"
                        >
                          {source.sourceTitle}
                        </a>
                      </div>
                      <p className="tma-source-explanation">{source.explanation}</p>
                      {source.matches?.length > 0 && (
                        <p className="tma-source-matches">
                          Совпадения: {source.matches.slice(0, 3).join(', ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {result.summary && (
                <div className="tma-summary">
                  <strong>Сводка:</strong> {result.summary}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
      <style jsx>{`
        .tma {
          min-height: 100vh;
          background: var(--tg-bg, #fff);
          color: var(--tg-text, #000);
          padding: 16px;
          padding-bottom: env(safe-area-inset-bottom, 16px);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .tma-header {
          margin-bottom: 20px;
        }
        .tma-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 4px 0;
        }
        .tma-subtitle {
          color: var(--tg-hint, #666);
          font-size: 0.9rem;
          margin: 0;
        }
        .tma-main {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .tma-textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.1);
          background: var(--tg-secondary-bg-color, #f5f5f5);
          color: var(--tg-text);
          font-size: 1rem;
          resize: vertical;
          min-height: 100px;
        }
        .tma-textarea:focus {
          outline: none;
          border-color: var(--tg-link);
        }
        .tma-button {
          background: var(--tg-button, #2481cc);
          color: var(--tg-button-text, #fff);
          border: none;
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .tma-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .tma-status {
          color: var(--tg-hint);
          font-size: 0.9rem;
          margin: 0;
        }
        .tma-error {
          color: #c00;
          font-size: 0.9rem;
          margin: 0;
        }
        .tma-results {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(0,0,0,0.08);
        }
        .tma-results-title {
          font-size: 1.1rem;
          margin: 0 0 12px 0;
        }
        .tma-no-sources {
          color: var(--tg-hint);
          margin: 0;
        }
        .tma-sources {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .tma-source {
          padding: 12px;
          border-radius: 12px;
          background: var(--tg-secondary-bg-color, #f5f5f5);
          border: 1px solid rgba(0,0,0,0.06);
        }
        .tma-source-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .tma-source-badge {
          font-size: 0.85rem;
          font-weight: 600;
        }
        .tma-source-link {
          color: var(--tg-link);
          font-weight: 600;
          text-decoration: none;
          word-break: break-all;
        }
        .tma-source-link:focus {
          text-decoration: underline;
        }
        .tma-source-explanation {
          font-size: 0.9rem;
          margin: 0 0 6px 0;
          color: var(--tg-text);
          opacity: 0.95;
        }
        .tma-source-matches {
          font-size: 0.8rem;
          color: var(--tg-hint);
          margin: 0;
        }
        .tma-summary {
          margin-top: 16px;
          padding: 12px;
          border-radius: 8px;
          background: rgba(0,0,0,0.04);
          font-size: 0.9rem;
        }
      `}</style>
    </>
  );
}

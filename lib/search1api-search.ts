/**
 * Поиск через Search1API (DuckDuckGo и др.) — бесплатный лимит, работает с серверов Vercel.
 * Ключ: https://www.search1api.com/ (100 бесплатных кредитов).
 */

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

interface Search1APIItem {
  title?: string;
  link?: string;
  snippet?: string;
  display_link?: string;
}

/**
 * Поиск через Search1API (движок DuckDuckGo). Доступен с серверов вне РФ.
 */
export async function searchWithSearch1API(
  query: string,
  apiKey: string,
  maxResults: number = 10
): Promise<{
  official: SearchResult[];
  news: SearchResult[];
  blog: SearchResult[];
  research: SearchResult[];
}> {
  const response = await fetch('https://api.search1api.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_service: 'duckduckgo',
      max_results: Math.min(maxResults, 20),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Search1API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const raw = (data.results ?? data.data ?? data) as Search1APIItem[];
  const items: SearchResult[] = (Array.isArray(raw) ? raw : []).slice(0, maxResults).map((r) => ({
    title: r.title ?? '',
    link: r.link ?? '',
    snippet: r.snippet ?? '',
    displayLink: r.display_link ?? (r.link ? new URL(r.link).hostname : ''),
  }));

  return {
    official: [],
    news: items,
    blog: [],
    research: [],
  };
}

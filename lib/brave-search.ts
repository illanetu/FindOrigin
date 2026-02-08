/**
 * Поиск через Brave Search API (без Google).
 * Бесплатный план: 2000 запросов/месяц. Ключ: https://api-dashboard.search.brave.com/
 */

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

interface BraveWebResult {
  title: string;
  url: string;
  description?: string;
}

interface BraveSearchResponse {
  web?: { results?: BraveWebResult[] };
}

/**
 * Поиск в интернете через Brave Search API.
 * Возвращает результат в том же формате, что и Google (для подстановки в пайплайн).
 */
export async function searchWithBrave(
  query: string,
  apiKey: string,
  maxResults: number = 10
): Promise<{
  official: SearchResult[];
  news: SearchResult[];
  blog: SearchResult[];
  research: SearchResult[];
}> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(Math.min(maxResults, 20)));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Brave Search API error: ${response.status} ${err}`);
  }

  const data: BraveSearchResponse = await response.json();
  const webResults = data.web?.results ?? [];
  const items: SearchResult[] = webResults.slice(0, maxResults).map((r) => ({
    title: r.title,
    link: r.url,
    snippet: r.description ?? '',
    displayLink: new URL(r.url).hostname,
  }));

  return {
    official: [],
    news: items,
    blog: [],
    research: [],
  };
}

/**
 * Поиск через Wikipedia API — без ключа, работает в РФ.
 * Ограничение: только статьи Википедии (русская и английская).
 */

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

interface WikiSearchResult {
  title: string;
  pageid: number;
  snippet?: string;
}

interface WikiSearchResponse {
  query?: { search?: WikiSearchResult[] };
}

const WIKI_API = 'https://ru.wikipedia.org/w/api.php';

/**
 * Поиск в Википедии (русская). Без API-ключа.
 */
export async function searchWithWikipedia(
  query: string,
  maxResults: number = 10
): Promise<{
  official: SearchResult[];
  news: SearchResult[];
  blog: SearchResult[];
  research: SearchResult[];
}> {
  const url = new URL(WIKI_API);
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'search');
  url.searchParams.set('srsearch', query);
  url.searchParams.set('srlimit', String(Math.min(maxResults, 20)));
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'FindOriginBot/1.0 (Telegram bot; https://github.com/illanetu/FindOrigin)' },
  });
  if (!response.ok) {
    throw new Error(`Wikipedia API error: ${response.status}`);
  }

  const data: WikiSearchResponse = await response.json();
  const items: SearchResult[] = (data.query?.search ?? []).map((r) => ({
    title: r.title,
    link: `https://ru.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`,
    snippet: r.snippet?.replace(/<[^>]+>/g, '') ?? '',
    displayLink: 'ru.wikipedia.org',
  }));

  return {
    official: [],
    news: items,
    blog: [],
    research: [],
  };
}

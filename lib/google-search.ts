/**
 * Утилиты для работы с Google Custom Search API
 */

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

export interface SearchResponse {
  items: SearchResult[];
  totalResults?: string;
}

/**
 * Поиск источников информации через Google Custom Search API
 */
export async function searchSources(
  query: string,
  apiKey: string,
  searchEngineId: string,
  maxResults: number = 3
): Promise<SearchResult[]> {
  try {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.append('key', apiKey);
    url.searchParams.append('cx', searchEngineId);
    url.searchParams.append('q', query);
    url.searchParams.append('num', maxResults.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google Search API error: ${error.error?.message || response.statusText}`);
    }

    const data: SearchResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.slice(0, maxResults);
  } catch (error) {
    console.error('Error searching sources:', error);
    throw error;
  }
}

/**
 * Поиск по запросу без site: — для бесплатного Programmable Search Engine
 * (поиск только по тем сайтам, что добавлены в настройках ПСМ, до 50 шт.)
 */
export async function searchByCategory(
  query: string,
  apiKey: string,
  searchEngineId: string,
  _category: 'official' | 'news' | 'blog' | 'research' = 'news'
): Promise<SearchResult[]> {
  return searchSources(query, apiKey, searchEngineId, 3);
}

/**
 * Поиск источников. Один запрос к API по вашему списку сайтов (до 50 в бесплатной версии).
 * Модификаторы site: не используются — учитываются только сайты из настроек поисковой системы.
 */
export async function searchMultipleCategories(
  query: string,
  apiKey: string,
  searchEngineId: string
): Promise<{
  official: SearchResult[];
  news: SearchResult[];
  blog: SearchResult[];
  research: SearchResult[];
}> {
  const items = await searchSources(query, apiKey, searchEngineId, 10);
  return {
    official: [],
    news: items,
    blog: [],
    research: [],
  };
}

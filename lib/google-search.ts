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
 * Поиск источников по категориям
 */
export async function searchByCategory(
  query: string,
  apiKey: string,
  searchEngineId: string,
  category: 'official' | 'news' | 'blog' | 'research' = 'news'
): Promise<SearchResult[]> {
  // Добавляем модификаторы запроса в зависимости от категории
  let modifiedQuery = query;
  
  switch (category) {
    case 'official':
      modifiedQuery = `${query} site:gov.ru OR site:gov OR site:org`;
      break;
    case 'news':
      modifiedQuery = `${query} site:ria.ru OR site:rbc.ru OR site:tass.ru OR site:interfax.ru OR site:lenta.ru`;
      break;
    case 'blog':
      modifiedQuery = `${query} site:habr.com OR site:vc.ru OR site:dtf.ru`;
      break;
    case 'research':
      modifiedQuery = `${query} site:scholar.google.com OR site:arxiv.org OR site:pubmed.ncbi.nlm.nih.gov`;
      break;
  }

  return searchSources(modifiedQuery, apiKey, searchEngineId, 3);
}

/**
 * Поиск источников по нескольким категориям
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
  const [official, news, blog, research] = await Promise.all([
    searchByCategory(query, apiKey, searchEngineId, 'official').catch(() => []),
    searchByCategory(query, apiKey, searchEngineId, 'news').catch(() => []),
    searchByCategory(query, apiKey, searchEngineId, 'blog').catch(() => []),
    searchByCategory(query, apiKey, searchEngineId, 'research').catch(() => []),
  ]);

  return { official, news, blog, research };
}

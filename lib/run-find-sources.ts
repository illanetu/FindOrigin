/**
 * Общая логика поиска источников: используется ботом (webhook) и Mini App API.
 */

import { getTelegramPostContent } from '@/lib/telegram';
import { searchMultipleCategories } from '@/lib/google-search';
import { searchWithBrave } from '@/lib/brave-search';
import { searchWithWikipedia } from '@/lib/wikipedia-search';
import { searchWithSearch1API } from '@/lib/search1api-search';
import {
  generateSearchQuery,
  compareWithSources,
  type AnalysisResult,
} from '@/lib/openai';

export type RunFindSourcesOptions = {
  /** Токен бота (для извлечения контента по ссылкам t.me) */
  botToken?: string;
  /** Опциональный callback для статусов (бот шлёт сообщения в чат) */
  sendStatus?: (message: string) => Promise<void>;
};

const GOOGLE_SEARCH_DISABLED = true;

/**
 * Выполняет поиск источников по тексту и возвращает результат анализа.
 * Использует переменные окружения: BOT_TOKEN, SEARCH1API_KEY, GOOGLE_*, BRAVE_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY.
 */
export async function runFindSources(
  text: string,
  options: RunFindSourcesOptions = {}
): Promise<AnalysisResult> {
  const { botToken = process.env.BOT_TOKEN, sendStatus } = options;

  const search1ApiKey = process.env.SEARCH1API_KEY;
  const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  const braveApiKey = process.env.BRAVE_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;

  const useSearch1API = !!search1ApiKey;
  const useGoogleSearch =
    !!googleApiKey && !!googleSearchEngineId && !GOOGLE_SEARCH_DISABLED;
  const useBraveSearch = !!braveApiKey;
  const aiApiKey = openrouterApiKey || openaiApiKey;
  const useOpenRouter = !!openrouterApiKey;

  if (!aiApiKey) {
    throw new Error('AI API не настроен (OPENAI_API_KEY или OPENROUTER_API_KEY).');
  }

  let inputText = text.trim();

  const telegramLinkPattern = /https?:\/\/t\.me\/[^\s]+/;
  const telegramLink = inputText.match(telegramLinkPattern)?.[0];
  if (telegramLink && botToken) {
    const postContent = await getTelegramPostContent(telegramLink, botToken);
    if (postContent) inputText = postContent;
  }

  if (!inputText || inputText.length < 10) {
    throw new Error('Текст слишком короткий для анализа (нужно не менее 10 символов).');
  }

  const status = async (msg: string) => {
    if (sendStatus) await sendStatus(msg);
  };

  await status('🤖 AI формирует поисковый запрос...');
  const searchQuery = await generateSearchQuery(inputText, aiApiKey, useOpenRouter);

  await status('🔍 Ищу источники в Википедии...');
  const wikiResults = await searchWithWikipedia(searchQuery, 5);
  let allSources = [
    ...wikiResults.official,
    ...wikiResults.news,
    ...wikiResults.blog,
    ...wikiResults.research,
  ];

  if (useSearch1API || useGoogleSearch || useBraveSearch) {
    if (useSearch1API) {
      await status('🔍 Ищу также в DuckDuckGo...');
      const other = await searchWithSearch1API(searchQuery, search1ApiKey!, 5);
      allSources = [...allSources, ...other.news, ...other.blog, ...other.research];
    } else if (useGoogleSearch) {
      await status('🔍 Ищу также в Google...');
      const other = await searchMultipleCategories(
        searchQuery,
        googleApiKey!,
        googleSearchEngineId!
      );
      allSources = [...allSources, ...other.news, ...other.blog, ...other.research];
    } else {
      await status('🔍 Ищу также в Brave Search...');
      const other = await searchWithBrave(searchQuery, braveApiKey!, 5);
      allSources = [...allSources, ...other.news, ...other.blog, ...other.research];
    }
  }

  if (allSources.length === 0) {
    throw new Error('Источники не найдены. Попробуйте переформулировать запрос.');
  }

  const sourcesToAnalyze = allSources.slice(0, 5);
  await status('🤖 Анализирую найденные источники с помощью AI...');

  const analysis = await compareWithSources(
    inputText,
    sourcesToAnalyze,
    aiApiKey,
    useOpenRouter
  );
  return analysis;
}

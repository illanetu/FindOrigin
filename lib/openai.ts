/**
 * Утилиты для работы с OpenAI API
 */

import OpenAI from 'openai';

export interface SourceAnalysis {
  sourceUrl: string;
  sourceTitle: string;
  relevanceScore: number; // 0-100
  confidenceLevel: 'high' | 'medium' | 'low';
  explanation: string;
  matches: string[]; // Ключевые совпадения
}

export interface AnalysisResult {
  sources: SourceAnalysis[];
  summary: string;
}

/**
 * Инициализация клиента OpenAI или OpenRouter
 */
export function createOpenAIClient(apiKey: string, useOpenRouter: boolean = false): OpenAI {
  const config: any = {
    apiKey: apiKey,
  };

  // Если указан OPENAI_BASE_URL, используем его (для OpenRouter или других провайдеров)
  const baseURL = process.env.OPENAI_BASE_URL;
  if (baseURL) {
    config.baseURL = baseURL;
    // Если используется OpenRouter, добавляем необходимые заголовки
    if (baseURL.includes('openrouter.ai')) {
      const referer = process.env.OPENROUTER_HTTP_REFERER || 'https://github.com/illanetu/FindOrigin';
      config.defaultHeaders = {
        'HTTP-Referer': referer,
        'X-Title': 'FindOrigin Bot',
      };
    }
  } else if (useOpenRouter) {
    // Если используется OpenRouter без OPENAI_BASE_URL, используем стандартный URL
    config.baseURL = 'https://openrouter.ai/api/v1';
    const referer = process.env.OPENROUTER_HTTP_REFERER || 'https://github.com/illanetu/FindOrigin';
    config.defaultHeaders = {
      'HTTP-Referer': referer,
      'X-Title': 'FindOrigin Bot',
    };
  }

  return new OpenAI(config);
}

/**
 * Сравнение смысла исходного текста с найденными источниками
 */
export async function compareWithSources(
  originalText: string,
  sources: Array<{ title: string; link: string; snippet: string }>,
  apiKey: string,
  useOpenRouter: boolean = false
): Promise<AnalysisResult> {
  const client = createOpenAIClient(apiKey, useOpenRouter);

  // Формируем промпт для анализа
  const sourcesText = sources
    .map((source, idx) => {
      return `Источник ${idx + 1}:
Заголовок: ${source.title}
URL: ${source.link}
Сниппет: ${source.snippet}`;
    })
    .join('\n\n');

  const prompt = `Ты эксперт по проверке фактов и поиску источников информации. 

Проанализируй исходный текст и найденные источники. Для каждого источника определи:
1. Релевантность (0-100) - насколько источник относится к утверждениям в тексте
2. Уровень уверенности (high/medium/low) - насколько можно быть уверенным, что источник подтверждает или опровергает информацию
3. Краткое объяснение (1-2 предложения) - почему этот источник релевантен или нет
4. Ключевые совпадения - конкретные факты или утверждения, которые совпадают

Исходный текст:
${originalText}

Найденные источники:
${sourcesText}

Верни результат в формате JSON:
{
  "sources": [
    {
      "sourceUrl": "URL источника",
      "sourceTitle": "Заголовок источника",
      "relevanceScore": число от 0 до 100,
      "confidenceLevel": "high" | "medium" | "low",
      "explanation": "Краткое объяснение",
      "matches": ["совпадение 1", "совпадение 2"]
    }
  ],
  "summary": "Общая сводка по всем источникам (2-3 предложения)"
}

Важно: Анализируй семантическое сходство, а не буквальное совпадение текста.`;

  try {
    // OpenRouter использует формат "openai/gpt-4o-mini", но также поддерживает "gpt-4o-mini"
    const model = useOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini';
    
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Ты эксперт по проверке фактов. Анализируй источники информации и определяй их релевантность к исходному тексту.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('Пустой ответ от OpenAI');
    }

    const result: AnalysisResult = JSON.parse(responseText);
    
    // Валидация и нормализация результата
    if (!result.sources || !Array.isArray(result.sources)) {
      throw new Error('Неверный формат ответа от OpenAI');
    }

    // Убеждаемся, что все источники обработаны
    result.sources = result.sources.map((source, idx) => ({
      sourceUrl: source.sourceUrl || sources[idx]?.link || '',
      sourceTitle: source.sourceTitle || sources[idx]?.title || '',
      relevanceScore: Math.max(0, Math.min(100, source.relevanceScore || 0)),
      confidenceLevel: source.confidenceLevel || 'low',
      explanation: source.explanation || 'Анализ не выполнен',
      matches: source.matches || [],
    }));

    return result;
  } catch (error) {
    console.error('Error comparing with sources:', error);
    throw error;
  }
}

/**
 * Формирование финального ответа для пользователя
 */
export function formatAnalysisResponse(analysis: AnalysisResult): string {
  let response = '🔍 Результаты поиска источников:\n\n';

  if (analysis.sources.length === 0) {
    return '❌ Источники не найдены.';
  }

  // Сортируем источники по релевантности
  const sortedSources = [...analysis.sources].sort(
    (a, b) => b.relevanceScore - a.relevanceScore
  );

  // Показываем топ-3 источника
  const topSources = sortedSources.slice(0, 3);

  topSources.forEach((source, idx) => {
    const emoji = source.confidenceLevel === 'high' ? '✅' : source.confidenceLevel === 'medium' ? '⚠️' : '❓';
    const scoreEmoji = source.relevanceScore >= 70 ? '🟢' : source.relevanceScore >= 40 ? '🟡' : '🔴';
    
    response += `${idx + 1}. ${emoji} ${source.sourceTitle}\n`;
    response += `${scoreEmoji} Релевантность: ${source.relevanceScore}%\n`;
    response += `🔗 ${source.sourceUrl}\n`;
    response += `📝 ${source.explanation}\n`;
    
    if (source.matches.length > 0) {
      response += `✓ Совпадения: ${source.matches.slice(0, 3).join(', ')}\n`;
    }
    
    response += '\n';
  });

  if (analysis.summary) {
    response += `\n📊 Сводка:\n${analysis.summary}\n`;
  }

  return response;
}

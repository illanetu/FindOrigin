/**
 * Утилиты для извлечения и обработки текста
 */

export interface ExtractedData {
  keyStatements: string[];
  dates: string[];
  numbers: number[];
  names: string[];
  links: string[];
}

/**
 * Извлечение ключевых утверждений из текста
 */
export function extractKeyStatements(text: string): string[] {
  // Простая реализация - разбиение на предложения
  // В будущем можно улучшить с помощью NLP
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20); // Фильтруем слишком короткие предложения
  
  return sentences.slice(0, 5); // Возвращаем до 5 ключевых утверждений
}

/**
 * Извлечение дат из текста
 */
export function extractDates(text: string): string[] {
  const datePatterns = [
    // Формат DD.MM.YYYY или DD/MM/YYYY
    /\d{1,2}[.\/]\d{1,2}[.\/]\d{4}/g,
    // Формат YYYY-MM-DD
    /\d{4}-\d{2}-\d{2}/g,
    // Формат "DD месяц YYYY" (русский)
    /\d{1,2}\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{4}/gi,
    // Формат "месяц DD, YYYY" (английский)
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
  ];

  const dates: string[] = [];
  
  datePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  });

  return [...new Set(dates)]; // Убираем дубликаты
}

/**
 * Извлечение чисел из текста
 */
export function extractNumbers(text: string): number[] {
  // Извлекаем целые числа и десятичные
  const numberPattern = /\d+[.,]?\d*/g;
  const matches = text.match(numberPattern);
  
  if (!matches) {
    return [];
  }

  return matches
    .map(m => parseFloat(m.replace(',', '.')))
    .filter(n => !isNaN(n));
}

/**
 * Извлечение имен собственных (упрощенная версия)
 */
export function extractNames(text: string): string[] {
  // Простая реализация - поиск слов с заглавной буквы
  // В будущем можно улучшить с помощью NLP библиотек
  const words = text.split(/\s+/);
  const names: string[] = [];
  
  // Паттерн для имен (слово с заглавной буквы, не в начале предложения)
  // Это упрощенная версия, в реальности нужен более сложный анализ
  const namePattern = /^[А-ЯЁA-Z][а-яёa-z]+$/;
  
  words.forEach((word, index) => {
    const cleanWord = word.replace(/[.,!?;:()\[\]{}'"]/g, '');
    if (namePattern.test(cleanWord) && cleanWord.length > 2) {
      // Исключаем некоторые общие слова
      const commonWords = ['Россия', 'России', 'Москва', 'Москве', 'The', 'This', 'That'];
      if (!commonWords.includes(cleanWord)) {
        names.push(cleanWord);
      }
    }
  });

  return [...new Set(names)].slice(0, 10); // Убираем дубликаты, берем до 10
}

/**
 * Извлечение ссылок из текста
 */
export function extractLinks(text: string): string[] {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlPattern);
  
  return matches || [];
}

/**
 * Основная функция извлечения данных из текста
 */
export function extractData(text: string): ExtractedData {
  return {
    keyStatements: extractKeyStatements(text),
    dates: extractDates(text),
    numbers: extractNumbers(text),
    names: extractNames(text),
    links: extractLinks(text),
  };
}

/**
 * Нормализация дат в единый формат
 */
export function normalizeDate(dateString: string): string {
  try {
    // Попытка распарсить дату
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]; // Формат YYYY-MM-DD
    }
  } catch (error) {
    // Если не удалось распарсить, возвращаем исходную строку
  }
  return dateString;
}

/**
 * Очистка и подготовка текста
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Убираем множественные пробелы
    .trim();
}

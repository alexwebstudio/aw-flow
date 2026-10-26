/* Ссылки на Telegram с готовым текстом сообщения.
   Telegram поддерживает параметр text и для ссылок по нику, и для ссылок
   по номеру (t.me/+<номер>?text=…): текст подставляется в поле ввода чата,
   пользователю остаётся нажать «Отправить». */
import settings from '@/content/settings.json';

export const ORDER_TEXT = 'Здравствуйте! Хочу заказать эффект для своего сайта с AW-Flow.';
export const CUSTOM_TEXT = 'Здравствуйте! Хочу заказать эффект, которого нет в каталоге AW-Flow. Идея такая: ';
export const effectOrderText = name => `Здравствуйте! Хочу заказать эффект «${name}» из AW-Flow для своего сайта.`;

/* пробелы кодируем как %20, а не «+», чтобы мессенджер не показал плюсы */
export function telegramLink(text) {
  const base = settings.contacts.telegram;
  if (!text) return base;
  return `${base}${base.includes('?') ? '&' : '?'}text=${encodeURIComponent(text)}`;
}

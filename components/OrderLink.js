'use client';
/* Кнопка заказа в Telegram с готовым сообщением.
   Текст передаётся в ссылке (?text=), но не все приложения Telegram подставляют его
   для ссылок по номеру телефона. Поэтому по клику текст ещё и копируется в буфер —
   если чат откроется пустым, сообщение можно просто вставить. */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { telegramLink } from '@/lib/contact';
import { copyText } from '@/lib/client';

export default function OrderLink({ text, className = 'btn btn-primary', children }) {
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const onClick = async () => {
    if (await copyText(text)) setToast(true);
  };

  return (
    <>
      <a className={className} href={telegramLink(text)} target="_blank" rel="noopener noreferrer" onClick={onClick}>
        {children}
      </a>
      {/* через портал: у шапки и блоков появления есть transform, fixed внутри них «поедет» */}
      {toast && createPortal(
        <div className="order-toast" role="status">
          <b>Текст сообщения скопирован</b>
          <span>Если в чате он не появился сам — вставьте его: ⌘V или Ctrl+V, на телефоне — долгое нажатие.</span>
          <button type="button" onClick={() => setToast(false)} aria-label="Закрыть подсказку">×</button>
        </div>,
        document.body,
      )}
    </>
  );
}

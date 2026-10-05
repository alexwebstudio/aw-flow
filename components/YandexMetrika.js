'use client';
/* Яндекс.Метрика. Счётчик инициализируется один раз (next/script,
   afterInteractive), а при клиентских переходах по страницам вручную
   отправляем hit — иначе в SPA засчитывается только первая загрузка. */
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const COUNTER_ID = 113426490;

export default function YandexMetrika() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; } // первую загрузку считает init
    if (typeof window.ym === 'function') window.ym(COUNTER_ID, 'hit', window.location.href);
  }, [pathname]);

  return (
    <Script id="yandex-metrika" strategy="afterInteractive">
      {`(function(m,e,t,r,i,k,a){
          m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
        })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${COUNTER_ID}', 'ym');
        ym(${COUNTER_ID}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", accurateTrackBounce:true, trackLinks:true});`}
    </Script>
  );
}

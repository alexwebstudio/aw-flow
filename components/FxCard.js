/* AW-Flow: карточка эффекта в каталоге — живое превью сверху (настоящий код
   эффекта в iframe), ниже название, категория моно-тегом, триггер и переход. */
import { useMemo } from 'react';
import Link from 'next/link';
import FxFrame from './FxFrame';
import { IconArrow } from './Icons';
import { fxDefaults, fxIndex, fxTag, fxTrigger, triggerLabel } from '@/lib/aw-flow';

export default function FxCard({ fx }) {
  const values = useMemo(() => fxDefaults(fx), [fx]);
  const href = `/effects/${fx.slug}`;
  return (
    <article className="fx-card">
      <div className="fx-card-stage">
        <FxFrame fx={fx} values={values} mode="card" href={href} />
      </div>
      <div className="fx-card-body">
        <div className="fx-card-top">
          <span className="fx-tag">{fxTag(fx)}</span>
          <span className="fx-num">{fxIndex(fx.slug)}</span>
        </div>
        <h3 className="fx-card-title">
          <Link href={href} className="fx-card-link"><span className="fx-card-pre">AW-Flow —</span> {fx.name}</Link>
        </h3>
        <p className="fx-card-desc">{fx.short}</p>
        <div className="fx-card-foot">
          <span className="fx-meta"><span>{triggerLabel(fxTrigger(fx))}</span>{fx.lib === 'gsap' && <span>GSAP</span>}</span>
          <span className="fx-more" aria-hidden="true">Настроить <IconArrow /></span>
        </div>
      </div>
    </article>
  );
}

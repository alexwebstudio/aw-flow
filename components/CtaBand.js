import Heading from './Heading';
import Reveal from './Reveal';
import OrderLink from './OrderLink';
import { IconArrowUp } from './Icons';
import { ORDER_TEXT } from '@/lib/contact';

/* Призыв в конце страниц: Telegram студии с готовым сообщением (text). */
export default function CtaBand({ title, text, message = ORDER_TEXT, label = 'Написать в Telegram' }) {
  return (
    <Reveal className="cta-band">
      <div>
        <Heading className="h2" text={title} />
        <p>{text}</p>
      </div>
      <OrderLink text={message}>{label} <IconArrowUp /></OrderLink>
    </Reveal>
  );
}

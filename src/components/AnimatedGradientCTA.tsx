import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQS = [
  { q: 'What is Walrus Protocol?', a: 'Walrus is a decentralized blob storage network. FORMRUS stores every form schema and response as a blob, addressable forever by its blob ID.' },
  { q: 'How does Seal encryption work?', a: 'When you toggle "Private", responses are sealed client-side and only readable by the form owner. The Walrus blob holds ciphertext.' },
  { q: 'Do I need a wallet?', a: 'Not for this preview. We mock blob IDs locally so you can try the full builder, viewer, and dashboard flow without a wallet.' },
  { q: 'Can I export my responses?', a: 'Yes — the admin dashboard exports all (or selected) responses as CSV with one click.' },
  { q: 'Is the form schema also on Walrus?', a: 'Yes. Both the form schema and every individual response are independent blobs. Share by blob ID.' },
];

export function AnimatedGradientCTA() {
  const [active, setActive] = useState(0);
  return (
    <section className="mx-auto w-full max-w-[1100px] px-5 py-20">
      <div className="grid grid-cols-1 items-stretch gap-[60px] md:grid-cols-[1.6fr_1fr] md:gap-[30px]">
        <div
          className="c5-animated-gradient flex flex-col items-center justify-center rounded-[24px] px-10 py-20 text-center text-white"
          style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
        >
          <h2 className="mb-[15px] font-normal leading-[1.1]" style={{ fontSize: '3.5rem', letterSpacing: '-0.03em', fontFamily: "'Outfit', sans-serif" }}>
            Ready to ship<br />a form on Walrus?
          </h2>
          <p className="mb-[30px] text-[0.95rem] font-normal opacity-90">Build, publish and analyze — all decentralized.</p>
          <Link
            to="/builder"
            className="cursor-pointer border-none bg-foreground text-[0.95rem] font-semibold text-background transition-all duration-200 hover:-translate-y-0.5"
            style={{ padding: '14px 32px', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}
          >
            Start Building
          </Link>
        </div>

        <div className="flex flex-col justify-center gap-3">
          {FAQS.map((f, i) => {
            const isActive = i === active;
            return (
              <div
                key={i}
                onClick={() => setActive(isActive ? -1 : i)}
                className="cursor-pointer rounded-[10px] border bg-white px-5 py-[18px] transition-all duration-200"
                style={{
                  borderColor: isActive ? '#eaeaea' : '#f0f0f0',
                  boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.04)' : '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                <div className="flex items-center justify-between text-[0.9rem] font-medium text-foreground">
                  <span>{f.q}</span>
                  {isActive ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                {isActive && <div className="mt-3 text-[0.9rem] leading-[1.6] text-muted-foreground">{f.a}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

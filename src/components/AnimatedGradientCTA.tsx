import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const FAQS = [
  {
    q: "What does FORMRUS store on Walrus?",
    a: "FORMRUS can publish the form schema, every response, screenshots, videos, and uploaded files as Walrus blobs when publisher and aggregator endpoints are configured.",
  },
  {
    q: "Does a respondent need an account?",
    a: "No. Anyone with the shareable form link can submit feedback. The admin receives a response blob ID for review and export.",
  },
  {
    q: "Can teams review and prioritize submissions?",
    a: "Yes. The admin dashboard supports search, sorting, starred items, reviewed state, bulk actions, response blob import, and CSV export.",
  },
  {
    q: "How does private mode fit Seal?",
    a: "Private mode marks sensitive forms for the Seal encryption path while keeping the storage flow visible and demo-ready.",
  },
  {
    q: "What should be shown in the hackathon demo?",
    a: "Create a form, share it, submit one real response with media, show the Walrus blob ID, review it in admin, and export CSV.",
  },
];

export function AnimatedGradientCTA() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const [buttonShadow, setButtonShadow] = useState("0 10px 20px rgba(0,0,0,0.3)");

  const toggle = (index: number) => {
    setActiveIndex((current) => (current === index ? null : index));
  };

  return (
    <main
      id="faq"
      className="mx-auto w-full max-w-[1100px] px-5 py-20 max-[900px]:py-[60px]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="grid grid-cols-[1.6fr_1fr] items-stretch gap-[30px] max-[900px]:grid-cols-1 max-[900px]:gap-[60px]">
        <div
          className="c5-animated-gradient flex flex-col items-center justify-center rounded-[24px] px-10 py-20 text-center text-white"
          style={{ boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)" }}
        >
          <h2
            className="mb-[15px] font-normal leading-[1.1]"
            style={{ fontSize: "3.5rem", letterSpacing: "-0.03em" }}
          >
            Ready to Collect
            <br />
            Feedback on Walrus?
          </h2>
          <p className="mb-[30px] text-[0.9rem] font-normal opacity-85">
            Build forms, store blobs, review faster.
          </p>
          <Link
            to="/builder"
            className="cursor-pointer border-none bg-neutral-900 text-[0.95rem] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
            style={{ padding: "14px 32px", borderRadius: "12px", boxShadow: buttonShadow }}
            onMouseEnter={() => setButtonShadow("0 14px 30px rgba(0,0,0,0.4)")}
            onMouseLeave={() => setButtonShadow("0 10px 20px rgba(0,0,0,0.3)")}
          >
            Start Building Today
          </Link>
        </div>

        <div className="flex flex-col justify-center gap-3">
          {FAQS.map((faq, index) => {
            const isActive = activeIndex === index;
            return (
              <div
                key={faq.q}
                onClick={() => toggle(index)}
                className="cursor-pointer rounded-[10px] border bg-white px-5 py-[18px] transition-all duration-200 hover:border-[#eaeaea]"
                style={{
                  borderColor: isActive ? "#eaeaea" : "#f0f0f0",
                  boxShadow: isActive
                    ? "0 4px 12px rgba(0,0,0,0.04)"
                    : "0 2px 8px rgba(0,0,0,0.02)",
                }}
              >
                <div className="flex items-center justify-between text-[0.9rem] font-normal text-neutral-900">
                  <span>{faq.q}</span>
                  {isActive ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                {isActive && (
                  <div className="mt-3 text-[0.9rem] leading-[1.6] text-[#666]">{faq.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

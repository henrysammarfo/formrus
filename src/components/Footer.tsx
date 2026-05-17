import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

const socials = [
  {
    label: "Discord",
    path: "M20.317 4.369A19.791 19.791 0 0 0 16.558 3c-.163.29-.35.68-.48.99a18.27 18.27 0 0 0-4.156 0c-.13-.31-.322-.7-.487-.99a19.736 19.736 0 0 0-3.761 1.37C5.292 7.884 4.647 11.31 4.969 14.69a19.95 19.95 0 0 0 4.606 2.33c.371-.5.702-1.03.986-1.59-.542-.204-1.06-.456-1.55-.751.13-.095.257-.194.38-.294 2.99 1.38 6.228 1.38 9.183 0 .124.1.251.199.38.294-.492.296-1.012.548-1.554.753.284.558.613 1.088.984 1.588a19.91 19.91 0 0 0 4.61-2.33c.378-3.917-.647-7.311-2.677-10.321ZM9.68 12.606c-.897 0-1.632-.826-1.632-1.842 0-1.017.72-1.843 1.632-1.843.913 0 1.648.834 1.632 1.843 0 1.016-.72 1.842-1.632 1.842Zm4.65 0c-.897 0-1.632-.826-1.632-1.842 0-1.017.72-1.843 1.632-1.843.913 0 1.648.834 1.632 1.843 0 1.016-.72 1.842-1.632 1.842Z",
  },
  {
    label: "X",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z",
  },
  {
    label: "LinkedIn",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.85-3.037-1.851 0-2.134 1.445-2.134 2.939v5.667H9.355V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.602 0 4.267 2.371 4.267 5.455v6.286h-.008ZM5.337 7.433a2.063 2.063 0 1 1 0-4.126 2.063 2.063 0 0 1 0 4.126ZM7.114 20.452H3.558V9h3.556v11.452Z",
  },
  {
    label: "GitHub",
    path: "M12 .5C5.65.5.5 5.65.5 12c0 5.086 3.292 9.392 7.86 10.916.575.106.785-.25.785-.555 0-.274-.01-1.183-.016-2.146-3.197.695-3.872-1.356-3.872-1.356-.523-1.329-1.277-1.683-1.277-1.683-1.044-.714.08-.7.08-.7 1.154.081 1.762 1.186 1.762 1.186 1.027 1.759 2.694 1.251 3.35.957.104-.744.402-1.252.731-1.54-2.552-.29-5.236-1.276-5.236-5.68 0-1.255.449-2.282 1.185-3.086-.119-.291-.514-1.461.113-3.045 0 0 .966-.309 3.166 1.179A10.987 10.987 0 0 1 12 6.06c.978.004 1.963.132 2.883.387 2.198-1.488 3.162-1.179 3.162-1.179.629 1.584.234 2.754.115 3.045.738.804 1.184 1.831 1.184 3.086 0 4.415-2.689 5.386-5.249 5.67.413.356.78 1.058.78 2.133 0 1.54-.014 2.78-.014 3.159 0 .308.207.667.792.554A11.505 11.505 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z",
  },
];

function fitWatermark() {
  const svg = document.getElementById("watermarkSvg");
  const text = document.getElementById("watermarkText") as SVGTextElement | null;
  if (!svg || !text) return;
  try {
    const bbox = text.getBBox();
    svg.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
  } catch {
    // getBBox can fail before web fonts finish loading; the resize/load hooks retry it.
  }
}

export function Footer() {
  useEffect(() => {
    if (document.fonts?.ready) void document.fonts.ready.then(fitWatermark);
    else window.addEventListener("load", fitWatermark);

    window.addEventListener("resize", fitWatermark);
    return () => {
      window.removeEventListener("load", fitWatermark);
      window.removeEventListener("resize", fitWatermark);
    };
  }, []);

  return (
    <section className="footer-section">
      <div className="footer-wrapper">
        <div className="footer-left">
          <video className="footer-left-video" autoPlay muted loop playsInline preload="auto">
            <source
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260503_104800_bc43ae09-f494-43e3-97d7-2f8c1692cfd7.mp4"
              type="video/mp4"
            />
          </video>

          <div className="footer-logo">
            <img className="footer-logo-mark" src="/formrus-mark.svg" alt="" />
            <span className="footer-logo-name">FORMRUS</span>
          </div>

          <div className="footer-tagline-container">
            <p className="footer-tagline">
              Forms that live on Walrus,
              <br />
              <span>built for builder feedback.</span>
            </p>
          </div>

          <div className="footer-social-row">
            <span className="footer-social-label">Stay in touch!</span>
            <div className="footer-social-icons">
              {socials.map((social) => (
                <a key={social.label} href="#" aria-label={social.label} className="social-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="footer-right">
          <div className="footer-lucky-graphic" aria-hidden="true">
            <div className="lucky-cube">
              <span className="lucky-cube-mark">F</span>
            </div>
            <div className="lucky-text-row">
              <svg className="lucky-arrow" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 20 C 6 14, 10 9, 18 5" />
                <path d="M18 5 L 12 5" />
                <path d="M18 5 L 18 11" />
              </svg>
              <span className="lucky-text">Walrus-ready?</span>
            </div>
          </div>

          <div className="footer-right-top">
            <div className="footer-nav-cols">
              <div className="footer-col">
                <h4 className="footer-col-title">Navigation</h4>
                <Link to="/">How it works</Link>
                <Link to="/builder">Features</Link>
                <Link to="/my-forms">My Forms</Link>
                <Link to="/docs">Docs</Link>
                <a href="#faq">FAQ</a>
              </div>
              <div className="footer-col">
                <h4 className="footer-col-title">Company</h4>
                <a href="#">Hackathon</a>
                <a href="#">About</a>
                <a href="#">Terms and Condition</a>
                <a href="#">Privacy Policy</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-copyright">(c) 2026 FORMRUS. All rights reserved.</p>
            <div className="footer-cta-mini">
              <h4>
                Feedback moves fast.
                <br />
                <strong>Keep it reviewable on Walrus.</strong>
              </h4>
              <div className="footer-subscribe-row">
                <input type="email" placeholder="Enter email address" />
                <button type="button">Subscribe</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-watermark" aria-hidden="true">
        <svg
          id="watermarkSvg"
          viewBox="62 95 876 175"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          <text id="watermarkText" x="500" y="240" textAnchor="middle" fontSize="320">
            FORMRUS
          </text>
        </svg>
      </div>
    </section>
  );
}

import { Link } from '@tanstack/react-router';

export function Footer() {
  return (
    <footer className="bg-white px-6 py-12">
      <div className="mx-auto max-w-[1150px]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[350px_1fr]">
          {/* Left card */}
          <div className="relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[28px] bg-[#0EA5E9] p-8 text-white shadow-[0_12px_40px_rgba(14,165,233,0.25)]">
            <div className="relative z-10 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border-[1.5px] border-white/85 bg-white/15 text-base font-bold">F</div>
              <span className="text-[22px] font-bold tracking-tight">FORMRUS</span>
            </div>
            <div className="relative z-10 mt-auto mb-7">
              <p className="text-[19px] leading-[1.45]">
                Forms that live on Walrus,<br />
                <span className="text-white/65">forever and decentralized.</span>
              </p>
            </div>
            <div className="relative z-10 flex items-center justify-between gap-3">
              <span className="text-[17px] font-semibold tracking-wide text-white/90" style={{ fontFamily: "'Outfit', sans-serif" }}>Stay in touch!</span>
              <div className="flex gap-1.5">
                {['X', 'GH', 'DC', 'IN'].map(s => (
                  <div key={s} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[9px] bg-[#0a1014] text-[10px] font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-black">{s}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Right card */}
          <div className="relative flex flex-col justify-between rounded-[28px] bg-[#f0f1f5] p-10 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex flex-row gap-12 md:gap-[72px]">
              <div className="flex flex-col">
                <h4 className="mb-[18px] text-[20px] font-semibold italic text-muted-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>Product</h4>
                <Link to="/builder" className="mb-[14px] text-sm font-semibold text-foreground transition-colors hover:text-primary">Builder</Link>
                <Link to="/my-forms" className="mb-[14px] text-sm font-semibold text-foreground transition-colors hover:text-primary">My Forms</Link>
                <Link to="/docs" className="mb-[14px] text-sm font-semibold text-foreground transition-colors hover:text-primary">Docs</Link>
              </div>
              <div className="flex flex-col">
                <h4 className="mb-[18px] text-[20px] font-semibold italic text-muted-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>Company</h4>
                <a href="#" className="mb-[14px] text-sm font-semibold text-foreground transition-colors hover:text-primary">About</a>
                <a href="#" className="mb-[14px] text-sm font-semibold text-foreground transition-colors hover:text-primary">Privacy</a>
                <a href="#" className="mb-[14px] text-sm font-semibold text-foreground transition-colors hover:text-primary">Terms</a>
              </div>
            </div>
            <div className="mt-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <p className="text-xs font-medium text-muted-foreground">© 2026 FORMRUS. Stored on Walrus.</p>
              <div className="flex w-full max-w-[310px] gap-1 rounded-xl border border-border bg-white p-1.5 shadow-sm">
                <input type="email" placeholder="Enter email address" className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground" />
                <button type="button" className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-md transition-all hover:-translate-y-px hover:bg-black">Subscribe</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

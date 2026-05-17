import { Link } from "@tanstack/react-router";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link to="/" className="inline-flex items-center gap-2.5" aria-label="FORMRUS home">
          <img src="/formrus-mark.svg" alt="" className="h-9 w-9 rounded-xl" />
          <span className="text-xl font-bold tracking-tight text-foreground">FORMRUS</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <Link
            to="/builder"
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground transition-colors"
          >
            Create Form
          </Link>
          <Link
            to="/my-forms"
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground transition-colors"
          >
            My Forms
          </Link>
          <Link
            to="/one-pager"
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground transition-colors"
          >
            One-Pager
          </Link>
          <Link
            to="/docs"
            activeProps={{ className: "text-foreground" }}
            className="hover:text-foreground transition-colors"
          >
            Docs
          </Link>
        </nav>
        <Link
          to="/builder"
          className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 hover:-translate-y-px"
        >
          Create Free Form
        </Link>
      </div>
    </header>
  );
}

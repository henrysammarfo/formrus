import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

const siteUrl = "https://formrus.genesis-ai.workers.dev";
const siteTitle = "FORMRUS - Walrus-native form storage";
const siteDescription =
  "Create custom forms, collect rich feedback, encrypt private responses with Seal, and store submissions on Walrus mainnet.";
const socialImage = `${siteUrl}/og-image.svg`;

const ClientDAppKitProvider = lazy(() =>
  import("@/components/ClientDAppKitProvider").then((module) => ({
    default: module.ClientDAppKitProvider,
  })),
);

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1
          className="text-7xl font-bold text-primary"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          404
        </h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Blob not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page or form blob doesn't exist on Walrus.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: siteTitle },
      {
        name: "description",
        content: siteDescription,
      },
      {
        name: "keywords",
        content:
          "Walrus Protocol, Walrus forms, decentralized forms, feedback platform, Seal encryption, Sui, web3 forms, form builder",
      },
      { name: "author", content: "FORMRUS" },
      { name: "application-name", content: "FORMRUS" },
      { name: "apple-mobile-web-app-title", content: "FORMRUS" },
      { name: "theme-color", content: "#0EA5E9" },
      { name: "robots", content: "index, follow" },
      { name: "format-detection", content: "telephone=no" },
      { property: "og:site_name", content: "FORMRUS" },
      { property: "og:title", content: siteTitle },
      {
        property: "og:description",
        content: siteDescription,
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: siteUrl },
      { property: "og:image", content: socialImage },
      { property: "og:image:alt", content: "FORMRUS - Forms that live on Walrus" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: siteTitle },
      { name: "twitter:description", content: siteDescription },
      { name: "twitter:image", content: socialImage },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: siteUrl },
      { rel: "icon", href: "/formrus-mark.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/formrus-mark.svg" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isFocusedFormRoute = pathname.startsWith("/form/");
  const needsWalletProvider =
    pathname.startsWith("/builder") ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/form/") ||
    pathname.startsWith("/my-forms");
  const app = (
    <div className="flex min-h-screen flex-col bg-background">
      {!isFocusedFormRoute && <Navbar />}
      <main className="flex-1">
        <Outlet />
      </main>
      {!isFocusedFormRoute && <Footer />}
      <Toaster />
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      {needsWalletProvider ? <WalletProviderBoundary>{app}</WalletProviderBoundary> : app}
    </QueryClientProvider>
  );
}

function WalletProviderBoundary({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ClientDAppKitProvider>{children}</ClientDAppKitProvider>
    </Suspense>
  );
}

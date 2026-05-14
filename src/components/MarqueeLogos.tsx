const LOGOS = [
  { src: 'https://svgl.app/library/figma.svg', alt: 'Figma' },
  { src: 'https://svgl.app/library/shopify.svg', alt: 'Shopify' },
  { src: 'https://svgl.app/library/blender.svg', alt: 'Blender' },
  { src: 'https://svgl.app/library/spotify.svg', alt: 'Spotify' },
  { src: 'https://svgl.app/library/google-cloud.svg', alt: 'Google Cloud' },
  { src: 'https://svgl.app/library/bing.svg', alt: 'Bing' },
  { src: 'https://svgl.app/library/lottielab.svg', alt: 'Lottielab' },
  { src: 'https://svgl.app/library/vercel.svg', alt: 'Vercel' },
];

export function MarqueeLogos() {
  return (
    <div
      className="mx-auto mt-10 w-full max-w-[1400px] overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
      }}
    >
      <div className="marquee-track flex w-max gap-6">
        {[...LOGOS, ...LOGOS].map((l, i) => (
          <div
            key={i}
            className="group relative flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/60 bg-white shadow-sm transition-all hover:border-slate-300"
          >
            <img src={l.src} alt={l.alt} className="h-8 w-auto opacity-70 transition-all group-hover:opacity-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

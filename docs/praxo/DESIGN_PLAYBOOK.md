# Praxo Design Playbook

Source of truth for how every Praxo surface looks and moves: landing page,
web app (`/praxo`), admin, and — translated to SwiftUI — the Mac app
(see `MAC_APP_V2_SPEC.md` §2 for the translation table).

Identity in one line: **pure black, near-white type, glassy white-alpha
surfaces, monochrome, rounded-full buttons, calm fade-up motion.**

---

## Stack & global setup (web surfaces)

- React 18 + TypeScript, TailwindCSS, `framer-motion`, `clsx` +
  `tailwind-merge` exposed as `cn()` from `@/lib/utils`.
  (Our web app runs these inside **Next.js App Router** rather than Vite —
  identical components; `use client` where motion/hooks appear.)
- Dark theme. Page background `#000000`. Font: **Inter** (`font-inter`).
  Icons: Google **Material Symbols Outlined** (loaded globally).
- Tailwind config must include semantic HSL tokens plus:
  ```ts
  theme.extend.colors.landing = {
    surface: "rgba(255,255,255,0.10)",
    "surface-hover": "rgba(255,255,255,0.16)",
    border: "rgba(255,255,255,0.10)",
  }
  ```
- `--background` / `--foreground` HSL tokens drive `bg-background` (dark)
  and `text-foreground` (near-white).

## Helper components (reuse exact behavior)

### `MIcon`
Material Symbols span. Props: `name`, `size=20`, `weight=400`, `fill=0`,
`grade=0`, `opticalSize=24`, `className`.

```tsx
<span
  className={cn("material-symbols-outlined select-none leading-none", className)}
  style={{
    fontSize: size,
    fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`,
  }}
>{name}</span>
```

### `FadeUp`
`framer-motion` wrapper: `initial={{opacity:0, y:24}}`,
`whileInView={{opacity:1, y:0}}`, `viewport={{once:true, amount:0.3}}`,
`transition={{duration:0.6, delay, ease:[0.22,1,0.36,1]}}`.
Props: `children`, `delay=0`, `className`.

### `SpotlightBorder`
1px gradient border that follows the cursor via CSS masks.
- Props: `children`, `className`, `radius="2xl"`, `size=520`, `intensity=0.5`.
- Wrapper sets CSS vars `--spot-x`, `--spot-y` (default `-9999px`) updated
  on `pointermove` relative to the element.
- Two stacked layers using `-webkit-mask` + `mask`
  `linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)` with
  `mask-composite: exclude` to produce a 1px ring; the ring is painted with
  `radial-gradient(circle var(--size) at var(--spot-x) var(--spot-y),
  rgba(255,255,255, var(--intensity)), transparent 60%)`.
- Outer ring: `rounded-2xl border border-white/10`. Inner highlight ring:
  thinner, brighter on hover. Pointer events on inner content only.

### `PrimaryButton` / `SecondaryButton`
- Both: `inline-flex items-center justify-center rounded-full`, Inter,
  leading-none, hover text-up-from-below animation (`AnimatedText`).
- PrimaryButton: `bg-white/80 hover:bg-white text-black`.
  Size `sm` = `h-8 px-4 text-sm`.
- SecondaryButton: `bg-landing-surface hover:bg-landing-surface-hover
  border border-landing-border text-foreground backdrop-blur-[2.5px]
  font-medium`. Size `sm` = `h-8 px-4 text-sm`.

## Section pattern (reference: `PricingSection`)

Header row: badge pill → large light heading with tight tracking →
right-aligned muted paragraph; then content grid. Use this rhythm for all
landing sections.

```tsx
<section id="pricing" className="relative w-full bg-background py-12 sm:py-16">
  <div className="mx-auto max-w-[1080px] px-4 sm:px-6">
    {/* HEADER */}
    <div className="mb-14 flex flex-col items-start gap-10 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <FadeUp>
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-landing-surface border border-white/10 px-3 py-1 text-xs text-foreground/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
            Pricing
          </span>
        </FadeUp>
        <FadeUp delay={0.1}>
          <h2 className="text-3xl sm:text-4xl font-normal tracking-[-0.02em] leading-[1.05] text-foreground">
            Clear pricing plans
            <br className="hidden sm:block" /> that scale with you.
          </h2>
        </FadeUp>
      </div>
      <FadeUp delay={0.2}>
        <p className="max-w-sm text-sm sm:text-base text-foreground/60">
          One-time payment. Lifetime access. Pick the plan that fits how far
          you want to go.
        </p>
      </FadeUp>
    </div>

    {/* CARDS */}
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
      {plans.map(p => <PricingCard key={p.name} plan={p} />)}
    </div>
  </div>
</section>
```

## Plans data (exact)

```ts
type Feature = { text: string; included: boolean };
type Plan = {
  name: string; price: string; originalPrice?: string; description: string;
  features: Feature[]; featured?: boolean; badge?: string; bg: string;
};

const plans: Plan[] = [
  {
    name: "Course",
    price: "159", originalPrice: "497",
    description: "Once. Lifetime. 68% off.",
    bg: "#161616",
    features: [
      { text: "All courses and videos", included: true },
      { text: "All modules. Lifetime access.", included: true },
      { text: "AI Builder", included: true },
      { text: "Unlimited Templates", included: false },
      { text: "Unlimited Motion Videos", included: false },
    ],
  },
  {
    name: "Course + Lovable Templates",
    price: "239", originalPrice: "697",
    description: "Once. Lifetime. Best deal.",
    bg: "#252525",
    features: [
      { text: "All courses and videos", included: true },
      { text: "All modules. Lifetime access.", included: true },
      { text: "AI Builder", included: true },
      // …remainder of the featured plan's features/badge as provided —
      // extend here when the full data lands.
    ],
  },
];
```

## SwiftUI translation (Mac app)

| Web token | SwiftUI equivalent |
|---|---|
| bg `#000000` | `Color.black` window background |
| `landing.surface` white/10 | `Color.white.opacity(0.10)` fills |
| `landing.border` white/10 | 1px `Color.white.opacity(0.10)` strokes |
| `text-foreground` | `Color(hex: 0xFAFAFA)`; secondary = `.opacity(0.60)` |
| Inter | Bundle Inter; fallback SF Pro (system) |
| Material Symbols | SF Symbols nearest equivalents |
| PrimaryButton | Capsule, `white.opacity(0.8)` bg → white on hover, black text |
| SecondaryButton | Capsule, surface fill + border, `.ultraThinMaterial` feel |
| FadeUp | on-appear `opacity 0→1, y +24→0`, 0.6s, `timingCurve(0.22,1,0.36,1)`, staggered delays |
| SpotlightBorder | skip on Mac (cursor-follow borders don't fit AppKit panels); plain white/10 border |
| rounded-2xl cards | corner radius 16; controls capsule/10 |

Monochrome discipline everywhere: color is reserved for semantic state
only — success `#4ADE80`, warning `#FBBF24`, danger `#F87171` — never
decoration.

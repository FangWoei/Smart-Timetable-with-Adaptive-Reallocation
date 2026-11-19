// src/components/PageHeader.jsx
// Dark navy banner at the top of a page: pill label, title, subtitle, chips on the right.
// Optional campus photo: put it at frontend/public/campus.jpg (it shows faintly behind
// the gradient). Without the file the banner is just the gradient.
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  compact = false,
  children,
}) {
  return (
    <header
      className="relative shrink-0 overflow-hidden border-b border-navy-900 text-white"
      style={{
        backgroundColor: "#0a1f3a",
        backgroundImage:
          "radial-gradient(ellipse at 85% 120%, rgba(60,116,176,0.35) 0%, rgba(60,116,176,0) 55%), linear-gradient(95deg, rgba(8,26,50,0.97) 0%, rgba(12,40,72,0.93) 55%, rgba(16,71,118,0.85) 100%), url('/campus.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center 40%",
      }}>
      <div
        className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-6 ${
          compact ? "py-2.5" : "py-5"
        }`}>
        <div className="min-w-0">
          {eyebrow && !compact && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85">
              <span className="size-1.5 rounded-full bg-navy-200" />
              {eyebrow}
            </span>
          )}
          <h1
            className={`font-bold leading-tight tracking-tight ${
              compact ? "text-[15px]" : "mt-3 text-2xl"
            }`}>
            {title}
          </h1>
          {subtitle && (
            <p
              className={`text-white/75 ${
                compact
                  ? "text-xs"
                  : "mt-1.5 max-w-2xl text-[13px] leading-relaxed"
              }`}>
              {subtitle}
            </p>
          )}
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        )}
      </div>
    </header>
  );
}

// Outlined pill for the right side of the banner, e.g. <HeaderChip>4 no-class days</HeaderChip>
export function HeaderChip({ children }) {
  return (
    <span className="rounded-full border border-white/25 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/90">
      {children}
    </span>
  );
}

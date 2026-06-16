import { useStore } from "../store";

// Subtle, transparent background motifs for festive themes. Rendered as a faint
// fixed tile behind the app (only the transparent reader area reveals them).

const PUMPKIN = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>
  <g fill='#f97316' fill-opacity='0.07'>
    <ellipse cx='60' cy='72' rx='30' ry='24'/>
    <ellipse cx='44' cy='72' rx='15' ry='24'/>
    <ellipse cx='76' cy='72' rx='15' ry='24'/>
  </g>
  <rect x='56' y='40' width='8' height='15' rx='3' fill='#84cc16' fill-opacity='0.08'/>
</svg>`;

const CLOVER = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>
  <g fill='#22c55e' fill-opacity='0.08'>
    <circle cx='60' cy='44' r='14'/>
    <circle cx='46' cy='58' r='14'/>
    <circle cx='74' cy='58' r='14'/>
    <circle cx='60' cy='72' r='14'/>
    <rect x='58' y='70' width='4' height='28' rx='2'/>
  </g>
</svg>`;

function uri(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export default function ThemeDecor() {
  const theme = useStore((s) => s.settings.theme);
  const image =
    theme === "halloween" ? uri(PUMPKIN) : theme === "irish" ? uri(CLOVER) : null;
  if (!image) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage: image,
        backgroundRepeat: "repeat",
        backgroundSize: "150px 150px",
      }}
    />
  );
}

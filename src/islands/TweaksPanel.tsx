import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "auto";
interface Tweaks {
  theme: Theme;
  accentHue: number;
  density: number;
}

const DEFAULTS: Tweaks = { theme: "light", accentHue: 211, density: 1 };
const HUES = [211, 260, 150, 30, 340, 0];

function load(): Tweaks {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("__tweaks") || "{}") };
  } catch {
    return DEFAULTS;
  }
}

function apply(t: Tweaks) {
  const root = document.documentElement;
  const isDark =
    t.theme === "dark" ||
    (t.theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);

  if (t.accentHue === 0) {
    root.style.setProperty("--accent", isDark ? "oklch(0.85 0 0)" : "oklch(0.25 0 0)");
    root.style.setProperty("--accent-2", isDark ? "oklch(0.7 0 0)" : "oklch(0.4 0 0)");
  } else {
    root.style.setProperty("--accent-h", String(t.accentHue));
    root.style.setProperty("--accent", `oklch(0.62 0.17 ${t.accentHue})`);
    root.style.setProperty("--accent-2", `oklch(0.74 0.13 ${t.accentHue})`);
  }
  root.style.setProperty("--density", String(t.density));
}

export default function TweaksPanel() {
  const [t, setT] = useState<Tweaks>(DEFAULTS);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const initial = load();
    setT(initial);
    apply(initial);
  }, []);

  const update = (patch: Partial<Tweaks>) => {
    const next = { ...t, ...patch };
    setT(next);
    apply(next);
    localStorage.setItem("__tweaks", JSON.stringify(next));
  };

  const isDark =
    t.theme === "dark" ||
    (t.theme === "auto" &&
      typeof window !== "undefined" &&
      matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <>
      <button
        className="tweaks-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open tweaks panel"
        title="Tweaks"
      >
        ⚙
      </button>
      <aside className={"tweaks" + (open ? " open" : "")}>
        <div className="tweaks-hdr">
          <span>Tweaks</span>
          <span className="caption mono">
            {isDark ? "dark" : "light"} · {t.accentHue === 0 ? "mono" : t.accentHue + "°"}
          </span>
        </div>

        <label>
          <span>Theme</span>
          <select
            value={t.theme}
            onChange={(e) => update({ theme: e.target.value as Theme })}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </label>

        <label style={{ alignItems: "flex-start", flexDirection: "column", gap: 6 }}>
          <span>Accent</span>
          <div className="swatches">
            {HUES.map((h) => (
              <button
                key={h}
                className={"swatch" + (t.accentHue === h ? " active" : "")}
                onClick={() => update({ accentHue: h })}
                style={{ background: h === 0 ? "oklch(0.3 0 0)" : `oklch(0.62 0.17 ${h})` }}
                title={h === 0 ? "mono" : `${h}°`}
              />
            ))}
          </div>
        </label>

        <label>
          <span>Density</span>
          <input
            type="range"
            min={0.7}
            max={1.3}
            step={0.05}
            value={t.density}
            onChange={(e) => update({ density: Number(e.target.value) })}
          />
        </label>
      </aside>

      <style>{`
        .tweaks-toggle {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 59;
          width: 44px;
          height: 44px;
          border-radius: 999px;
          background: var(--bg-card);
          border: 1px solid var(--line);
          color: var(--ink-2);
          font-size: 18px;
          cursor: pointer;
          box-shadow: var(--shadow-md);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform .15s, color .15s;
        }
        .tweaks-toggle:hover { transform: rotate(30deg); color: var(--ink); }
      `}</style>
    </>
  );
}

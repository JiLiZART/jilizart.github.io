import React, { useMemo, useState, useEffect } from "react";
import { FiCopy, FiCheck } from "react-icons/fi";
import Color from "colorjs.io";

interface ColorFormat {
  id: string;
  label: string;
  fn: (color: Color) => string;
}

const ColorConverter: React.FC = () => {
  const [inputValue, setInputValue] = useState("");
  const [color, setColor] = useState<Color | null>(null);
  const [sourceFormat, setSourceFormat] = useState<string | null>(null);
  const textColor = useMemo(() => {
    if (color) {
      return color.luminance > 0.5 ? "#000000" : "#ffffff";
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "#FFFFFF";
    }

    return "#000000";
  }, [color, typeof window]);

  const detectFormat = (value: string): string | null => {
    value = value.trim().toLowerCase();
    if (value.startsWith("#") && value.length > 2) return "hex";
    if (value.startsWith("rgb")) return "rgb";
    if (value.startsWith("hsl")) return "hsl";
    if (value.startsWith("cmyk")) return "cmyk";
    if (value.startsWith("oklch")) return "oklch";
    return null;
  };

  const rgbToCmyk = (r: number, g: number, b: number) => {
    let c = 1 - r / 255;
    let m = 1 - g / 255;
    let y = 1 - b / 255;
    let k = Math.min(c, m, y);

    if (k === 1) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }

    c = Math.round(((c - k) / (1 - k)) * 100);
    m = Math.round(((m - k) / (1 - k)) * 100);
    y = Math.round(((y - k) / (1 - k)) * 100);
    k = Math.round(k * 100);

    return { c, m, y, k };
  };

  const formats: ColorFormat[] = [
    {
      id: "hex",
      label: "HEX",
      fn: (color) => color.toString({ format: "hex" }).toUpperCase(),
    },
    {
      id: "rgb",
      label: "RGB",
      fn: (color) => {
        const rgb = color.to("srgb");
        const [r, g, b] = rgb.coords.map((c) => Math.round(c * 255));
        return `rgb(${r}, ${g}, ${b})`;
      },
    },
    {
      id: "hsl",
      label: "HSL",
      fn: (color) => {
        const hsl = color.to("hsl");
        const [h, s, l] = [
          Math.round(hsl.coords[0]),
          Math.round(hsl.coords[1] * 100),
          Math.round(hsl.coords[2] * 100),
        ];
        return `hsl(${h}, ${s}%, ${l}%)`;
      },
    },
    {
      id: "cmyk",
      label: "CMYK",
      fn: (color) => {
        const rgb = color.to("srgb");
        const [r, g, b] = rgb.coords.map((c) => Math.round(c * 255));
        const cmyk = rgbToCmyk(r, g, b);
        return `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;
      },
    },
    {
      id: "oklch",
      label: "OKLCH",
      fn: (color) => {
        const oklch = color.to("oklch");
        const [l, c, h] = [
          Math.round(oklch.coords[0] * 100),
          Math.round(oklch.coords[1] * 100) / 100,
          Math.round(oklch.coords[2]),
        ];
        return `oklch(${l}% ${c} ${h})`;
      },
    },
  ];

  const handleColorInput = (value: string) => {
    try {
      const format = detectFormat(value);
      if (!format) return;

      let newColor: Color | null = null;

      if (format === "cmyk") {
        const matches = value.match(
          /cmyk\((\d+)%?,\s*(\d+)%?,\s*(\d+)%?,\s*(\d+)%?\)/
        );
        if (matches) {
          const [c, m, y, k] = matches.slice(1).map((n) => parseInt(n) / 100);
          const r = Math.round(255 * (1 - c) * (1 - k));
          const g = Math.round(255 * (1 - m) * (1 - k));
          const b = Math.round(255 * (1 - y) * (1 - k));
          newColor = new Color(`rgb(${r}, ${g}, ${b})`);
        }
      } else if (format === "oklch") {
        const matches = value.match(/oklch\((\d+)%\s+(\d*\.?\d+)\s+(\d+)\)/);
        if (matches) {
          const [l, c, h] = matches.slice(1).map(Number);
          newColor = new Color("oklch", [l / 100, c, h]);
        }
      } else {
        newColor = new Color(value);
      }

      if (newColor) {
        setColor(newColor);
        setSourceFormat(format);
      }
    } catch (error) {
      console.error("Invalid color format:", error);
    }
  };

  useEffect(() => {
    let timeout;

    if (color) {
      timeout = setTimeout(() => {
        const main = document.querySelector("main");

        console.log(color, color.toJSON());

        if (main) {
          main.style.backgroundColor = color.toString();
        }
      }, 500);
    }

    return () => {
      timeout && clearTimeout(timeout);
    };
  }, [color]);

  const copyToClipboard = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className="max-w-xs mx-auto space-y-8">
      <div className="relative">
        <input
          type="text"
          id="colorInput"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            handleColorInput(e.target.value);
          }}
          placeholder="Try #A4CCD7, rgb(164, 204, 215), hsl(195, 37%, 74%), cmyk(24%, 5%, 0%, 16%), or oklch(82% 0.04 216)"
          className="w-full p-4 rounded-lg text-center text-lg font-mono transition-colors duration-200 bg-transparent border-2"
          style={{ color: textColor, borderColor: textColor }}
        />
      </div>

      {color && (
        <div className="space-y-4">
          {formats
            .filter((f) => f.id !== sourceFormat)
            .map((format) => {
              const colorValue = format.fn(color);
              return (
                <ColorFormatItem
                  key={format.id}
                  label={format.label}
                  value={colorValue}
                  textColor={textColor}
                  onCopy={() => copyToClipboard(colorValue)}
                />
              );
            })}
        </div>
      )}
    </div>
  );
};

interface ColorFormatItemProps {
  label: string;
  value: string;
  textColor: string;
  onCopy: () => void;
}

const ColorFormatItem: React.FC<ColorFormatItemProps> = ({
  label,
  value,
  textColor,
  onCopy,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <div
      className="group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors"
      onClick={handleCopy}
      style={{ color: textColor }}
    >
      <code className="text-lg font-mono">{value}</code>
      <button className="p-1.5 rounded-md transition-colors">
        {copied ? (
          <FiCheck className="w-4 h-4" style={{ color: textColor }} />
        ) : (
          <FiCopy className="w-4 h-4" style={{ color: textColor }} />
        )}
      </button>
    </div>
  );
};

export default ColorConverter;

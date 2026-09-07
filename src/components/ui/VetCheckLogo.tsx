import React from "react";

interface VetCheckLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  showText?: boolean;
  showTagline?: boolean;
  textColor?: string;
  taglineColor?: string;
  className?: string;
  isScanning?: boolean;
}

export const VetCheckLogo: React.FC<VetCheckLogoProps> = ({
  size = "md",
  showText = false,
  showTagline = false,
  textColor,
  taglineColor,
  className = "",
  isScanning = false,
}) => {
  const sizeMap = {
    xs: { icon: 24, text: "text-sm", tag: "text-[9px]" },
    sm: { icon: 32, text: "text-lg", tag: "text-[10px]" },
    md: { icon: 40, text: "text-xl", tag: "text-xs" },
    lg: { icon: 52, text: "text-2xl", tag: "text-xs" },
    xl: { icon: 64, text: "text-3xl", tag: "text-sm" },
    "2xl": { icon: 84, text: "text-4xl", tag: "text-base" },
  };

  const { icon: iconSize, text: textClass, tag: tagClass } = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* SVG Icon with original Shield + Paw + Scan Reticle + Medical Care Symbol */}
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg
          viewBox="0 0 128 128"
          width={iconSize}
          height={iconSize}
          className="w-full h-full drop-shadow-xs"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="vcShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3D705D" />
              <stop offset="60%" stopColor="#315C4C" />
              <stop offset="100%" stopColor="#25473B" />
            </linearGradient>
            <linearGradient id="vcPawGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E7EEE9" />
              <stop offset="100%" stopColor="#D2DFD7" />
            </linearGradient>
          </defs>

          {/* Medical Protective Shield */}
          <path
            d="M64 10 C88 22 108 26 112 36 C114 68 102 96 64 118 C26 96 14 68 16 36 C20 26 40 22 64 10 Z"
            fill="url(#vcShieldGrad)"
            stroke="#25473B"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Scanning Reticle Corner Elements */}
          <path
            d="M34 36 L26 36 L26 44"
            stroke="#A3C2B4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M94 36 L102 36 L102 44"
            stroke="#A3C2B4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M26 84 L26 92 L34 92"
            stroke="#A3C2B4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M102 84 L102 92 L94 92"
            stroke="#A3C2B4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Animal Paw Silhouette Pads */}
          <ellipse cx="43" cy="45" rx="6" ry="8.5" transform="rotate(-18 43 45)" fill="url(#vcPawGrad)" />
          <ellipse cx="56" cy="39" rx="6" ry="9" transform="rotate(-5 56 39)" fill="url(#vcPawGrad)" />
          <ellipse cx="72" cy="39" rx="6" ry="9" transform="rotate(5 72 39)" fill="url(#vcPawGrad)" />
          <ellipse cx="85" cy="45" rx="6" ry="8.5" transform="rotate(18 85 45)" fill="url(#vcPawGrad)" />

          {/* Central Main Metacarpal Pad */}
          <path
            d="M46 63 C42 66 40 72 45 78 C51 85 58 87 64 87 C70 87 77 85 83 78 C88 72 86 66 82 63 C77 59 71 62 64 62 C57 62 51 59 46 63 Z"
            fill="url(#vcPawGrad)"
          />

          {/* Medical Care Cross inside central pad */}
          <rect x="61" y="67" width="6" height="15" rx="2" fill="#25473B" />
          <rect x="56" y="71.5" width="16" height="6" rx="2" fill="#25473B" />
        </svg>

        {isScanning && (
          <span className="absolute inset-0 rounded-full border-2 border-[#315C4C] animate-ping opacity-40 pointer-events-none" />
        )}
      </div>

      {/* Brand Text */}
      {(showText || showTagline) && (
        <div className="flex flex-col text-left">
          {showText && (
            <div className={`font-black tracking-tight leading-none ${textClass} ${textColor || "text-[#252A27]"}`}>
              <span>Vet</span>
              <span className="text-[#315C4C]">Check</span>
            </div>
          )}
          {showTagline && (
            <p className={`font-medium tracking-tight mt-0.5 ${tagClass} ${taglineColor || "text-[#626963]"}`}>
              Simple animal health support
            </p>
          )}
        </div>
      )}
    </div>
  );
};

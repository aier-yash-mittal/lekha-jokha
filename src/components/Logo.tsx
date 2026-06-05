interface LogoProps {
  className?: string
  size?: number
  animated?: boolean
}

export default function Logo({ className = '', size = 48, animated = true }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? 'animate-logo-float' : ''}`}
    >
      <defs>
        {/* Main Brand Gradient (Hot Red to Coral Orange) */}
        <linearGradient id="logoBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff3b3b" />
          <stop offset="60%" stop-color="#ff1e1e" />
          <stop offset="100%" stop-color="#e01a1a" />
        </linearGradient>

        {/* Dynamic Theme Glow (Red shadow overlay) */}
        <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#ff1e1e" flood-opacity="0.35" />
        </filter>

        {/* Ribbon Gradients for sleek overlapping paper/lines */}
        <linearGradient id="ribbonLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#ffebeb" />
        </linearGradient>

        <linearGradient id="ribbonRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#ffd5d5" />
        </linearGradient>
      </defs>

      {/* Rounded squircle backdrop matching modern app icons */}
      <rect
        x="10"
        y="10"
        width="180"
        height="180"
        rx="50"
        fill="url(#logoBrandGrad)"
        className="transition-all duration-300"
      />

      <g filter="url(#logoGlow)" className="transition-opacity duration-300">
        {/* Abstract sheet outline representing a Ledger/Bill ("Lekha") */}
        <rect
          x="50"
          y="50"
          width="100"
          height="100"
          rx="18"
          stroke="#ffffff"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.25"
        />

        {/* Sleek L-Shape ledger line ("Lekha") */}
        <path
          d="M72 65 V130 C72 138.284 78.716 145 87 145 H130"
          stroke="url(#ribbonLeft)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="logo-draw-path"
        />

        {/* Dynamic settlement checkmark/division line ("Jokha" - Split/Settle) */}
        <path
          d="M135 65 L98 120 C95 125 88 125 85 120 L75 105"
          stroke="url(#ribbonRight)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="logo-draw-path-2"
        />

        {/* Interactive nodes representing shared split/connected payments */}
        <circle cx="135" cy="65" r="9" fill="#ffffff" />
        <circle cx="87" cy="85" r="6" fill="#ffffff" opacity="0.8" />
        <circle cx="130" cy="145" r="9" fill="#ffffff" />
      </g>
    </svg>
  )
}

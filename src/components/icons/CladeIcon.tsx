/**
 * Clade Logo Icon - Phylogenetic Tree Design
 * Represents evolutionary relationships and musical ancestry
 * Smart, elegant, fun for all ages
 */

interface CladeIconProps {
  className?: string;
  size?: number;
}

export function CladeIcon({ className = "", size = 24 }: CladeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* C ring */}
      <path
        d="M15 7A6 6 0 1 0 15 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Spokes */}
      <path d="M17.5 8.5L21 6.5M17.5 12L21 12M17.5 15.5L21 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6.5 8.5L3 6.5M6.5 12L3 12M6.5 15.5L3 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="21" cy="6.5" r="1.4" fill="currentColor" />
      <circle cx="21" cy="12" r="1.4" fill="currentColor" />
      <circle cx="21" cy="17.5" r="1.4" fill="currentColor" />
      <circle cx="3" cy="6.5" r="1.4" fill="currentColor" />
      <circle cx="3" cy="12" r="1.4" fill="currentColor" />
      <circle cx="3" cy="17.5" r="1.4" fill="currentColor" />

      {/* Stem + base */}
      <path d="M12 16V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 21A4 4 0 0 0 16 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="21.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

/**
 * Simplified ancestor badge icon
 * Used to mark foundational/influential songs
 */
export function AncestorBadge({ className = "", size = 16 }: CladeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Common Ancestor - Influential Track"
    >
      {/* Compact tree structure */}
      <path
        d="M8 14V8M8 8L5 6M8 8L11 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="4" r="1.5" fill="currentColor" />
      <circle cx="11" cy="4" r="1.5" fill="currentColor" />
      <circle cx="8" cy="14" r="1.5" fill="currentColor" />
      
      {/* Sparkle effect for "influential" */}
      <path
        d="M8 2L8.5 3.5L10 4L8.5 4.5L8 6L7.5 4.5L6 4L7.5 3.5L8 2Z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}

/**
 * Animated Clade Logo for header/branding
 */
export function CladeLogoAnimated({ className = "", size = 32 }: CladeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20 9A8 8 0 1 0 20 23"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M22.5 11L27 8.5M22.5 16L27 16M22.5 21L27 23.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M9.5 11L5 8.5M9.5 16L5 16M9.5 21L5 23.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="27" cy="8.5" r="1.8" fill="currentColor" />
      <circle cx="27" cy="16" r="1.8" fill="currentColor" />
      <circle cx="27" cy="23.5" r="1.8" fill="currentColor" />
      <circle cx="5" cy="8.5" r="1.8" fill="currentColor" />
      <circle cx="5" cy="16" r="1.8" fill="currentColor" />
      <circle cx="5" cy="23.5" r="1.8" fill="currentColor" />
      <path d="M16 22V26" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11 27A5 5 0 0 0 21 27" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="27.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

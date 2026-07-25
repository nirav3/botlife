interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="39" y="30" width="22" height="32" rx="11" fill="currentColor" />
      <g transform="translate(39,32) rotate(-42)">
        <rect x="-6" y="-32" width="12" height="32" rx="6" fill="currentColor" />
      </g>
      <g transform="translate(61,32) rotate(42)">
        <rect x="-6" y="-32" width="12" height="32" rx="6" fill="currentColor" />
      </g>
      <g transform="translate(44,58) rotate(-16)">
        <rect x="-6.5" y="0" width="13" height="36" rx="6.5" fill="currentColor" />
      </g>
      <g transform="translate(56,58) rotate(16)">
        <rect x="-6.5" y="0" width="13" height="36" rx="6.5" fill="currentColor" />
      </g>
      <circle cx="50" cy="18" r="12" fill="currentColor" />
    </svg>
  );
}

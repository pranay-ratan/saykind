type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export function MicIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="9" y="2.5" width="6" height="12" rx="3" />
      <path d="M5 11.5a7 7 0 0 0 14 0" />
      <path d="M12 18.5v3" />
    </svg>
  );
}

export function StopIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="5.5" y="5.5" width="13" height="13" rx="2.5" fill="currentColor" />
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

export function HelpIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.2 9.4a2.9 2.9 0 1 1 4.3 2.5c-.9.5-1.5 1.1-1.5 2.1" />
      <path d="M12 17.4h.01" />
    </svg>
  );
}

export function CupIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" />
      <path d="M17 9.5h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M9 2.5c-.7 1 .7 1.7 0 2.8M13 2.5c-.7 1 .7 1.7 0 2.8" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function SpeakerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  );
}

export function RestartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 12a8 8 0 1 0 2.6-5.9" />
      <path d="M4 4.5v4.2h4.2" />
    </svg>
  );
}

/** `off` adds a slash, so on and off differ by shape and not only by colour. */
export function CaptionsIcon({ className, off }: IconProps & { off?: boolean }) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M10.200 10.200a2.400 2.400 0 1 0 0 3.600M17.200 10.200a2.400 2.400 0 1 0 0 3.600" />
      {off && <path d="M4 3.500l16 17" strokeWidth="2.600" />}
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12.500l4.500 4.500L19 7.500" strokeWidth="3" />
    </svg>
  );
}

export function DotsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="5.500" cy="12" r="1.800" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.800" fill="currentColor" stroke="none" />
      <circle cx="18.500" cy="12" r="1.800" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BackIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15 5l-7 7 7 7" strokeWidth="2.600" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9.500" />
      <path d="M12 11v6" strokeWidth="2.400" />
      <path d="M12 7.400h.01" strokeWidth="3" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.4} className={className}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

/** A snail: the "slower, please" button. */
export function SnailIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.8 19h13.4c3.2 0 5-2 5-5V8.5" />
      <path d="M21.2 8.5l-1.4-3M21.2 8.5l2-2.4" />
      <circle cx="10.5" cy="12.2" r="5.2" />
      <path d="M10.5 12.2a1.9 1.9 0 1 1 1.9 1.9" />
    </svg>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.2" r="3.6" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 4h3.2l1.6 4.2-2 1.3a11 11 0 0 0 5.7 5.7l1.3-2L19 14.8V18a1.8 1.8 0 0 1-2 1.8C9.7 19.3 4.7 14.3 4.2 7A1.8 1.8 0 0 1 5 4z" />
    </svg>
  );
}

export function GearIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M5.6 18.4l1.7-1.7M16.7 7.3l1.7-1.7" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function ShareIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 12.5h9.4L17.5 7" />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3l7 2.6v5.6c0 4.4-3 7.6-7 9.4-4-1.8-7-5-7-9.4V5.6z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" />
    </svg>
  );
}

export function RecordIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.6" fill="currentColor" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

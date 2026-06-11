// Minimal inline icon set (24×24, stroke-based) so we don't need an icon dependency.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={22}
      height={22}
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: P) => (
  <Base {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </Base>
);

export const BoxIcon = (p: P) => (
  <Base {...p}>
    <path d="M21 8.2 12 3 3 8.2v7.6L12 21l9-5.2z" />
    <path d="M3 8.2 12 13l9-4.8" />
    <path d="M12 13v8" />
  </Base>
);

export const PlusIcon = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </Base>
);

export const UserIcon = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5c1.5-3.5 4.2-5 7.5-5s6 1.5 7.5 5" />
  </Base>
);

export const SearchIcon = (p: P) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Base>
);

export const ChartIcon = (p: P) => (
  <Base {...p}>
    <path d="M4 20V10M10 20V4M16 20v-8M20 20H4" />
  </Base>
);

export const TruckIcon = (p: P) => (
  <Base {...p}>
    <path d="M1.5 6h12v10h-12zM13.5 9h4.5l3 3.5V16h-7.5" />
    <circle cx="6" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </Base>
);

export const UsersIcon = (p: P) => (
  <Base {...p}>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M2.5 19.5c1.2-3 3.6-4.3 6.5-4.3s5.3 1.3 6.5 4.3" />
    <circle cx="17" cy="9.5" r="2.6" />
    <path d="M16.5 14.6c2.4.2 4.2 1.4 5.1 3.9" />
  </Base>
);

export const AlertIcon = (p: P) => (
  <Base {...p}>
    <path d="M12 3 2.5 20h19z" />
    <path d="M12 9.5V14M12 17.2v.1" />
  </Base>
);

export const ArrowRightIcon = (p: P) => (
  <Base {...p}>
    <path d="M4 12h16M13 5l7 7-7 7" />
  </Base>
);

export const ChevronRightIcon = (p: P) => (
  <Base {...p}>
    <path d="m9 5 7 7-7 7" />
  </Base>
);

export const CheckIcon = (p: P) => (
  <Base {...p}>
    <path d="m4.5 12.5 5 5L19.5 7" />
  </Base>
);

export const PlaneIcon = (p: P) => (
  <Base {...p}>
    <path d="M10.5 13.5 3 11l1.5-2 6.5 1L16.5 4l2.5 1-3.5 6.5 4 3-2 1.5-4.5-1.5-3 3.5-1.5-.5z" />
  </Base>
);

export const ShieldIcon = (p: P) => (
  <Base {...p}>
    <path d="M12 3 4.5 6v5c0 4.8 3.2 8.4 7.5 10 4.3-1.6 7.5-5.2 7.5-10V6z" />
    <path d="m8.8 11.8 2.2 2.2 4.2-4.5" />
  </Base>
);

export const PinIcon = (p: P) => (
  <Base {...p}>
    <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" />
    <circle cx="12" cy="10.5" r="2.3" />
  </Base>
);

export const ClockIcon = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Base>
);

export const LogoutIcon = (p: P) => (
  <Base {...p}>
    <path d="M14 4H6v16h8" />
    <path d="M10 12h10M17 8.5 20.5 12 17 15.5" />
  </Base>
);

export const ClipboardIcon = (p: P) => (
  <Base {...p}>
    <rect x="5.5" y="4.5" width="13" height="16.5" rx="2" />
    <path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3.5" />
  </Base>
);

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl bg-brand text-white shrink-0"
      style={{ width: size, height: size }}
    >
      <BoxIcon width={size * 0.6} height={size * 0.6} strokeWidth={2} />
    </span>
  );
}

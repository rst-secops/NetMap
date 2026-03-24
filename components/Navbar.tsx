import Link from "next/link";

function LogoIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Lines connecting nodes */}
      <line x1="14" y1="4" x2="4" y2="22" stroke="currentColor" strokeWidth="1.5" />
      <line x1="14" y1="4" x2="24" y2="22" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4" y1="22" x2="24" y2="22" stroke="currentColor" strokeWidth="1.5" />
      {/* Network nodes */}
      <circle cx="14" cy="4" r="3" fill="currentColor" />
      <circle cx="4" cy="22" r="3" fill="currentColor" />
      <circle cx="24" cy="22" r="3" fill="currentColor" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center border-b border-gray-800 bg-gray-900 px-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 text-blue-400">
          <LogoIcon />
          <span className="text-lg font-semibold">NetMap</span>
        </Link>
        <Link
          href="/dc-nodes"
          className="text-sm text-gray-300 hover:text-gray-100"
        >
          Data Collection Configuration
        </Link>
      </div>
      <div className="flex-1" />
      <button
        type="button"
        aria-label="Notifications"
        className="relative text-gray-400 hover:text-gray-100"
      >
        <BellIcon />
      </button>
    </nav>
  );
}

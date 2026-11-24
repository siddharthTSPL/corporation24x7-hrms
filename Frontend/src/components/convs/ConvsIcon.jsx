export default function ConvsIcon({ className = "", size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H11l-4.2 3.6a.5.5 0 0 1-.8-.4V16.5H4A1.5 1.5 0 0 1 2.5 15V6A1.5 1.5 0 0 1 4 4.5Z"
        fill="currentColor"
      />
      <path d="M9 8.5l6 5M15 8.5l-6 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

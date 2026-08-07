// Umumiy SVG ikonlar — butun loyihada bitta manba
export function LeafIcon({ size = 18, ...props }) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 19c8 0 14-6 14-14 0 0-14 0-14 14z" fill="currentColor" />
      <path d="M5 19c3-6 6-9 12-12" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
    </svg>
  );
}
export function DashboardIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="11" width="8" height="10" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}
export function UsersIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
      <circle cx="17" cy="8" r="2.6" /><path d="M15.2 14.7c2.9.3 5.3 2.2 5.3 5.3" />
    </svg>
  );
}
export function BookIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5c3 0 6 1 8 3 2-2 5-3 8-3v13c-3 0-6 1-8 3-2-2-5-3-8-3V5z" />
    </svg>
  );
}
export function VrIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="7" width="20" height="11" rx="4" />
      <circle cx="8" cy="12.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12.5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function ChartIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
    </svg>
  );
}
export function BellIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
export function SettingsIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </svg>
  );
}
export function LogoutIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
export function PlusIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
export function SearchIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
export function EditIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
export function TrashIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
export function CheckIcon({ size = 15, ...props }) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}
export function CloseIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
export function MenuIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
export function FlameIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22c4.4 0 7-2.8 7-6.5 0-4.5-4-6.5-4-10.5-2.5 1.5-3.5 4-3 6.5C10.5 9.5 8 8 8 5.5 5.5 8 5 10.5 5 13.5 5 19.2 7.6 22 12 22z" />
    </svg>
  );
}
export function TrophyIcon({ size = 18, ...props }) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 5H5a3 3 0 0 0 3 4M16 5h3a3 3 0 0 1-3 4" />
      <path d="M12 13v3M9 20h6M10 17h4v3h-4z" />
    </svg>
  );
}
export function DownloadIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 19h16" />
    </svg>
  );
}
export function ArrowRightIcon(props) {
  return (
    <svg aria-hidden="true" focusable="false" {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

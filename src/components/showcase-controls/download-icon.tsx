import type { IconComponentProps } from "./lib/icon-types";

export function DownloadIcon({ size = 16, className }: IconComponentProps) {
  return (
    <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24">
      <path fill="currentColor" d="M21 20a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2zM12 2a1 1 0 0 1 1 1v10.586l5.293-5.293a1 1 0 1 1 1.414 1.414l-7 7a1 1 0 0 1-1.414 0l-7-7a1 1 0 1 1 1.414-1.414L11 13.586V3a1 1 0 0 1 1-1" />
    </svg>
  );
}

/*
 * SAYKIND: a tiny stand-in for the two @hugeicons packages that several React Bits components import. It keeps the same
 * shape as Hugeicons data (an array of [tag, attributes]) so the vendored components stay exactly as published, without a
 * large icon dependency. Only the icons the app actually shows are drawn carefully; the demo-only ones fall back to a dot.
 */
import type { SVGProps } from "react";

export type IconSvgElement = readonly (readonly [string, Record<string, string | number>])[];

const path = (d: string): IconSvgElement => [["path", { d, key: "0" }]];

export const Tick02Icon = path("M5 14.5C5 14.5 6.5 14.5 8.5 18C8.5 18 14.0588 8.83333 19 7");
export const ArrowLeft01Icon = path("M15 6L9 12L15 18");
export const ArrowRight01Icon = path("M9 6L15 12L9 18");
export const Mic01Icon: IconSvgElement = [
  ["rect", { x: 9, y: 2.5, width: 6, height: 12, rx: 3, key: "0" }],
  ["path", { d: "M5 11.5a7 7 0 0 0 14 0", key: "1" }],
  ["path", { d: "M12 18.5v3", key: "2" }],
];
export const Layers01Icon: IconSvgElement = [
  ["path", { d: "M12 3l9 5-9 5-9-5 9-5z", key: "0" }],
  ["path", { d: "M3 13l9 5 9-5", key: "1" }],
];
export const Drag04Icon: IconSvgElement = [
  ["path", { d: "M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01", key: "0" }],
];
export const Timer02Icon: IconSvgElement = [
  ["circle", { cx: 12, cy: 13.5, r: 7.5, key: "0" }],
  ["path", { d: "M12 10v3.5l2 1.5M9.5 3h5", key: "1" }],
];
export const SparklesIcon: IconSvgElement = [
  ["path", { d: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z", key: "0" }],
];
const dot: IconSvgElement = [["circle", { cx: 12, cy: 12, r: 2.5, key: "0" }]];
export const Image01Icon = dot;
export const CommandIcon = dot;
export const FigmaIcon = dot;
export const File01Icon = dot;
export const FileZipIcon = dot;
export const Folder01Icon = dot;
export const MusicNote01Icon = dot;
export const Note01Icon = dot;
export const Pdf01Icon = dot;
export const Presentation01Icon = dot;
export const Table01Icon = dot;
export const Video01Icon = dot;
export const CodeIcon = dot;
export const GitBranchIcon = dot;
export const GithubIcon = dot;
export const SlackIcon = dot;
export const NotionIcon = dot;
export const Key01Icon = dot;
export const FingerPrintIcon = dot;

type Props = { icon: IconSvgElement; size?: number; strokeWidth?: number; color?: string } & Omit<SVGProps<SVGSVGElement>, "color">;

export function HugeiconsIcon({ icon, size = 24, strokeWidth = 1.5, color = "currentColor", ...rest }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {icon.map(([tag, { key, ...attrs }]) => {
        const Tag = tag as "path";
        return <Tag key={String(key)} {...attrs} />;
      })}
    </svg>
  );
}

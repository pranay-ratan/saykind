"use client";

import type { ReactNode, RefObject } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { BackIcon, MicIcon, StopIcon } from "@/components/cafe/icons";
import { tap } from "@/lib/haptics";
import { color, font, safe } from "./theme";

/**
 * TEMPORARY building blocks (buttons, text, panels, the microphone button). Presentation only: swap for the team's
 * React Bits / design-system components. Nothing in lib/saykind depends on this file.
 */

/* ------------------------------------------------------------------ text */

export function Heading({ children, size = 28, style, role = "heading", tone = color.ink, numberOfLines }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle>; role?: string; tone?: string; numberOfLines?: number }) {
  return (
    <Text role={role} numberOfLines={numberOfLines} style={[{ fontFamily: font.ui, fontWeight: "800", fontSize: size, lineHeight: size * 1.18, color: tone, letterSpacing: -0.3 }, style]}>
      {children}
    </Text>
  );
}

export function Body({ children, size = 17, tone = color.inkSoft, weight = "400", style, role }: { children: ReactNode; size?: number; tone?: string; weight?: "400" | "500" | "700"; style?: StyleProp<TextStyle>; role?: string }) {
  return (
    <Text role={role} style={[{ fontFamily: font.ui, fontSize: size, lineHeight: size * 1.45, color: tone, fontWeight: weight }, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, tone = color.inkMuted, style }: { children: ReactNode; tone?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: font.ui, fontSize: 13, fontWeight: "700", letterSpacing: 1, color: tone, textTransform: "uppercase" }, style]}>{children}</Text>;
}

/* --------------------------------------------------------------- buttons */

const pressed = (down: boolean): ViewStyle => ({ transform: [{ scale: down ? 0.97 : 1 }], opacity: down ? 0.92 : 1, transitionProperty: "transform, opacity", transitionDuration: "120ms" }) as ViewStyle;

export function Button({
  label,
  onPress,
  kind = "primary",
  icon,
  disabled,
  hint,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "danger";
  icon?: ReactNode;
  disabled?: boolean;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const text = kind === "primary" ? color.onPrimary : kind === "danger" ? color.danger : color.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed: down }) => [styles.button, kind === "primary" && styles.primary, kind === "secondary" && styles.secondary, kind === "danger" && styles.danger, disabled ? { opacity: 0.45 } : null, pressed(down && !disabled), style]}
    >
      {icon ? <View style={{ color: text } as ViewStyle}>{icon}</View> : null}
      <Text style={{ fontFamily: font.ui, fontSize: 18, fontWeight: "700", color: text }}>{label}</Text>
    </Pressable>
  );
}

/** A round icon button with an optional caption underneath (Listen, Slowly). */
export function IconButton({
  label,
  caption,
  onPress,
  children,
  size = 64,
  active,
  tone = "soft",
  disabled,
}: {
  label: string;
  caption?: string;
  onPress: () => void;
  children: ReactNode;
  size?: number;
  active?: boolean;
  tone?: "soft" | "primary" | "plain";
  disabled?: boolean;
}) {
  const bg = tone === "primary" ? color.primary : active ? color.primarySoft : color.bg;
  const fg = tone === "primary" ? color.onPrimary : color.ink;
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: !!active, disabled: !!disabled }}
        disabled={disabled}
        onPress={() => {
          tap();
          onPress();
        }}
        style={({ pressed: down }) => [{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: bg, borderWidth: 2, borderColor: tone === "primary" ? color.primary : active ? color.primary : color.line, opacity: disabled ? 0.45 : 1, color: fg } as ViewStyle, tone === "plain" && { borderColor: "transparent", backgroundColor: "transparent" }, pressed(down)]}
      >
        {children}
      </Pressable>
      {caption ? <Text style={{ fontFamily: font.ui, fontSize: 14, fontWeight: "700", color: color.inkSoft }}>{caption}</Text> : null}
    </View>
  );
}

export function Chip({ label, onPress, selected, icon, hint, style }: { label: string; onPress: () => void; selected?: boolean; icon?: ReactNode; hint?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        tap(6);
        onPress();
      }}
      style={({ pressed: down }) => [styles.chip, selected ? styles.chipOn : null, pressed(down), style]}
    >
      {icon ? <View style={{ color: selected ? color.primaryDark : color.ink } as ViewStyle}>{icon}</View> : null}
      <Text numberOfLines={1} style={{ fontFamily: font.ui, fontSize: 16, fontWeight: "700", color: selected ? color.primaryDark : color.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TextLink({ label, onPress, tone = color.inkSoft }: { label: string; onPress: () => void; tone?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed: down }) => [{ minHeight: 48, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", alignSelf: "center" }, pressed(down)]}>
      <Text style={{ fontFamily: font.ui, fontSize: 16, fontWeight: "700", color: tone, textDecorationLine: "underline" }}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------ furniture */

export function Panel({ children, style, tone = "plain" }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: "plain" | "note" }) {
  return <View style={[{ borderRadius: 20, borderWidth: 1, borderColor: tone === "note" ? "#F0CFA8" : color.line, backgroundColor: tone === "note" ? color.accentSoft : color.surface, padding: 16, gap: 10 }, style]}>{children}</View>;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <View role="progressbar" accessibilityLabel={label} style={{ flex: 1, height: 14, borderRadius: 7, backgroundColor: color.surfaceStrong, overflow: "hidden" }}>
      <View style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, height: "100%", borderRadius: 7, backgroundColor: color.primary, transitionProperty: "width", transitionDuration: "400ms" } as ViewStyle} />
    </View>
  );
}

export function ScreenHeader({ title, onBack, right, eyebrow }: { title: string; onBack: () => void; right?: ReactNode; eyebrow?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: `calc(${safe.top} + 12px)`, paddingBottom: 8 } as ViewStyle}>
      <IconButton label="Back" onPress={onBack} size={48}>
        <BackIcon className="size-6" />
      </IconButton>
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? <Label>{eyebrow}</Label> : null}
        <Heading size={24} numberOfLines={1}>
          {title}
        </Heading>
      </View>
      {right}
    </View>
  );
}

/** A plain white screen. */
export function Screen({ children }: { children: ReactNode }) {
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: color.bg }]}>{children}</View>;
}

/* ---------------------------------------------------------- microphone */

export type MicVisual = "ready" | "recording" | "processing" | "waiting";

/**
 * The microphone button. Four states, told apart by more than colour: ready (mic), recording (stop square and a ring that
 * swells with the voice), processing (a turning ring) and waiting (grey, for when someone else is speaking).
 * `levelRef` receives the live voice level as the CSS variable --level (0 to 1) from the recorder.
 */
export function MicButton({ state, onPress, levelRef, busy, size = 96 }: { state: MicVisual; onPress: () => void; levelRef: RefObject<HTMLDivElement | null>; busy?: boolean; size?: number }) {
  const disabled = state === "processing" || state === "waiting" || !!busy;
  const bg = state === "waiting" || state === "processing" ? color.surfaceStrong : state === "recording" ? color.danger : color.primary;
  const fg = state === "waiting" || state === "processing" ? color.inkMuted : color.onPrimary;
  const label = { ready: "Tap to speak", recording: "Finish speaking", processing: "Working on it", waiting: "Microphone is off while someone is speaking" }[state];
  return (
    <View ref={levelRef as never} style={{ width: size + 36, height: size + 36, alignItems: "center", justifyContent: "center" }}>
      {state === "recording" ? (
        <View pointerEvents="none" style={{ position: "absolute", width: size + 20, height: size + 20, borderRadius: (size + 20) / 2, borderWidth: 4, borderColor: "rgba(179,38,30,0.35)", transform: "scale(calc(0.92 + var(--level, 0) * 0.3))", transitionProperty: "transform", transitionDuration: "90ms" } as ViewStyle} />
      ) : null}
      {state === "processing" ? <View dataSet={{ skSpin: "on" }} pointerEvents="none" style={{ position: "absolute", width: size + 14, height: size + 14, borderRadius: (size + 14) / 2, borderWidth: 4, borderColor: "transparent", borderTopColor: color.primary }} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={busy ? "Allow the microphone" : label}
        accessibilityState={{ disabled, busy: state === "processing" || !!busy }}
        disabled={disabled}
        onPress={() => {
          tap(state === "recording" ? 8 : 14);
          onPress();
        }}
        style={({ pressed: down }) => [{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", color: fg } as ViewStyle, pressed(down && !disabled)]}
      >
        {state === "recording" ? <StopIcon className="size-10" /> : <MicIcon className="size-10" />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 58, borderRadius: 29, paddingHorizontal: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, alignSelf: "center" },
  primary: { backgroundColor: color.primary },
  secondary: { backgroundColor: color.bg, borderWidth: 2, borderColor: color.line },
  danger: { backgroundColor: color.dangerSoft, borderWidth: 2, borderColor: color.danger },
  chip: { minHeight: 48, paddingHorizontal: 18, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: color.bg, borderWidth: 2, borderColor: color.line },
  chipOn: { backgroundColor: color.primarySoft, borderColor: color.primary },
});

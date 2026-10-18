"use client";

import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { CheckIcon, CloseIcon, GearIcon, ShieldIcon } from "@/components/cafe/icons";
import { tap } from "@/lib/haptics";
import { Body, Heading, IconButton, Label } from "./kit";
import { color, font, safe } from "./theme";

export type LevelId = 1 | 2 | 3 | 4;

export const LEVELS: { id: LevelId; title: string; blurb: string; tag?: string }[] = [
  { id: 1, title: "Learn Objects", blurb: "See it, hear it, say it" },
  { id: 2, title: "Discover Objects", blurb: "Photograph something real", tag: "Preview" },
  { id: 3, title: "At the Café", blurb: "Order from the barista" },
  { id: 4, title: "In the Real World", blurb: "Phrases to use and play aloud" },
];

/**
 * TEMPORARY navigation menu. Opening or closing it never changes anything: exercise progress lives in the controllers,
 * not here. Replace freely.
 */
export default function LevelMenu({ open, current, onSelect, onClose, onSettings, onCaregiverView }: { open: boolean; current: LevelId; onSelect: (id: LevelId) => void; onClose: () => void; onSettings: () => void; onCaregiverView: () => void }) {
  return (
    <View pointerEvents={open ? "auto" : "none"} style={[StyleSheet.absoluteFill, { zIndex: 60 }]} role="dialog" aria-label="Menu" aria-modal={open}>
      <Pressable accessibilityLabel="Close menu" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(27,36,48,0.4)", opacity: open ? 1 : 0, transitionProperty: "opacity", transitionDuration: "200ms" } as ViewStyle]} />
      <View
        style={
          {
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: "86%",
            maxWidth: 360,
            backgroundColor: color.bg,
            paddingTop: `calc(${safe.top} + 14px)`,
            paddingBottom: `calc(${safe.bottom} + 16px)`,
            paddingHorizontal: 16,
            gap: 6,
            transform: [{ translateX: open ? 0 : -380 }],
            visibility: open ? "visible" : "hidden",
            transitionProperty: "transform, visibility",
            transitionDuration: open ? "260ms, 0s" : "220ms, 0s",
            transitionDelay: open ? "0s" : "0s, 220ms",
            boxShadow: "0 0 40px rgba(27,36,48,0.2)",
          } as ViewStyle
        }
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Heading size={26}>Saykind</Heading>
          <IconButton label="Close menu" onPress={onClose} size={44}>
            <CloseIcon className="size-5" />
          </IconButton>
        </View>
        <Label>Levels</Label>
        {LEVELS.map((level) => {
          const active = level.id === current;
          return (
            <Pressable
              key={level.id}
              accessibilityRole="button"
              accessibilityLabel={`Level ${level.id}: ${level.title}${level.tag ? ` (${level.tag})` : ""}`}
              accessibilityState={{ selected: active }}
              onPress={() => {
                tap();
                onSelect(level.id);
              }}
              style={({ pressed }) => [styles.row, active && styles.rowActive, pressed ? { opacity: 0.85 } : null]}
            >
              <View style={[styles.num, active && { backgroundColor: color.primary }]}>
                <Text style={{ fontFamily: font.ui, fontSize: 17, fontWeight: "800", color: active ? color.onPrimary : color.inkSoft }}>{level.id}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: font.ui, fontSize: 18, fontWeight: "800", color: color.ink }}>
                  {level.title}
                  {level.tag ? <Text style={{ color: color.accent, fontSize: 13 }}>{`  ${level.tag.toUpperCase()}`}</Text> : null}
                </Text>
                <Body size={14}>{level.blurb}</Body>
              </View>
              {active ? (
                <View style={{ color: color.primary } as ViewStyle}>
                  <CheckIcon className="size-5" />
                </View>
              ) : null}
            </Pressable>
          );
        })}
        <View style={{ height: 1, backgroundColor: color.line, marginVertical: 10 }} />
        <MenuLink label="Settings and sharing" icon={<GearIcon className="size-5" />} onPress={onSettings} />
        <MenuLink label="Caregiver view" icon={<ShieldIcon className="size-5" />} onPress={onCaregiverView} />
      </View>
    </View>
  );
}

function MenuLink({ label, icon, onPress }: { label: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.link, pressed ? { opacity: 0.85 } : null]}>
      <View style={{ color: color.inkSoft } as ViewStyle}>{icon}</View>
      <Text style={{ fontFamily: font.ui, fontSize: 17, fontWeight: "700", color: color.ink }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 14, padding: 10, borderRadius: 18, borderWidth: 2, borderColor: "transparent" },
  rowActive: { backgroundColor: color.primarySoft, borderColor: color.primary },
  num: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.surfaceStrong, alignItems: "center", justifyContent: "center" },
  link: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, borderRadius: 14 },
});

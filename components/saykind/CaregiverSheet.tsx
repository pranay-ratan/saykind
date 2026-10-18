"use client";

import dynamic from "next/dynamic";
import { Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from "react-native";
import { CloseIcon, CopyIcon, PhoneIcon, ShareIcon } from "@/components/cafe/icons";
import type { useCaregiverContact } from "@/lib/saykind";
import { Body, Button, Chip, Heading, IconButton, Label } from "./kit";
import { useReducedMotion } from "@/lib/use-presence";
import { color, font, safe } from "./theme";

// Loaded only in the browser. It is the only animation on this sheet, and it is off under reduced motion.
const Orb = dynamic(() => import("@/components/reactbits/Orb"), { ssr: false });

/**
 * TEMPORARY contact-caregiver sheet, bound to useCaregiverContact(). The person sees the message and can edit or ignore
 * it before anything leaves the app; the app only hands a call or a message to the phone and never claims delivery.
 */
export default function CaregiverSheet({ open, onClose, contact, onSettings }: { open: boolean; onClose: () => void; contact: ReturnType<typeof useCaregiverContact>; onSettings: () => void }) {
  const { caregiver } = contact;
  const reduced = useReducedMotion();
  return (
    <View pointerEvents={open ? "auto" : "none"} style={[StyleSheet.absoluteFill, { zIndex: 50 }]} role="dialog" aria-label="Get help from my caregiver" aria-modal={open}>
      {open ? (
        <View aria-hidden pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: "55%", opacity: 0.6 } as ViewStyle}>
          {reduced ? (
            <View style={{ flex: 1, backgroundImage: "radial-gradient(60% 60% at 80% 20%, rgba(191,165,212,0.55), transparent 70%), radial-gradient(60% 60% at 20% 80%, rgba(244,194,166,0.55), transparent 70%), radial-gradient(40% 40% at 50% 50%, rgba(61,139,136,0.25), transparent 70%)" } as ViewStyle} />
          ) : (
            <Orb colors={["#BFA5D4", "#F4C2A6", "#3D8B88"]} speed={0.25} hoverIntensity={0} rotateOnHover={false} forceHoverState={false} followCursor={false} />
          )}
        </View>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(27,36,48,0.4)", opacity: open ? 1 : 0, transitionProperty: "opacity", transitionDuration: "200ms" } as ViewStyle]} />
      <View
        style={
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: "92%",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: color.bg,
            padding: 20,
            paddingBottom: `max(20px, ${safe.bottom})`,
            gap: 14,
            overflowY: "auto",
            visibility: open ? "visible" : "hidden",
            transform: [{ translateY: open ? 0 : 60 }],
            opacity: open ? 1 : 0,
            transitionProperty: "opacity, transform, visibility",
            transitionDuration: open ? "260ms, 300ms, 0s" : "160ms, 200ms, 0s",
            transitionDelay: open ? "0s" : "0s, 0s, 200ms",
            boxShadow: "0 -8px 40px rgba(27,36,48,0.2)",
          } as ViewStyle
        }
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Heading size={26}>Need a hand?</Heading>
          <IconButton label="Close" onPress={onClose} size={44}>
            <CloseIcon className="size-5" />
          </IconButton>
        </View>

        {caregiver.hasPhone ? (
          <Button label={`Call ${caregiver.name}`} icon={<PhoneIcon className="size-6" />} onPress={contact.callCaregiver} hint="Opens your phone's call screen" style={{ alignSelf: "stretch", minHeight: 80, backgroundColor: color.accent }} />
        ) : (
          <View style={{ gap: 8 }}>
            <Body size={16}>Add a caregiver's phone number once, and this button will start a call to them.</Body>
            <Button label="Add a caregiver's number" kind="secondary" onPress={onSettings} style={{ alignSelf: "stretch" }} />
          </View>
        )}

        <View style={{ gap: 8, marginTop: 4 }}>
          <Label>An optional message</Label>
          <Body size={15}>This is what Saykind would write. Read it, change it, or leave it. Only you decide to send it.</Body>
          <TextInput
            value={contact.summary}
            onChangeText={contact.setSummary}
            multiline
            numberOfLines={5}
            accessibilityLabel="Message to my caregiver"
            style={{ minHeight: 110, borderRadius: 16, borderWidth: 2, borderColor: color.control, backgroundColor: color.surface, color: color.ink, padding: 14, fontFamily: font.ui, fontSize: 20, lineHeight: 24, textAlignVertical: "top" } as never}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip label="Open in Messages" onPress={contact.openMessage} icon={<PhoneIcon className="size-5" />} />
            <Chip label="Share…" onPress={() => void contact.shareSummary()} icon={<ShareIcon className="size-5" />} />
            <Chip label="Copy" onPress={() => void contact.copySummary()} icon={<CopyIcon className="size-5" />} />
          </View>
          <Text aria-live="polite" style={{ fontFamily: font.ui, fontSize: 20, lineHeight: 20, color: contact.note ? color.accent : color.inkMuted, minHeight: 20 }}>
            {contact.note || "Saykind can't send this for you, and can't tell if it arrived. Your own messaging app sends it when you press send."}
          </Text>
        </View>
      </View>
    </View>
  );
}

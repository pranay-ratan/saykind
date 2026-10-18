"use client";

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { CloseIcon, MenuIcon, PhoneIcon, RecordIcon, SnailIcon, SpeakerIcon } from "@/components/cafe/icons";
import { usePhrases, type Phrase } from "@/lib/saykind";
import { useFrame } from "./frame";
import { Body, Button, Heading, IconButton, Label, MicButton, Panel, Screen } from "./kit";
import SessionView from "./SessionView";
import { color, font, safe } from "./theme";

/**
 * TEMPORARY Level 4 screen, bound to usePhrases(): a library of phrases, a large phrase card, a plain "show someone" card
 * that plays the phrase aloud, optional speaking practice, and the entry to the consent-based recording session.
 */
export default function PhrasesView({ onMenu, onCaregiver }: { onMenu: () => void; onCaregiver: () => void }) {
  const p = usePhrases();
  const { width, short } = useFrame();
  const [showing, setShowing] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [session, setSession] = useState(false);

  if (session) return <SessionView onBack={() => setSession(false)} />;

  const phrase = p.selected;

  /* ------------------------------------------------------------ one phrase */
  if (phrase) {
    const size = Math.max(26, Math.min(40, width * 0.095)) - (phrase.text.length > 60 ? 8 : 0);
    const attempt = p.attempt;
    const message = !attempt
      ? "Tap the microphone, say the phrase, and tap again when you're done."
      : attempt.recognition === "matches"
        ? `I heard “${attempt.heard.replace(/[.!?]+$/, "")}”. That matches the phrase. Speech recognition can be wrong, so it's only a guide.`
        : attempt.recognition === "differs"
          ? `I heard “${attempt.heard.replace(/[.!?]+$/, "")}”. That's different from the phrase, but the computer can mishear. Try again whenever you like.`
          : attempt.recognition === "nothing"
            ? "I didn't hear anything. Try again when you're ready."
            : (p.micProblemText ?? "I couldn't check that. You can try again.");
    return (
      <Screen>
        <View style={styles.top}>
          <IconButton label="Back to phrases" onPress={() => { setPracticing(false); p.select(null); }} size={48}>
            <Text style={{ fontFamily: font.ui, fontSize: 24, fontWeight: "800", color: color.ink }}>‹</Text>
          </IconButton>
          <View style={{ flex: 1 }}>
            <Label>Phrase</Label>
            <Heading size={22} numberOfLines={1}>
              {phrase.label}
            </Heading>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 22, paddingBottom: `calc(${safe.bottom} + 28px)`, gap: 20 }}>
          <Heading size={size} style={{ marginTop: short ? 0 : 10 }}>
            {phrase.text}
          </Heading>
          <View style={{ flexDirection: "row", gap: 28, justifyContent: "center" }}>
            <IconButton label="Listen" caption="Listen" size={76} tone="primary" active={p.isPlayingAudio} onPress={() => p.play(phrase)}>
              <SpeakerIcon className="size-8" />
            </IconButton>
            <IconButton label="Hear it slowly" caption="Slowly" size={76} active={p.isPlayingSlowAudio} onPress={() => p.playSlowly(phrase)}>
              <SnailIcon className="size-9" />
            </IconButton>
          </View>
          <Button
            label="Show this to someone"
            kind="secondary"
            hint="Opens a large card and can play the phrase aloud"
            onPress={() => {
              p.showCard(phrase);
              setShowing(true);
            }}
          />
          <Panel>
            <Label>Practice</Label>
            {!practicing ? (
              <>
                <Body size={16}>Say the phrase yourself, as often as you like. Nothing is timed or graded.</Body>
                <Button label="Practice saying it" kind="secondary" onPress={() => setPracticing(true)} style={{ alignSelf: "stretch" }} />
              </>
            ) : (
              <View style={{ alignItems: "center", gap: 6 }}>
                <MicButton state={p.isRecording ? "recording" : p.isProcessing ? "processing" : "ready"} levelRef={p.micLevelRef} busy={p.isRequestingMic} size={84} onPress={() => p.toggleRecording(phrase)} />
                <Text aria-live="polite" style={{ fontFamily: font.ui, fontSize: 20, lineHeight: 23, color: color.inkSoft, textAlign: "center", minHeight: 64 }}>
                  {message}
                </Text>
                {attempt ? <Button label="Try again" kind="secondary" onPress={p.retry} style={{ minHeight: 64 }} /> : null}
              </View>
            )}
          </Panel>
        </ScrollView>
        {showing && <ShowCard phrase={phrase} p={p} onClose={() => { p.stopAudio(); setShowing(false); }} />}
      </Screen>
    );
  }

  /* --------------------------------------------------------------- library */
  return (
    <Screen>
      <View style={styles.top}>
        <IconButton label="Open menu" onPress={onMenu} size={48}>
          <MenuIcon className="size-6" />
        </IconButton>
        <View style={{ flex: 1 }}>
          <Label>Level 4</Label>
          <Heading size={24}>In the Real World</Heading>
        </View>
        <IconButton label="Call or message my caregiver" onPress={onCaregiver} size={48}>
          <PhoneIcon className="size-6" />
        </IconButton>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: `calc(${safe.bottom} + 32px)`, gap: 22 }}>
        <Panel>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ color: color.danger } as ViewStyle}>
              <RecordIcon className="size-7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.ui, fontWeight: "800", fontSize: 20, color: color.ink }}>Practice session</Text>
              <Body size={15}>Record a real conversation, only if everyone agrees. You start it and you stop it.</Body>
            </View>
          </View>
          <Button label="Set up a recording" kind="secondary" onPress={() => setSession(true)} style={{ alignSelf: "stretch" }} />
        </Panel>

        {p.groups.map(({ group, phrases }) => (
          <View key={group} style={{ gap: 4 }}>
            <Label>{group}</Label>
            {phrases.map((item, i) => (
              <View key={item.id} style={[styles.row, i === 0 ? { borderTopWidth: 1 } : null]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${item.label}: ${item.text}. Open card.`} onPress={() => p.select(item.id)} style={{ flex: 1, minHeight: 64, justifyContent: "center", gap: 2 }}>
                  <Text style={{ fontFamily: font.ui, fontWeight: "800", fontSize: 20, color: color.ink }}>{item.label}</Text>
                  <Text numberOfLines={2} style={{ fontFamily: font.ui, fontSize: 20, lineHeight: 21, color: color.inkSoft }}>
                    {item.text}
                  </Text>
                </Pressable>
                <IconButton label={`Hear: ${item.label}`} onPress={() => p.play(item)} size={48}>
                  <SpeakerIcon className="size-6" />
                </IconButton>
                <IconButton label={`Hear slowly: ${item.label}`} onPress={() => p.playSlowly(item)} size={48}>
                  <SnailIcon className="size-7" />
                </IconButton>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

/** A plain, high-contrast card to hold up or play aloud for another person. */
function ShowCard({ phrase, p, onClose }: { phrase: Phrase; p: ReturnType<typeof usePhrases>; onClose: () => void }) {
  const { width } = useFrame();
  const size = Math.max(32, Math.min(50, width * 0.12)) - (phrase.text.length > 60 ? 12 : 0);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: color.bg, zIndex: 40, paddingTop: `calc(${safe.top} + 12px)`, paddingBottom: `calc(${safe.bottom} + 22px)`, paddingHorizontal: 22 } as ViewStyle]} role="dialog" aria-modal aria-label="Phrase to show someone">
      <View style={{ alignItems: "flex-end" }}>
        <IconButton label="Close" onPress={onClose} size={48}>
          <CloseIcon className="size-5" />
        </IconButton>
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 26 }}>
        <Label>I'd like to say</Label>
        <Text style={{ fontFamily: font.ui, fontWeight: "800", fontSize: size, lineHeight: size * 1.18, letterSpacing: -size * 0.02, color: color.ink, textAlign: "center", maxWidth: 380 }}>{phrase.text}</Text>
        <View style={{ flexDirection: "row", gap: 24 }}>
          <IconButton label="Play aloud" caption={p.isPlayingAudio ? "Playing…" : "Play aloud"} size={84} tone="primary" onPress={() => p.playAloud(phrase)}>
            <SpeakerIcon className="size-9" />
          </IconButton>
          <IconButton label="Play aloud, slowly" caption="Slowly" size={84} active={p.isPlayingSlowAudio} onPress={() => p.playAloud(phrase, true)}>
            <SnailIcon className="size-10" />
          </IconButton>
        </View>
        <Body size={15} style={{ textAlign: "center", maxWidth: 300 }}>
          Turn the volume up and hold the phone near them. The phrase plays from this phone's speaker.
        </Body>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingBottom: 8, paddingTop: `calc(${safe.top} + 12px)` } as never,
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: color.line },
});

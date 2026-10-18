"use client";

import { ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { MenuIcon, PhoneIcon, SnailIcon, SpeakerIcon } from "@/components/cafe/icons";
import type { ExerciseController } from "@/lib/saykind";
import SubjectArt from "./Art";
import { useFrame } from "./frame";
import { Body, Button, Chip, Heading, IconButton, MicButton, Panel, ProgressBar, Screen, TextLink, type MicVisual } from "./kit";
import { color, font, safe } from "./theme";

/**
 * TEMPORARY exercise screen (Level 1, and Level 2 once an object has been received). It is pure presentation: every
 * value comes from an ExerciseController and every button calls one of its functions. The UI team can replace this whole
 * file; nothing else depends on it.
 */
export default function ExerciseView({
  exercise: x,
  onMenu,
  onCaregiver,
  instruction = "Listen, then say the word",
}: {
  exercise: ExerciseController;
  onMenu: () => void;
  onCaregiver: () => void;
  instruction?: string;
}) {
  const { width, height, short } = useFrame();
  const feedback = x.latestFeedback;
  const mic: MicVisual = x.isRecording ? "recording" : x.isProcessing ? "processing" : "ready";
  // With a result on screen the picture steps back so the result is never pushed out of view.
  const base = Math.max(130, Math.min(width * 0.62, 280, height * (short ? 0.24 : 0.3)));
  const pic = Math.round(feedback ? base * 0.56 : base);
  const word = x.currentWord;

  const status = x.isRecording ? "Recording. Tap the square when you're done." : x.isProcessing ? "One moment…" : x.isRequestingMic ? "Please allow the microphone." : "Tap the microphone and say the word.";

  return (
    <Screen>
      {/* top bar: menu, progress, caregiver */}
      <View style={[styles.top, { paddingTop: `calc(${safe.top} + 12px)` } as ViewStyle]}>
        <IconButton label="Open menu" onPress={onMenu} size={48}>
          <MenuIcon className="size-6" />
        </IconButton>
        <ProgressBar value={x.progress} label={`Word ${x.currentExerciseIndex + 1} of ${x.total}`} />
        <IconButton label="Call or message my caregiver" onPress={onCaregiver} size={48}>
          <PhoneIcon className="size-6" />
        </IconButton>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: "center", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, gap: 14 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.instruction} aria-live="polite">
          {instruction}
        </Text>

        <View style={[styles.pictureCard, { width: pic + 36, height: pic + 36 }]}>
          <View style={{ width: pic, height: pic }}>
            <SubjectArt item={word} />
          </View>
        </View>

        <View style={{ alignItems: "center", gap: 2 }}>
          <Heading size={Math.min(52, width * 0.14)} role="heading" style={{ textAlign: "center" }}>
            {word.text}
          </Heading>
          <Text style={styles.syllables} aria-label={`Syllables: ${x.pronunciation.syllables.join(", ")}`}>
            {x.pronunciation.syllables.map((syllable, i) => (i === x.pronunciation.stressed ? syllable.toUpperCase() : syllable)).join(" · ")}
          </Text>
        </View>

        {/* what happened */}
        {feedback ? (
          <Panel tone={feedback.kind === "heard-match" ? "plain" : "note"} style={{ alignSelf: "stretch", maxWidth: 420, borderColor: feedback.kind === "heard-match" ? color.primary : undefined }}>
            <Heading size={22} role="status">
              {feedback.title}
            </Heading>
            <Body size={17} tone={color.ink}>
              {feedback.detail}
            </Body>
            {feedback.caveat ? <Body size={14}>{feedback.caveat}</Body> : null}
          </Panel>
        ) : null}
        {/* hear it */}
        <View style={styles.audioRow}>
          <IconButton label={`Hear ${word.text}`} caption="Listen" onPress={x.playPronunciation} size={72} active={x.isPlayingAudio} tone="primary">
            <SpeakerIcon className="size-8" />
          </IconButton>
          <IconButton label="Hear it slowly" caption="Slowly" onPress={x.playSlowPronunciation} size={72} active={x.isPlayingSlowAudio}>
            <SnailIcon className="size-9" />
          </IconButton>
        </View>

        {/* optional help */}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center", display: feedback ? "none" : "flex" }}>
          <Chip label="Syllables" selected={x.syllablesShown} onPress={x.toggleSyllables} hint="Shows how the word breaks into parts" />
          <Chip label="First sound" selected={x.firstSoundShown} onPress={x.toggleFirstSound} hint="Shows how the word starts" />
        </View>
        {!feedback && (x.syllablesShown || x.firstSoundShown) ? (
          <Panel style={{ alignSelf: "stretch", maxWidth: 420 }}>
            {x.syllablesShown ? (
              <Body size={17} tone={color.ink}>
                <Text style={{ fontWeight: "800" }}>Parts: </Text>
                {x.pronunciation.syllables.join(" · ")}
                {x.pronunciation.ipa ? `   ${x.pronunciation.ipa}` : ""}
              </Body>
            ) : null}
            {x.firstSoundShown ? (
              <Body size={17} tone={color.ink}>
                <Text style={{ fontWeight: "800" }}>It starts with: </Text>“{x.pronunciation.startsWith}…”
              </Body>
            ) : null}
          </Panel>
        ) : null}

      </ScrollView>

      {/* the bottom bar: the microphone, or what to do next */}
      <View style={[styles.bottom, { paddingBottom: `calc(${safe.bottom} + 14px)` } as ViewStyle]}>
        {feedback ? (
          <View style={{ gap: 10, alignSelf: "stretch", alignItems: "center" }}>
            <Button label={x.isLast ? "Finish" : "Continue"} onPress={x.continueToNextWord} style={{ alignSelf: "stretch" }} />
            <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
              <Button label="Try again" kind="secondary" onPress={x.retryWord} style={{ minHeight: 50, flex: 1, paddingHorizontal: 12 }} />
              {feedback.canConfirm ? <Button label="That's what I said" kind="secondary" onPress={x.confirmHeard} style={{ minHeight: 50, flex: 1, paddingHorizontal: 12 }} hint="You know best. This moves on and is noted." /> : null}
            </View>
          </View>
        ) : (
          <View style={{ alignItems: "center", gap: 2 }}>
            <MicButton state={mic} onPress={() => void x.toggleRecording()} levelRef={x.micLevelRef} busy={x.isRequestingMic} size={short ? 76 : 92} />
            <Text style={styles.status} aria-live="polite">
              {status}
            </Text>
            {!x.isRecording && !x.isProcessing ? <TextLink label={x.isLast ? "Skip, finish" : "Skip this word"} onPress={x.skipWord} /> : null}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingBottom: 8 },
  instruction: { fontFamily: font.ui, fontSize: 18, fontWeight: "700", color: color.inkSoft, textAlign: "center" },
  pictureCard: { borderRadius: 28, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, alignItems: "center", justifyContent: "center" },
  syllables: { fontFamily: font.ui, fontSize: 20, fontWeight: "600", letterSpacing: 1, color: color.inkMuted, textAlign: "center" },
  audioRow: { flexDirection: "row", gap: 28, alignItems: "flex-start", justifyContent: "center", marginTop: 4 },
  bottom: { paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1, borderColor: color.line, backgroundColor: color.bg, alignItems: "center" },
  status: { fontFamily: font.ui, fontSize: 16, fontWeight: "500", color: color.inkSoft, textAlign: "center", marginTop: -2, minHeight: 22 },
});

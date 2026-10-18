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
 *
 * Three rows: the header, a content area that scrolls if it must, and the microphone panel pinned flush to the bottom.
 * The picture is capped by the viewport height so the word, the syllables and the speaker and snail buttons sit above
 * the panel without scrolling on a 390 x 844 phone (a small scroll at 375 x 667).
 */
const PICTURE_SIZE = "clamp(150px, 26dvh, 300px)";
const MIC_SIZE = 96;

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
  const { width } = useFrame();
  const feedback = x.latestFeedback;
  const mic: MicVisual = x.isRecording ? "recording" : x.isProcessing ? "processing" : "ready";
  const word = x.currentWord;
  const skipHidden = x.isRecording || x.isProcessing;

  const status = x.isRecording ? "Tap the square when you're done." : x.isProcessing ? "One moment…" : x.isRequestingMic ? "Please allow the microphone." : "Tap the mic and say the word.";

  return (
    <Screen>
      <View style={styles.column}>
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

        {/* the content: scrolls only if it must, and never behind the panel */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
          <Text style={styles.instruction} aria-live="polite">
            {instruction}
          </Text>

          <div data-testid="picture" style={{ width: feedback ? `calc(${PICTURE_SIZE} * 0.56)` : PICTURE_SIZE, aspectRatio: "1", flex: "none", boxSizing: "border-box", padding: 18, borderRadius: 28, background: color.surface, border: `1px solid ${color.line}`, display: "grid", placeItems: "center", transition: "width 300ms" }}>
            <div style={{ width: "100%", height: "100%" }}>
              <SubjectArt item={word} />
            </div>
          </div>

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

        {/* the bottom panel: the microphone, or what to do next. Flush with the bottom; the padding clears the home indicator once. */}
        <View dataSet={{ testid: "bottom-panel" }} style={[styles.bottom, { paddingBottom: `max(16px, ${safe.bottom})` } as ViewStyle]}>
          {feedback ? (
            <View style={{ gap: 10, alignSelf: "stretch", alignItems: "center" }}>
              <Button label={x.isLast ? "Finish" : "Continue"} onPress={x.continueToNextWord} style={{ alignSelf: "stretch" }} />
              <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
                <Button label="Again" kind="secondary" onPress={x.retryWord} style={{ minHeight: 64, flex: 1, paddingHorizontal: 12 }} />
                {feedback.canConfirm ? <Button label="That's what I said" kind="secondary" onPress={x.confirmHeard} style={{ minHeight: 64, flex: 1, paddingHorizontal: 12 }} hint="You know best. This moves on and is noted." /> : null}
              </View>
            </View>
          ) : (
            <View style={{ alignSelf: "stretch", alignItems: "center", gap: 2 }}>
              <Text style={styles.status} aria-live="polite">
                {status}
              </Text>
              <View style={styles.micRow}>
                <View style={[styles.micSide, { alignItems: "flex-start", opacity: skipHidden ? 0 : 1 }]} pointerEvents={skipHidden ? "none" : "auto"}>
                  <TextLink label={x.isLast ? "Skip, finish" : "Skip"} onPress={x.skipWord} />
                </View>
                <MicButton state={mic} onPress={() => void x.toggleRecording()} levelRef={x.micLevelRef} busy={x.isRequestingMic} size={MIC_SIZE} />
                <View style={styles.micSide} />
              </View>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1, flexDirection: "column", minHeight: 0 },
  top: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingBottom: 8, flexShrink: 0 },
  content: { flex: 1, minHeight: 0, overscrollBehavior: "contain" } as ViewStyle,
  contentInner: { alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 },
  instruction: { fontFamily: font.ui, fontSize: 20, fontWeight: "700", color: color.inkSoft, textAlign: "center" },
  syllables: { fontFamily: font.ui, fontSize: 20, fontWeight: "600", letterSpacing: 1, color: color.inkMuted, textAlign: "center" },
  audioRow: { flexDirection: "row", gap: 28, alignItems: "flex-start", justifyContent: "center" },
  bottom: { flexShrink: 0, paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1, borderColor: color.line, backgroundColor: color.bg, alignItems: "center" },
  status: { fontFamily: font.ui, fontSize: 20, fontWeight: "500", color: color.inkSoft, textAlign: "center", minHeight: 22 },
  micRow: { flexDirection: "row", alignItems: "center", alignSelf: "stretch" },
  micSide: { flex: 1, minWidth: 0 },
});

"use client";

import { useEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { CameraIcon } from "@/components/cafe/icons";
import { hasRecognizer, OBJECTS, recognizeObject, type RecognitionResult, useDiscovery } from "@/lib/saykind";
import ExerciseView from "./ExerciseView";
import { useFrame } from "./frame";
import { LensArt } from "./ObjectArt";
import { Body, Button, Chip, Heading, IconButton, Label, Panel, Screen, TextLink } from "./kit";
import { color, font, safe } from "./theme";

type Phase =
  | { name: "intro"; problem?: string }
  | { name: "live" }
  | { name: "checking"; photo: string }
  | { name: "confirm"; photo: string; label: string; syllables?: string[]; confidence?: number; alternatives: string[] }
  | { name: "choose"; photo: string; note: string };

const CAMERA_PROBLEMS: Record<string, string> = {
  denied: "The camera is off for this site. You can allow it in your browser settings, then try again.",
  "no-device": "No camera was found on this device.",
  insecure: "The camera needs a secure (https) page.",
  busy: "Another app is using the camera. Close it and try again.",
  unsupported: "This browser can't open the camera.",
  failed: "The camera couldn't start. Please try again.",
};

function problemFrom(error: unknown): keyof typeof CAMERA_PROBLEMS {
  switch (error instanceof DOMException ? error.name : "") {
    case "NotAllowedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "OverconstrainedError":
      return "no-device";
    case "NotReadableError":
    case "AbortError":
      return "busy";
    default:
      return "failed";
  }
}

/**
 * TEMPORARY Level 2 screen: the camera, then the hand-off. This screen does NOT recognise anything. It takes one still when
 * the person presses the shutter, offers it to the registered recogniser (lib/saykind/discover.ts), lets the person confirm
 * or correct the result, and passes {image, label, confidence, correctedLabel} to useDiscovery().receiveDiscovery().
 * After that the practice screen is the Level 1 ExerciseView. See docs/UI_INTEGRATION.md for the camera teammate.
 */
export default function DiscoverView({ discovery, onMenu, onCaregiver }: { discovery: ReturnType<typeof useDiscovery>; onMenu: () => void; onCaregiver: () => void }) {
  const { height, short } = useFrame();
  const [phase, setPhase] = useState<Phase>({ name: "intro" });
  const [typed, setTyped] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const photoRef = useRef<string | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(
    () => () => {
      stopCamera();
      abortRef.current?.abort();
      if (photoRef.current) URL.revokeObjectURL(photoRef.current);
    },
    [],
  );

  useEffect(() => {
    if (phase.name !== "live") return;
    const video = videoRef.current;
    if (video && streamRef.current) {
      video.srcObject = streamRef.current;
      void video.play().catch(() => {});
    }
  }, [phase.name]);

  const openCamera = async () => {
    if (!window.isSecureContext) return setPhase({ name: "intro", problem: CAMERA_PROBLEMS.insecure });
    if (!navigator.mediaDevices?.getUserMedia) return setPhase({ name: "intro", problem: CAMERA_PROBLEMS.unsupported });
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      setPhase({ name: "live" });
    } catch (error) {
      setPhase({ name: "intro", problem: CAMERA_PROBLEMS[problemFrom(error)] });
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, 1024 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    stopCamera();
    if (!blob) return setPhase({ name: "intro", problem: CAMERA_PROBLEMS.failed });

    if (photoRef.current) URL.revokeObjectURL(photoRef.current);
    const photo = URL.createObjectURL(blob);
    photoRef.current = photo;
    setPhase({ name: "checking", photo });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    let result: RecognitionResult;
    try {
      result = await recognizeObject(blob, controller.signal);
    } catch {
      return;
    }
    if (controller.signal.aborted) return;

    if (result.status === "ok") {
      const unsure = (result.confidence ?? 1) < 0.6 || !!result.alternatives?.length;
      if (!unsure) return void discovery.receiveDiscovery({ image: photo, label: result.label, confidence: result.confidence, syllables: result.syllables });
      return setPhase({ name: "confirm", photo, label: result.label, syllables: result.syllables, confidence: result.confidence, alternatives: result.alternatives ?? [] });
    }
    setPhase({ name: "choose", photo, note: result.status === "none" ? "I couldn't tell what this is." : hasRecognizer() ? "Object recognition isn't working right now." : "Object recognition isn't connected yet. A teammate is building it." });
  };

  // An object has been received: it is now exactly the Level 1 exercise.
  if (discovery.hasObject) {
    return <ExerciseView exercise={discovery.exercise} onMenu={onMenu} onCaregiver={onCaregiver} instruction="Listen, then say the word" />;
  }

  const photo = phase.name === "checking" || phase.name === "confirm" || phase.name === "choose" ? phase.photo : null;

  return (
    <Screen>
      <View style={styles.top}>
        <IconButton label="Open menu" onPress={onMenu} size={48}>
          <MenuGlyph />
        </IconButton>
        <View style={{ flex: 1 }}>
          <Label>Level 2 · Preview</Label>
          <Heading size={24}>Discover Objects</Heading>
        </View>
      </View>

      {phase.name === "intro" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 22, paddingBottom: `calc(${safe.bottom} + 24px)`, alignItems: "center", gap: 16, flexGrow: 1 }}>
          <View style={{ width: short ? 100 : 150, height: short ? 100 : 150 }}>
            <LensArt />
          </View>
          <Heading size={28} style={{ textAlign: "center" }}>
            Show Saykind something real.
          </Heading>
          <Body size={17} style={{ textAlign: "center", maxWidth: 330 }}>
            Take a photo of an object near you. Then you'll hear its word and practice saying it, just like Level 1.
          </Body>
          <Panel tone="note" style={{ alignSelf: "stretch", maxWidth: 380 }}>
            <Label tone={color.accent}>Preview</Label>
            <Body size={15} tone={color.ink}>
              Recognizing objects is being built by a teammate. Until it's connected, you'll choose what you photographed. The camera only opens when you tap, and takes one picture when you press the shutter.
            </Body>
          </Panel>
          {phase.problem ? (
            <Body size={16} tone={color.danger} style={{ textAlign: "center", maxWidth: 330 }} role="alert">
              {phase.problem}
            </Body>
          ) : null}
          <View style={{ flex: 1 }} />
          <Button label="Open camera" icon={<CameraIcon className="size-6" />} onPress={() => void openCamera()} />
        </ScrollView>
      )}

      {phase.name === "live" && (
        <View style={{ flex: 1, padding: 16, paddingBottom: `calc(${safe.bottom} + 18px)`, gap: 14 } as never}>
          <View style={styles.viewfinder}>
            <video ref={videoRef} playsInline muted autoPlay aria-label="Camera view" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#000" }} />
          </View>
          <Body size={16} style={{ textAlign: "center" }}>
            Put one object in the frame, then press the round button.
          </Body>
          <View style={{ alignItems: "center", gap: 4 }}>
            <IconButton label="Take a photo" size={Math.min(84, height * 0.1)} tone="primary" onPress={() => void capture()}>
              <CameraIcon className="size-8" />
            </IconButton>
            <TextLink
              label="Cancel"
              onPress={() => {
                stopCamera();
                setPhase({ name: "intro" });
              }}
            />
          </View>
        </View>
      )}

      {photo && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 22, paddingBottom: `calc(${safe.bottom} + 24px)`, alignItems: "center", gap: 14 }}>
          <View style={styles.photo}>
            <Image source={{ uri: photo }} resizeMode="cover" alt="The photo you took" style={{ width: "100%", height: "100%" }} />
          </View>

          {phase.name === "checking" && (
            <Body size={18} style={{ textAlign: "center" }} role="status">
              Looking…
            </Body>
          )}

          {phase.name === "confirm" && (
            <>
              <Heading size={26} style={{ textAlign: "center" }}>
                Is this a {phase.label.toLowerCase()}?
              </Heading>
              <Body size={15} style={{ textAlign: "center" }}>
                The computer isn't sure. You know best.
              </Body>
              <Button label={`Yes, practice “${phase.label}”`} onPress={() => discovery.receiveDiscovery({ image: phase.photo, label: phase.label, confidence: phase.confidence, syllables: phase.syllables })} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {phase.alternatives.map((alt) => (
                  <Chip key={alt} label={alt} onPress={() => discovery.receiveDiscovery({ image: phase.photo, label: phase.label, confidence: phase.confidence, correctedLabel: alt })} />
                ))}
                <Chip label="Something else" onPress={() => setPhase({ name: "choose", photo: phase.photo, note: "No problem. Choose what it is." })} />
              </View>
            </>
          )}

          {phase.name === "choose" && (
            <>
              <Heading size={24} style={{ textAlign: "center" }}>
                What did you photograph?
              </Heading>
              <Body size={15} style={{ textAlign: "center", maxWidth: 320 }}>
                {phase.note} Choose one, or type it.
              </Body>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {OBJECTS.map((object) => (
                  <Chip key={object.id} label={object.text} onPress={() => discovery.receiveDiscovery({ image: phase.photo, label: "", correctedLabel: object.text })} />
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch", alignItems: "center" }}>
                <TextInput
                  value={typed}
                  onChangeText={setTyped}
                  placeholder="Or type a word"
                  placeholderTextColor={color.inkMuted}
                  accessibilityLabel="Type the name of the object"
                  onSubmitEditing={() => typed.trim() && discovery.receiveDiscovery({ image: phase.photo, label: "", correctedLabel: typed })}
                  style={{ flex: 1, minHeight: 64, borderRadius: 16, borderWidth: 2, borderColor: color.control, backgroundColor: color.surface, color: color.ink, paddingHorizontal: 16, fontFamily: font.ui, fontSize: 20 } as never}
                />
                <Chip label="Practice" selected={!!typed.trim()} onPress={() => typed.trim() && discovery.receiveDiscovery({ image: phase.photo, label: "", correctedLabel: typed })} />
              </View>
              <TextLink label="Take another photo" onPress={() => void openCamera()} />
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

import { MenuIcon } from "@/components/cafe/icons";
function MenuGlyph() {
  return <MenuIcon className="size-6" />;
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingBottom: 8, paddingTop: `calc(${safe.top} + 12px)` } as never,
  viewfinder: { flex: 1, borderRadius: 24, overflow: "hidden", borderWidth: 2, borderColor: color.control, backgroundColor: "#000", minHeight: 200 },
  photo: { width: "100%", maxWidth: 300, aspectRatio: 1, borderRadius: 24, overflow: "hidden", borderWidth: 2, borderColor: color.control },
});

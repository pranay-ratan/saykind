"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View, type ViewStyle } from "react-native";
import { CheckIcon, RecordIcon, ShareIcon, StopIcon, TrashIcon } from "@/components/cafe/icons";
import { logEvent, newId } from "@/lib/saykind/log";
import { deleteSample, saveSample } from "@/lib/saykind/samples";
import { MIC_MESSAGES, useAudioRecorder, type RecordedAudio } from "@/lib/use-audio-recorder";
import { Body, Button, Heading, Label, Panel, Screen, ScreenHeader } from "./kit";
import { color, font, safe } from "./theme";

/**
 * TEMPORARY recording-session screens (Level 4). The functional rules here are the point, and must survive any redesign:
 *  - starts only from an explicit tap, after two consent ticks (the microphone is untouched before that)
 *  - a clear recording indicator and Stop the whole time
 *  - it stops itself if the page leaves the screen (a web page cannot record in the background) and says so
 *  - nothing is transcribed, analyzed or uploaded; save and share are separate, explicit choices
 */
type Stage = "consent" | "recording" | "review";
const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", minHeight: 56 }}>
      <View style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: checked ? color.primary : color.inkMuted, backgroundColor: checked ? color.primary : color.bg, alignItems: "center", justifyContent: "center", color: color.onPrimary, marginTop: 2 } as ViewStyle}>
        {checked ? <CheckIcon className="size-5" /> : null}
      </View>
      <Text style={{ flex: 1, fontFamily: font.ui, fontSize: 17, lineHeight: 25, color: color.ink }}>{children}</Text>
    </Pressable>
  );
}

export default function SessionView({ onBack }: { onBack: () => void }) {
  const levelRef = useRef<HTMLDivElement>(null);
  const recorder = useAudioRecorder(levelRef);
  const [stage, setStage] = useState<Stage>("consent");
  const [understand, setUnderstand] = useState(false);
  const [others, setOthers] = useState(false);
  const [problem, setProblem] = useState("");
  const [note, setNote] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [audio, setAudio] = useState<RecordedAudio | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const startedAt = useRef(0);
  const finishing = useRef(false);

  const stop = async (reason?: string) => {
    if (finishing.current) return;
    finishing.current = true;
    const ms = Date.now() - startedAt.current;
    const result = await recorder.finish();
    finishing.current = false;
    setNote(reason ?? "");
    if (result) {
      setAudio(result);
      setDurationMs(ms);
      setStage("review");
    } else setStage("consent");
  };
  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  });

  const start = async () => {
    setProblem("");
    setNote("");
    const issue = await recorder.start();
    if (issue) return setProblem(MIC_MESSAGES[issue].replace(/ You can still answer by tapping pictures in Help\.$/, ""));
    startedAt.current = Date.now();
    setElapsed(0);
    logEvent({ type: "activity", ts: Date.now(), level: 4, name: "session-started" });
    setStage("recording");
  };

  useEffect(() => {
    if (stage !== "recording") return;
    const tick = window.setInterval(() => setElapsed(Date.now() - startedAt.current), 500);
    const hidden = () => {
      if (document.visibilityState === "hidden") void stopRef.current("Recording stopped because Saykind left the screen. A web page can't keep recording in the background.");
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [stage]);

  if (stage === "recording") {
    return (
      <Screen>
        <View role="status" aria-live="polite" aria-label={`Recording. ${clock(elapsed)}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: `calc(${safe.top} + 14px)`, paddingBottom: 14, backgroundColor: color.danger } as ViewStyle}>
          <View dataSet={{ skPulse: "on" }} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#fff" }} />
          <Text style={{ fontFamily: font.ui, fontSize: 18, fontWeight: "800", color: "#fff" }}>Recording</Text>
          <Text style={{ fontFamily: font.ui, fontSize: 18, fontWeight: "600", color: "#fff", marginLeft: "auto" }}>{clock(elapsed)}</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18, padding: 28 }}>
          <Heading size={32} style={{ textAlign: "center" }}>
            Recording is on.
          </Heading>
          <Body size={18} style={{ textAlign: "center", maxWidth: 320 }}>
            Everyone nearby can be heard. Nothing is sent anywhere. Press Stop whenever you like.
          </Body>
          <View ref={levelRef as never} style={{ marginTop: 14 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Stop recording" onPress={() => void stop()} style={{ width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center", backgroundColor: color.danger, color: "#fff" } as ViewStyle}>
              <StopIcon className="size-12" />
            </Pressable>
          </View>
          <Text style={{ fontFamily: font.ui, fontSize: 20, fontWeight: "800", color: color.ink }}>Stop</Text>
        </View>
      </Screen>
    );
  }

  if (stage === "review" && audio) return <Review audio={audio} durationMs={durationMs} note={note} onDone={() => { setAudio(null); setNote(""); onBack(); }} />;

  return (
    <Screen>
      <ScreenHeader title="Practice session" eyebrow="Level 4" onBack={onBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 22, paddingBottom: `calc(${safe.bottom} + 24px)`, gap: 18, flexGrow: 1 }}>
        <Heading size={28}>Record a real conversation, only if everyone agrees.</Heading>
        <Body size={17}>You can listen back afterwards. Saykind doesn't transcribe it, doesn't analyze it, and doesn't send it anywhere. You decide what happens to it.</Body>
        {note ? (
          <Panel tone="note">
            <Body size={16} tone={color.ink} role="status">
              {note}
            </Body>
          </Panel>
        ) : null}
        <Panel>
          <Check checked={understand} onChange={setUnderstand}>
            I understand it records only while the red bar is showing, and I can stop at any time.
          </Check>
          <Check checked={others} onChange={setOthers}>
            The people I'm talking with know I'm recording, and they agree.
          </Check>
        </Panel>
        <Body size={14}>Laws about recording conversations differ by place. When in doubt, ask first, or don't record.</Body>
        {problem ? (
          <Body size={16} tone={color.danger} role="alert">
            {problem}
          </Body>
        ) : null}
        <View style={{ flex: 1 }} />
        <Button label="Start recording" kind="danger" icon={<RecordIcon className="size-6" />} disabled={!(understand && others) || recorder.status === "requesting"} onPress={() => void start()} hint="Starts recording straight away. A red bar shows while it's on." style={{ alignSelf: "stretch" }} />
      </ScrollView>
    </Screen>
  );
}

function Review({ audio, durationMs, note, onDone }: { audio: RecordedAudio; durationMs: number; note: string; onDone: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState<"no" | "yes" | "failed">("no");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [allow, setAllow] = useState(false);
  const [info, setInfo] = useState("");
  const url = useMemo(() => URL.createObjectURL(audio.blob), [audio]);
  const player = useRef<HTMLAudioElement | null>(null);

  useEffect(
    () => () => {
      player.current?.pause();
      URL.revokeObjectURL(url);
    },
    [url],
  );

  const toggle = () => {
    if (!player.current) {
      player.current = new Audio(url);
      player.current.onended = () => setPlaying(false);
    }
    if (playing) {
      player.current.pause();
      setPlaying(false);
    } else {
      void player.current.play().then(() => setPlaying(true)).catch(() => setInfo("This browser couldn't play the recording."));
    }
  };

  const save = async () => {
    const id = newId();
    const ok = await saveSample({ id, kind: "session", ts: Date.now(), durationMs, mimeType: audio.mimeType, blob: audio.blob, approvedForCaregiver: allow });
    setSaved(ok ? "yes" : "failed");
    if (ok) {
      setSavedId(id);
      logEvent({ type: "activity", ts: Date.now(), level: 4, name: "session-saved", detail: `${Math.round(durationMs / 1000)}s` });
    }
  };

  const extension = audio.mimeType.includes("mp4") ? "m4a" : audio.mimeType.includes("ogg") ? "ogg" : "webm";
  const share = async () => {
    const file = new File([audio.blob], `saykind-recording.${extension}`, { type: audio.mimeType });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        setInfo("Your share menu was opened. Saykind can't tell whether it was sent.");
        return;
      }
    } catch {
      return; // the person cancelled
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    setInfo("Sharing isn't available here, so the file was downloaded instead.");
  };

  return (
    <Screen>
      <ScreenHeader title="Your recording" eyebrow="Review" onBack={onDone} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 22, paddingBottom: `calc(${safe.bottom} + 24px)`, gap: 16, flexGrow: 1 }}>
        {note ? (
          <Body size={16} tone={color.accent} role="status">
            {note}
          </Body>
        ) : null}
        <Heading size={28}>It's only on this phone, so far.</Heading>
        <Body size={17}>Listen back, then choose what to do. It hasn't been saved, shared or sent anywhere.</Body>
        <Panel style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: font.ui, fontSize: 40, fontWeight: "800", color: color.ink }}>{clock(durationMs)}</Text>
          <Button label={playing ? "Pause" : "Play"} onPress={toggle} />
        </Panel>
        <Check checked={allow} onChange={setAllow}>
          If I save it, allow my caregiver to hear it (only when I've also turned on “My recordings” in Settings).
        </Check>
        {saved === "yes" ? (
          <Body size={16} tone={color.primary} weight="700" role="status">
            Saved on this device only. You can play or delete it any time in Settings.
          </Body>
        ) : saved === "failed" ? (
          <Body size={16} tone={color.danger} role="alert">
            Couldn't save here (private browsing can block it). You can share the file instead.
          </Body>
        ) : null}
        {info ? (
          <Body size={15} tone={color.accent} role="status">
            {info}
          </Body>
        ) : null}
        <View style={{ flex: 1 }} />
        <View style={{ gap: 10 }}>
          <Button label={saved === "yes" ? "Saved" : "Save on this device"} disabled={saved === "yes"} onPress={() => void save()} style={{ alignSelf: "stretch" }} />
          <Button label="Share…" kind="secondary" icon={<ShareIcon className="size-5" />} onPress={() => void share()} hint="Opens your phone's share menu. You choose where it goes." style={{ alignSelf: "stretch" }} />
          <Button
            label="Delete it"
            kind="danger"
            icon={<TrashIcon className="size-5" />}
            onPress={() => {
              if (savedId) void deleteSample(savedId);
              onDone();
            }}
            style={{ alignSelf: "stretch" }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

void Label;

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StyleSheet, View, type ViewStyle } from "react-native";
import CafeExperience from "@/components/cafe/CafeExperience";
import CafeScene from "@/components/cafe/CafeScene";
import { getSetProgress, LEVEL2_SET_ID, isSetComplete } from "@/lib/saykind/progress";
import { OBJECTS, isLevelUnlocked, logEvent, parseLevelReturn, useCafe, useCaregiverContact, useDiscovery, useExercise, useLevel2Complete } from "@/lib/saykind";
import type { Order } from "@/lib/order";
import { useReducedMotion } from "@/lib/use-presence";
import { unlockWordAudio } from "@/lib/word-audio";
import ReportSheet from "@/components/report/ReportSheet";
import CafeDoneView from "./CafeDoneView";
import CaregiverSheet from "./CaregiverSheet";
import DiscoverView from "./DiscoverView";
import ExerciseView from "./ExerciseView";
import FinishedView from "./FinishedView";
import { Frame } from "./frame";
import LevelMenu, { type LevelId } from "./LevelMenu";
import Level1View from "./level1/Level1View";
import PhrasesView from "./PhrasesView";
import SettingsView from "./SettingsView";
import WelcomeView from "./WelcomeView";

const IRIS_MS = 1900;

const getLevel2Complete = () => isSetComplete(getSetProgress(LEVEL2_SET_ID));

/**
 * Words that use the redesigned Level 1 screen (components/saykind/level1). The redesign is being reviewed on the Chair first;
 * every other word keeps the previous screen until it is approved. Approving it is a one-line change: list the other ids here
 * (or replace this check with `true`).
 */
const REDESIGNED_WORDS: readonly string[] = ["chair"];

/**
 * The app shell. It opens straight into Level 1, Exercise 1. The four levels are one tap away in a small menu, which never
 * disturbs anything: every level's state lives in a controller owned here (or, for Level 1, in saved progress).
 *
 * This file only decides WHICH screen to show. Replace the views freely; keep the controllers (lib/saykind).
 */
export default function SaykindApp() {
  const router = useRouter();
  // Coming back from /level-2 skips the Welcome screen: "Back to levels" opens the menu, and Skip or "Next: the café" opens
  // the café itself, waiting on its Start button (the conversation needs a tap on this page before any sound can play).
  const [returned] = useState(() => parseLevelReturn(window.location.search));
  const [welcomed, setWelcomed] = useState(returned.fromLevel2);
  const level2Complete = useLevel2Complete();
  const reduced = useReducedMotion();
  const level1 = useExercise({ id: "level1", level: 1, items: OBJECTS });
  const discovery = useDiscovery();
  const cafe = useCafe();
  const contact = useCaregiverContact();

  const [level, setLevel] = useState<LevelId>(returned.nextCafe ? 3 : 1);
  const [settings, setSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(returned.fromLevel2 && !returned.nextCafe);
  const [caregiverOpen, setCaregiverOpen] = useState(false);
  const [cafeStage, setCafeStage] = useState<"cafe" | "done">("cafe");
  const [order, setOrder] = useState<Order | null>(null);
  const [irisOpen, setIrisOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const timers = useRef<number[]>([]);
  const { unlockAudio } = cafe;
  const levelOpen = (id: LevelId) => isLevelUnlocked(id, { level2Complete });
  const lockedLevels = ([3, 4] as const).filter((id) => !levelOpen(id));

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  // The very first press anywhere unlocks sound for the rest of the visit (iPhone Safari needs a tap), and
  // design-review links (?level=2) can open another level.
  useEffect(() => {
    const unlock = () => {
      unlockWordAudio();
      unlockAudio();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    const wanted = Number(new URLSearchParams(window.location.search).get("level"));
    const start = window.setTimeout(() => {
      if (wanted >= 1 && wanted <= 4 && wanted !== 3 && isLevelUnlocked(wanted as LevelId, { level2Complete: getLevel2Complete() })) setLevel(wanted as LevelId);
      if (returned.fromLevel2) window.history.replaceState(null, "", "/");
    }, 0);
    const pending = timers.current;
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.clearTimeout(start);
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, [unlockAudio, returned.fromLevel2]);

  /** Into the café. Always called straight from a tap, so the browser allows sound and the microphone. */
  const enterCafe = (withIris = true) => {
    unlockWordAudio();
    let ready: () => void = () => {};
    const whenReady = new Promise<void>((resolve) => {
      ready = resolve;
    });
    cafe.start({ whenReady });
    setCafeStage("cafe");
    setIrisOpen(withIris);
    later(ready, reduced ? 500 : withIris ? IRIS_MS : 900);
  };

  const selectLevel = (id: LevelId) => {
    if (!levelOpen(id)) return;
    setMenuOpen(false);
    setSettings(false);
    if (id === level && id !== 3) return;
    if (level === 3 && id !== 3) {
      cafe.exit();
      setIrisOpen(false);
    }
    if (id === 2) {
      router.push("/level-2");
      return;
    }
    setLevel(id);
    logEvent({ type: "activity", ts: Date.now(), level: id, name: "opened" });
    if (id === 3 && !(level === 3 && cafe.phase !== "idle")) enterCafe();
  };

  const openMenu = () => setMenuOpen(true);
  const openCaregiver = () => {
    contact.refreshSummary();
    setCaregiverOpen(true);
  };

  return (
    <Frame>
      <View style={StyleSheet.absoluteFill as ViewStyle}>
        {!welcomed ? (
          <WelcomeView onStart={() => setWelcomed(true)} />
        ) : settings ? (
          <SettingsView onBack={() => setSettings(false)} />
        ) : level === 1 ? (
          level1.isFinished ? (
            <FinishedView exercise={level1} onAgain={level1.restart} onNext={() => selectLevel(2)} nextLabel="Try Level 2: Discover Objects" />
          ) : REDESIGNED_WORDS.includes(level1.currentWord.id) ? (
            <Level1View exercise={level1} onMenu={openMenu} onCaregiver={openCaregiver} />
          ) : (
            <ExerciseView exercise={level1} onMenu={openMenu} onCaregiver={openCaregiver} />
          )
        ) : level === 2 ? (
          <DiscoverView discovery={discovery} onMenu={openMenu} onCaregiver={openCaregiver} />
        ) : level === 3 ? (
          cafeStage === "done" && order ? (
            <CafeDoneView order={order} onAgain={() => enterCafe(false)} onHome={() => selectLevel(1)} onReport={() => setReportOpen(true)} />
          ) : (
            <div className="stage iris" data-open={irisOpen ? "true" : "false"}>
              <CafeExperience
                scene={<CafeScene />}
                cafe={cafe}
                onComplete={(finalOrder) => {
                  setOrder(finalOrder);
                  logEvent({ type: "activity", ts: Date.now(), level: 3, name: "order-completed" });
                  setCafeStage("done");
                  setReportOpen(true);
                }}
                onRetryStart={() => enterCafe(false)}
                onExit={openMenu}
                onCaregiver={openCaregiver}
              />
            </div>
          )
        ) : (
          <PhrasesView onMenu={openMenu} onCaregiver={openCaregiver} />
        )}
      </View>

      <LevelMenu
        open={menuOpen}
        current={level}
        locked={lockedLevels}
        next={returned.nextCafe ? 3 : undefined}
        onSelect={selectLevel}
        onClose={() => setMenuOpen(false)}
        onSettings={() => {
          setMenuOpen(false);
          setSettings(true);
        }}
        onCaregiverView={() => {
          setMenuOpen(false);
          window.open("/caregiver", "_self");
        }}
      />
      {reportOpen && <ReportSheet onClose={() => setReportOpen(false)} />}
      <CaregiverSheet
        open={caregiverOpen}
        onClose={() => setCaregiverOpen(false)}
        contact={contact}
        onSettings={() => {
          setCaregiverOpen(false);
          setSettings(true);
        }}
      />
    </Frame>
  );
}

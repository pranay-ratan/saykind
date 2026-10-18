"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ApiError, converse, describeApiError, fetchStatus, transcribe } from "./client-api";
import { GREETING } from "./menu";
import { EMPTY_ORDER, acknowledgement, nextSlot, type HistoryItem, type Order } from "./order";
import { tappedPhrase, type Choice, type ChoiceSlot } from "./support";
import { useAudioRecorder, MIC_MESSAGES, type MicProblem, type RecordedAudio } from "./use-audio-recorder";
import { useBaristaVoice } from "./use-barista-voice";

/**
 * The conversation, one turn at a time:
 *
 *   speaking  -> the barista talks; the microphone is inactive
 *   yourTurn  -> the barista is done; the microphone glows and waits, as long as it takes
 *   recording -> the patient is talking; only a tap ends the turn
 *   thinking  -> transcribing and composing the reply
 *   ended     -> the order is complete
 */
export type ConversationMessage = { id: number; role: "barista" | "patient"; text: string; via?: "speech" | "tap" | "silence" };

export type Phase = "idle" | "starting" | "speaking" | "yourTurn" | "recording" | "thinking" | "ended";

type TurnSource =
  | { kind: "speech"; audio: RecordedAudio | null }
  | { kind: "tap"; slot: ChoiceSlot; choice: Choice };

export function useConversation(levelTarget: RefObject<HTMLElement | null>) {
  const voice = useBaristaVoice();
  const recorder = useAudioRecorder(levelTarget);

  const [phase, setPhaseState] = useState<Phase>("idle");
  const [caption, setCaption] = useState("");
  const [order, setOrderState] = useState<Order>(EMPTY_ORDER);
  const [notice, setNotice] = useState<string | null>(null);
  const [micIssue, setMicIssue] = useState<MicProblem | null>(null);
  const [unclearStreak, setUnclearStreak] = useState(0);
  const [ack, setAck] = useState<{ id: number; text: string } | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const messageIdRef = useRef(0);

  const phaseRef = useRef<Phase>("idle");
  const orderRef = useRef<Order>(EMPTY_ORDER);
  const streakRef = useRef(0);
  const historyRef = useRef<HistoryItem[]>([]);
  const runRef = useRef(0); // bumped on start/unmount so late results from an old run are ignored
  const startingMicRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const ackIdRef = useRef(0);

  const go = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const signal = useCallback(() => {
    abortRef.current ??= new AbortController();
    return abortRef.current.signal;
  }, []);

  /** The barista says something, then (unless the order is done) it's the patient's turn. */
  const sayBarista = useCallback(
    async (text: string, finished: boolean, run: number) => {
      historyRef.current.push({ role: "barista", text });
      setMessages((all) => [...all, { id: ++messageIdRef.current, role: "barista", text }]);
      setCaption(text);
      go("speaking");

      const result = await voice.say(text);
      if (run !== runRef.current) return;

      if (result === "failed") {
        setNotice("I couldn't play the barista's voice. You can read the captions, or tap the speaker to try again.");
      } else if (result === "device") {
        setNotice("The spoken voice is paused for now, so your device's voice is reading this line.");
      } else if (result === "blocked") {
        setNotice("Your browser blocked the sound. Tap the speaker to hear the barista.");
      }
      go(finished ? "ended" : "yourTurn");
    },
    [go, voice],
  );

  const takeTurn = useCallback(
    async (run: number, source: TurnSource) => {
      go("thinking");
      setNotice(null);
      try {
        let via: "speech" | "tap" | "silence";
        let text: string;
        if (source.kind === "tap") {
          via = "tap";
          text = tappedPhrase(source.slot, source.choice);
        } else if (!source.audio) {
          via = "silence";
          text = "";
        } else {
          text = (await transcribe(source.audio, signal())).trim();
          via = text ? "speech" : "silence";
        }
        if (run !== runRef.current) return;

        const reply = await converse(
          {
            history: historyRef.current,
            order: orderRef.current,
            patient: { via, text },
            tapped: source.kind === "tap" ? { slot: source.slot, id: source.choice.id } : undefined,
            unclearStreak: streakRef.current,
          },
          signal(),
        );
        if (run !== runRef.current) return;

        historyRef.current.push({ role: "patient", text, via });
        if (text) setMessages((all) => [...all, { id: ++messageIdRef.current, role: "patient", text, via }]);
        // A small "Got it" when the order itself changed, i.e. when their intent got through.
        const acknowledged = acknowledgement(orderRef.current, reply.order);
        if (acknowledged) setAck({ id: ++ackIdRef.current, text: acknowledged });
        orderRef.current = reply.order;
        streakRef.current = reply.unclearStreak;
        setOrderState(reply.order);
        setUnclearStreak(reply.unclearStreak);

        await sayBarista(reply.reply, nextSlot(reply.order) === "none", run);
      } catch (error) {
        if (run !== runRef.current || (error instanceof DOMException && error.name === "AbortError")) return;
        console.error("[conversation]", error);
        setNotice(describeApiError(error));
        go("yourTurn"); // the question is still open; try again whenever ready
      }
    },
    [go, sayBarista, signal],
  );

  /**
   * Start (or start again). Must be called straight from a tap.
   * `whenReady` lets the caller hold the greeting until the café is actually on screen.
   */
  const start = useCallback((options: { whenReady?: Promise<void> } = {}) => {
    voice.unlock(); // synchronous on purpose: Safari only allows sound started by a tap
    const permission = recorder.checkPermission(); // also begun inside the tap
    const run = ++runRef.current;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    historyRef.current = [];
    orderRef.current = EMPTY_ORDER;
    streakRef.current = 0;
    setOrderState(EMPTY_ORDER);
    setUnclearStreak(0);
    setAck(null);
    setNotice(null);
    setCaption("");
    setMessages([]);
    go("starting");

    void (async () => {
      try {
        const [status, mic] = await Promise.all([fetchStatus(signal()), permission]);
        if (run !== runRef.current) return;

        if (!status.configured) {
          setNotice(describeApiError(new ApiError("not_configured", 503)));
          go("idle");
          return;
        }
        setMicIssue(mic === "granted" ? null : mic);
        if (mic !== "granted") setNotice(MIC_MESSAGES[mic]);

        await options.whenReady;
        if (run !== runRef.current) return;
        await sayBarista(GREETING, false, run);
      } catch (error) {
        if (run !== runRef.current || (error instanceof DOMException && error.name === "AbortError")) return;
        setNotice(describeApiError(error));
        go("idle");
      }
    })();
  }, [go, recorder, sayBarista, signal, voice]);

  /** The microphone button: begins the patient's turn, and ends it. */
  const toggleMic = useCallback(async () => {
    const run = runRef.current;
    if (phaseRef.current === "yourTurn") {
      if (startingMicRef.current) return;
      startingMicRef.current = true;
      voice.stop(); // never record the barista's (or an example's) voice
      setNotice(null);
      const problem = await recorder.start();
      startingMicRef.current = false;
      if (run !== runRef.current) return;
      if (problem) {
        setMicIssue(problem);
        setNotice(MIC_MESSAGES[problem]);
        return;
      }
      setMicIssue(null);
      go("recording");
    } else if (phaseRef.current === "recording") {
      go("thinking");
      const audio = await recorder.finish();
      await takeTurn(run, { kind: "speech", audio });
    }
  }, [go, recorder, takeTurn, voice]);

  /** Answer by tapping a picture. Always available on the patient's turn, even mid-recording. */
  const choose = useCallback(
    (slot: ChoiceSlot, choice: Choice) => {
      if (phaseRef.current === "recording") recorder.cancel();
      else if (phaseRef.current !== "yourTurn") return;
      voice.stop();
      void takeTurn(runRef.current, { kind: "tap", slot, choice });
    },
    [recorder, takeTurn, voice],
  );

  const hearAgain = useCallback(() => {
    if (phaseRef.current === "yourTurn" || phaseRef.current === "ended") void voice.replay();
  }, [voice]);

  /** Play an example sentence from the Help sheet. */
  const hearExample = useCallback(
    (text: string) => {
      if (phaseRef.current === "yourTurn") void voice.say(text, { aside: true });
    },
    [voice],
  );

  const dismissNotice = useCallback(() => setNotice(null), []);

  /** Leave the café: stop the voice and the microphone and forget this conversation. */
  const exit = useCallback(() => {
    runRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    voice.stop();
    recorder.cancel();
    historyRef.current = [];
    orderRef.current = EMPTY_ORDER;
    streakRef.current = 0;
    setOrderState(EMPTY_ORDER);
    setUnclearStreak(0);
    setAck(null);
    setNotice(null);
    setCaption("");
    setMessages([]);
    go("idle");
  }, [go, recorder, voice]);

  useEffect(() => {
    return () => {
      runRef.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  return {
    phase,
    caption,
    messages,
    order,
    slot: nextSlot(order),
    notice,
    micIssue,
    unclearStreak,
    ack,
    micRequesting: recorder.status === "requesting",
    audioPlaying: voice.speaking,
    start,
    unlockAudio: voice.unlock,
    toggleMic,
    choose,
    hearAgain,
    hearExample,
    dismissNotice,
    exit,
  };
}

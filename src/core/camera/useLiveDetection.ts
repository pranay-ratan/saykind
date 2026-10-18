'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { CAMERA_CONFIG } from '../../config/camera';
import { DetectClientError, detectObjects, type DetectFailure } from '../vision/detectObjects';
import type { DetectResponse } from '../vision/types';
import { captureVideoFrame, sceneSignature, signatureDistance } from './frames';
import { liveBlockReason, shouldDetect, type LiveBlockReason } from './liveGate';

export interface LiveDetectionOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  sheetOpen: boolean;
  intervalMs: number;
  maxCalls: number;
  onResult: (result: DetectResponse) => void;
  onError: (failure: DetectFailure) => void;
  /** Called on a tick where the scene is unchanged and no call is made, so boxes on screen stay current. */
  onStill: () => void;
}

export interface LiveDetectionState {
  callsUsed: number;
  budgetExhausted: boolean;
  blockReason: LiveBlockReason | null;
  resetBudget: () => void;
}

/**
 * Runs detection on a timer while the camera is live. Each tick checks the gates
 * (tab visible, sheet closed, no request in flight, budget left, scene changed or
 * stale), then captures a 640px JPEG. Responses older than the latest applied one
 * are dropped, so a slow reply never overwrites a newer result.
 */
export function useLiveDetection(options: LiveDetectionOptions): LiveDetectionState {
  const { videoRef, active, sheetOpen, intervalMs, maxCalls, onResult, onError, onStill } = options;
  const [callsUsed, setCallsUsed] = useState(0);
  const [blockReason, setBlockReason] = useState<LiveBlockReason | null>('inactive');

  const callsRef = useRef(0);
  const inFlightRef = useRef(false);
  const nextSequenceRef = useRef(0);
  const appliedSequenceRef = useRef(0);
  const baselineRef = useRef<Float32Array | null>(null);
  const lastCallAtRef = useRef<number | null>(null);
  const handlersRef = useRef({ onResult, onError, onStill });
  const tickRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    handlersRef.current = { onResult, onError, onStill };
  }, [onResult, onError, onStill]);

  async function tick(): Promise<void> {
    const video = videoRef.current;
    const reason = liveBlockReason({
      active,
      sheetOpen,
      tabVisible: document.visibilityState === 'visible',
      online: navigator.onLine,
      requestInFlight: inFlightRef.current,
      callsUsed: callsRef.current,
      maxCalls,
      videoReady: video !== null && video.readyState >= 2 && video.videoWidth > 0,
    });
    setBlockReason(reason);
    if (reason || !video) return;

    const signature = sceneSignature(video, CAMERA_CONFIG.signatureSize);
    if (!signature) return;

    const baseline = baselineRef.current;
    const sceneChanged = baseline === null || signatureDistance(baseline, signature) > CAMERA_CONFIG.sceneChangeThreshold;
    const lastCallAt = lastCallAtRef.current;
    const worthCalling = shouldDetect({
      sceneChanged,
      msSinceLastCall: lastCallAt === null ? Number.POSITIVE_INFINITY : Date.now() - lastCallAt,
      hasCalledBefore: lastCallAt !== null,
      staleMs: CAMERA_CONFIG.sceneStaleMs,
    });
    if (!worthCalling) {
      if (!sceneChanged) handlersRef.current.onStill();
      return;
    }

    const frame = captureVideoFrame(video, CAMERA_CONFIG.maxFrameWidth, CAMERA_CONFIG.jpegQuality);
    if (!frame) return;

    baselineRef.current = signature;
    lastCallAtRef.current = Date.now();
    callsRef.current += 1;
    setCallsUsed(callsRef.current);
    inFlightRef.current = true;
    const sequence = nextSequenceRef.current + 1;
    nextSequenceRef.current = sequence;

    try {
      const result = await detectObjects({
        imageDataUrl: frame.dataUrl,
        frame: { width: frame.width, height: frame.height },
      });
      if (sequence > appliedSequenceRef.current) {
        appliedSequenceRef.current = sequence;
        handlersRef.current.onResult(result);
      }
    } catch (error) {
      handlersRef.current.onError(error instanceof DetectClientError ? error.failure : 'failed');
    } finally {
      inFlightRef.current = false;
    }
  }

  useEffect(() => {
    tickRef.current = tick;
  });

  useEffect(() => {
    if (!active) return undefined;

    const runTick = () => {
      void tickRef.current();
    };
    const intervalId = window.setInterval(runTick, intervalMs);
    window.addEventListener('online', runTick);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('online', runTick);
    };
  }, [active, intervalMs]);

  const resetBudget = useCallback(() => {
    callsRef.current = 0;
    setCallsUsed(0);
  }, []);

  return {
    callsUsed,
    budgetExhausted: callsUsed >= maxCalls,
    blockReason,
    resetBudget,
  };
}

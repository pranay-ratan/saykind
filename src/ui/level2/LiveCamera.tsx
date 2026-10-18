'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CAMERA_CONFIG } from '../../config/camera';
import type { ClientConfig } from '../../config/clientConfig';
import { captureVideoFrameHighRes, fileToFrame } from '../../core/camera/frames';
import { mergeTracks, pruneTracks, refreshTracks, type TrackedObject } from '../../core/camera/trackBoxes';
import { useCamera } from '../../core/camera/useCamera';
import { useLiveDetection } from '../../core/camera/useLiveDetection';
import { cancelSpeech, prepareVoices } from '../../core/speech';
import { defaultSettings, loadSettings, saveSettings, type Level2Settings } from '../../core/settings';
import { DetectClientError, detectObjects, type DetectFailure } from '../../core/vision/detectObjects';
import type { DetectedObject, DetectResponse } from '../../core/vision/types';
import { DebugPanel } from './DebugPanel';
import { DetectionOverlay } from './DetectionOverlay';
import { ObjectSheet, type ObjectSelection } from './ObjectSheet';
import { SettingsSheet } from './SettingsSheet';
import { StartScreen } from './StartScreen';

interface PhotoFrame {
  dataUrl: string;
  width: number;
  height: number;
}

interface LiveCameraProps {
  config: ClientConfig;
}

const ICON_BUTTON = 'min-h-[64px] min-w-[64px] flex items-center justify-center rounded-xl bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 active:bg-black/80 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-400';

function failureNotice(failure: DetectFailure | null): string | null {
  if (failure === 'rate-limited') return 'Looking is resting for a moment.';
  if (failure === 'timeout' || failure === 'failed') return 'Trying again.';
  return null;
}

function photoErrorMessage(error: unknown): string {
  if (error instanceof DetectClientError) {
    if (error.failure === 'offline') return 'You are offline. Try the photo again when you are back online.';
    if (error.failure === 'rate-limited') return 'Looking is resting for a moment. Try again shortly.';
    if (error.failure === 'bad-photo') return 'That file is not a photo we can use. Try another.';
  }
  return 'Trying again. You can also choose another photo.';
}

function uniqueLabelsExcept(tracks: readonly TrackedObject[], label: string): string[] {
  return [...new Set(tracks.map((track) => track.label))].filter((item) => item !== label);
}

function subscribeToConnectivity(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

function subscribeNever(): () => void {
  return () => undefined;
}

function readDebugFlag(): boolean {
  return new URLSearchParams(window.location.search).get('debug') === '1';
}

export function LiveCamera({ config }: LiveCameraProps) {
  const camera = useCamera();
  const { pause, resume, videoRef } = camera;

  // Saved settings are read on the first client render. They do not change any server-rendered markup.
  const [settings, setSettings] = useState<Level2Settings>(() => {
    const defaults = defaultSettings(config.liveIntervalMs);
    return typeof window === 'undefined' ? defaults : loadSettings(defaults);
  });
  const online = useSyncExternalStore(subscribeToConnectivity, () => navigator.onLine, () => true);
  const debugMode = useSyncExternalStore(subscribeNever, readDebugFlag, () => false);
  const [tracks, setTracks] = useState<TrackedObject[]>([]);
  const [selection, setSelection] = useState<ObjectSelection | null>(null);
  const [photo, setPhoto] = useState<PhotoFrame | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });
  const [failure, setFailure] = useState<DetectFailure | null>(null);
  const [provider, setProvider] = useState<string | undefined>();
  const [latencyMs, setLatencyMs] = useState<number | undefined>();
  const [rawBoxes, setRawBoxes] = useState<DetectedObject[] | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showRawBoxes, setShowRawBoxes] = useState(false);
  const hintTimerRef = useRef<number | null>(null);

  const live = camera.status === 'live' && photo === null;
  /** Only the live front camera is mirrored. Photos from the file picker are shown as taken. */
  const mirrored = live && camera.facing === 'user';
  const sheetOpen = selection !== null;

  const clearHintTimer = useCallback(() => {
    if (hintTimerRef.current !== null) {
      window.clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
  }, []);

  const handleResult = useCallback(
    (response: DetectResponse) => {
      setTracks((previous) => mergeTracks(previous, response.objects, Date.now()));
      setProvider(response.provider);
      setLatencyMs(response.latencyMs);
      setRawBoxes(response.raw);
      setFailure(null);

      if (response.objects.length > 0) {
        clearHintTimer();
        setHintVisible(false);
      } else if (hintTimerRef.current === null) {
        hintTimerRef.current = window.setTimeout(() => {
          hintTimerRef.current = null;
          setHintVisible(true);
        }, CAMERA_CONFIG.noObjectHintMs);
      }
    },
    [clearHintTimer],
  );

  const handleFailure = useCallback((next: DetectFailure) => setFailure(next), []);

  const handleStill = useCallback(() => setTracks((previous) => refreshTracks(previous, Date.now())), []);

  const detection = useLiveDetection({
    videoRef,
    active: live && settings.liveDetection,
    sheetOpen,
    intervalMs: settings.intervalMs,
    maxCalls: config.liveMaxCalls,
    onResult: handleResult,
    onError: handleFailure,
    onStill: handleStill,
  });

  // Mount-only: warm the browser voice list, and stop any speech and hint timer on unmount.
  useEffect(() => {
    prepareVoices();
    return () => {
      clearHintTimer();
      cancelSpeech();
    };
  }, [clearHintTimer]);

  // Keep the video's real size in state so boxes map onto the visible frame.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const syncSize = () => setMediaSize({ width: video.videoWidth, height: video.videoHeight });
    video.addEventListener('loadedmetadata', syncSize);
    video.addEventListener('resize', syncSize);
    return () => {
      video.removeEventListener('loadedmetadata', syncSize);
      video.removeEventListener('resize', syncSize);
    };
  }, [videoRef]);

  // Boxes expire 2.5s after their last sighting, but freeze while the sheet is open.
  useEffect(() => {
    if (!live || sheetOpen) return undefined;
    const intervalId = window.setInterval(() => {
      setTracks((previous) => pruneTracks(previous, Date.now()));
    }, CAMERA_CONFIG.pruneTickMs);
    return () => window.clearInterval(intervalId);
  }, [live, sheetOpen]);

  // Freeze the preview while the sheet is open, and resume it when the sheet closes.
  useEffect(() => {
    if (sheetOpen) pause();
    else resume();
  }, [sheetOpen, pause, resume]);

  const changeSettings = useCallback((next: Level2Settings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const openCamera = useCallback(async () => {
    setPhotoMessage(null);
    const started = await camera.start();
    if (started) setFailure(null);
  }, [camera]);

  const flipCamera = useCallback(() => {
    void camera.flip();
  }, [camera]);

  const closeCamera = useCallback(() => {
    camera.stop();
    cancelSpeech();
    detection.resetBudget();
    clearHintTimer();
    setTracks([]);
    setSelection(null);
    setPhoto(null);
    setPhotoMessage(null);
    setFailure(null);
    setRawBoxes(null);
    setHintVisible(false);
  }, [camera, detection, clearHintTimer]);

  const handleSelect = useCallback(
    (track: TrackedObject) => {
      const object: DetectedObject = {
        label: track.label,
        confidence: track.confidence,
        x: track.x,
        y: track.y,
        w: track.w,
        h: track.h,
      };
      setSelection({
        id: Date.now(),
        object,
        alternatives: uniqueLabelsExcept(tracks, object.label),
      });
    },
    [tracks],
  );

  const closeSheet = useCallback(() => {
    cancelSpeech();
    setSelection(null);
  }, []);

  const loadCropSource = useCallback(async (): Promise<string | null> => {
    if (photo) return photo.dataUrl;
    const video = videoRef.current;
    if (!video) return null;
    return captureVideoFrameHighRes(video, CAMERA_CONFIG.cropSourceMaxSide)?.dataUrl ?? null;
  }, [photo, videoRef]);

  const choosePhoto = useCallback(
    async (file: File) => {
      setPhotoBusy(true);
      setPhotoMessage(null);
      try {
        const frame = await fileToFrame(file, CAMERA_CONFIG.cropSourceMaxSide);
        const response = await detectObjects({
          imageDataUrl: frame.dataUrl,
          frame: { width: frame.width, height: frame.height },
        });
        camera.stop();
        setPhoto({ dataUrl: frame.dataUrl, width: frame.width, height: frame.height });
        setTracks(mergeTracks([], response.objects, Date.now()));
        setProvider(response.provider);
        setLatencyMs(response.latencyMs);
        setRawBoxes(response.raw);
        setFailure(null);
        if (response.objects.length === 0) {
          setPhotoMessage('I did not see a clear everyday object in that photo. Try another.');
        }
      } catch (error) {
        setPhotoMessage(photoErrorMessage(error));
      } finally {
        setPhotoBusy(false);
      }
    },
    [camera],
  );

  const media = photo ? { width: photo.width, height: photo.height } : mediaSize;
  const showMedia = live || photo !== null;
  const showStart = !showMedia;
  const notice = failureNotice(failure);

  return (
    <div className="fixed inset-0 h-dvh overflow-hidden overscroll-none bg-stone-950 text-white">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover ${live ? '' : 'invisible'}`}
        style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
      />
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- the photo is a local data URL, not a remote asset
        <img src={photo.dataUrl} alt="Your chosen photo" className="absolute inset-0 h-full w-full object-cover" />
      )}

      {showMedia && (
        <>
          <DetectionOverlay
            tracks={tracks}
            media={media}
            onSelect={handleSelect}
            rawBoxes={debugMode && showRawBoxes ? rawBoxes : null}
            hintVisible={hintVisible && live}
            mirrored={mirrored}
            showGrid={debugMode}
          />

          <div
            className="absolute flex gap-3"
            style={{ top: 'max(1rem, env(safe-area-inset-top))', right: 'max(1rem, env(safe-area-inset-right))' }}
          >
            {live && (
              <button type="button" onClick={flipCamera} aria-label="Flip camera" className={ICON_BUTTON}>
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Settings" className={ICON_BUTTON}>
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button type="button" onClick={closeCamera} aria-label="Close camera" className={ICON_BUTTON}>
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {debugMode && (
            <DebugPanel
              provider={provider}
              latencyMs={latencyMs}
              callsUsed={detection.callsUsed}
              maxCalls={config.liveMaxCalls}
              blockReason={detection.blockReason}
              failure={failure}
              showRawBoxes={showRawBoxes}
              onToggleRawBoxes={() => setShowRawBoxes((current) => !current)}
            />
          )}

          {notice && live && (
            <p role="status" className="absolute bottom-6 left-4 rounded-xl bg-black/60 px-4 py-3 text-xl">
              {notice}
            </p>
          )}

          {!online && live && (
            <p role="status" className="absolute inset-x-4 bottom-6 rounded-xl bg-stone-800/90 px-4 py-4 text-center text-xl">
              You are offline. Looking will continue when you are back online.
            </p>
          )}

          {detection.budgetExhausted && live && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-6">
              <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center text-stone-900 shadow-2xl">
                <p className="mb-6 text-xl">We have looked for a while. Keep looking when you are ready.</p>
                <button
                  type="button"
                  onClick={detection.resetBudget}
                  className="min-h-[64px] w-full rounded-xl bg-stone-900 text-xl font-medium text-white hover:bg-stone-800 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  Keep looking
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showStart && (
        <StartScreen
          status={camera.status}
          photoBusy={photoBusy}
          photoMessage={photoMessage}
          onOpenCamera={() => void openCamera()}
          onChoosePhoto={(file) => void choosePhoto(file)}
        />
      )}

      <SettingsSheet
        open={settingsOpen}
        settings={settings}
        onChange={changeSettings}
        onClose={() => setSettingsOpen(false)}
      />

      {selection && (
        <ObjectSheet
          key={selection.id}
          selection={selection}
          loadCropSource={loadCropSource}
          autoSpeak={settings.autoSpeak}
          voiceRate={settings.voiceRate}
          ttsProvider={config.ttsProvider}
          visionProvider={provider}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type Facing = 'environment' | 'user';

export type CameraStatus = 'idle' | 'starting' | 'live' | 'denied' | 'unavailable' | 'error';

export interface CameraControls {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  facing: Facing;
  start: (facing?: Facing) => Promise<boolean>;
  stop: () => void;
  flip: () => Promise<boolean>;
  pause: () => void;
  resume: () => void;
}

const PERMISSION_ERRORS = new Set(['NotAllowedError', 'SecurityError']);
const UNAVAILABLE_ERRORS = new Set(['NotFoundError', 'NotReadableError', 'OverconstrainedError']);

/** Maps a getUserMedia failure to the screen the user should see. */
export function classifyCameraError(error: unknown): Exclude<CameraStatus, 'idle' | 'starting' | 'live'> {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  if (PERMISSION_ERRORS.has(name)) return 'denied';
  if (UNAVAILABLE_ERRORS.has(name)) return 'unavailable';
  return 'error';
}

/** Owns the camera stream. The <video> element belongs to the caller and is attached via videoRef. */
export function useCamera(): CameraControls {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [facing, setFacing] = useState<Facing>('environment');
  const facingRef = useRef<Facing>('environment');

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(
    async (nextFacing: Facing = facingRef.current): Promise<boolean> => {
      releaseStream();
      setStatus('starting');

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable');
        return false;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: nextFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          setStatus('error');
          return false;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        facingRef.current = nextFacing;
        setFacing(nextFacing);
        setStatus('live');
        return true;
      } catch (error) {
        setStatus(classifyCameraError(error));
        return false;
      }
    },
    [releaseStream],
  );

  const stop = useCallback(() => {
    releaseStream();
    setStatus('idle');
  }, [releaseStream]);

  const flip = useCallback(() => {
    const next: Facing = facingRef.current === 'environment' ? 'user' : 'environment';
    return start(next);
  }, [start]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    void videoRef.current?.play().catch(() => undefined);
  }, []);

  useEffect(() => releaseStream, [releaseStream]);

  return { videoRef, status, facing, start, stop, flip, pause, resume };
}

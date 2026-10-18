export type VisionProvider = 'perceptron' | 'gemini';

export interface FrameSize {
  width: number;
  height: number;
}

/** A box exactly as the model returned it, before any scaling. */
export interface RawDetection {
  label: string;
  confidence: number | null;
  box: readonly [number, number, number, number];
}

/** A box in 0..1 coordinates relative to the frame that was sent. */
export interface DetectedObject {
  label: string;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DetectResponse {
  objects: DetectedObject[];
  /** Every box the model returned that had a usable shape, before filtering. Used by ?debug=1. */
  raw: DetectedObject[];
  provider: VisionProvider;
  latencyMs: number;
}

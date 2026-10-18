export type VisionProvider = 'perceptron' | 'gemini';

/** live: a frame from the camera loop (fast box mode). confirm: the tapped object, where confidence matters. */
export type DetectPurpose = 'live' | 'confirm';

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
  /** The model that answered, after any fallback. Shown by ?debug=1. */
  model?: string;
  /** How the boxes were asked for: Perceptron's native markup or a JSON prompt. */
  mode?: 'json' | 'box';
}

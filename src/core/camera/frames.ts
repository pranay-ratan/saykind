import type { FrameSize } from '../vision/types';

export interface CapturedFrame extends FrameSize {
  /** data:image/jpeg;base64,... */
  dataUrl: string;
}

export interface Box01 {
  x: number;
  y: number;
  w: number;
  h: number;
}

function requireContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is not available');
  return context;
}

/** Scales (width, height) so the longer side is at most maxSide. Never scales up. */
export function fitWithin(width: number, height: number, maxSide: number): FrameSize {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Draws the video's current frame and encodes it as JPEG. Returns null until the video has data. */
export function captureVideoFrame(video: HTMLVideoElement, maxWidth: number, quality: number): CapturedFrame | null {
  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return null;

  const size = fitWithin(video.videoWidth, video.videoHeight, maxWidth);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  requireContext(canvas).drawImage(video, 0, 0, size.width, size.height);
  return { ...size, dataUrl: canvas.toDataURL('image/jpeg', quality) };
}

/**
 * Captures a larger frame for the object sheet. The crop is taken from this one,
 * so the photo shows the object at higher resolution.
 */
export function captureVideoFrameHighRes(video: HTMLVideoElement, maxSide: number, quality = 0.9): CapturedFrame | null {
  return captureVideoFrame(video, maxSide, quality);
}

/** Tiny grayscale grid used to decide whether the scene changed. Reads the live video directly. */
export function sceneSignature(video: HTMLVideoElement, size: number): Float32Array | null {
  if (video.readyState < 2 || video.videoWidth === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = requireContext(canvas);
  context.drawImage(video, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;

  const gray = new Float32Array(size * size);
  for (let index = 0; index < gray.length; index += 1) {
    const offset = index * 4;
    gray[index] = (0.299 * pixels[offset] + 0.587 * pixels[offset + 1] + 0.114 * pixels[offset + 2]) / 255;
  }
  return gray;
}

/** Mean absolute difference between two signatures, on a 0..1 scale. */
export function signatureDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 1;
  let total = 0;
  for (let index = 0; index < a.length; index += 1) {
    total += Math.abs(a[index] - b[index]);
  }
  return total / a.length;
}

export function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not be loaded'));
    image.src = source;
  });
}

/**
 * Crops a frame to a detected box, with padding as a fraction of the box size.
 * The box is in 0..1 coordinates of the frame.
 */
export async function cropFrame(dataUrl: string, box: Box01, paddingRatio: number): Promise<string> {
  const image = await loadImage(dataUrl);
  const padX = box.w * paddingRatio;
  const padY = box.h * paddingRatio;

  const left = Math.max(0, (box.x - padX) * image.naturalWidth);
  const top = Math.max(0, (box.y - padY) * image.naturalHeight);
  const right = Math.min(image.naturalWidth, (box.x + box.w + padX) * image.naturalWidth);
  const bottom = Math.min(image.naturalHeight, (box.y + box.h + padY) * image.naturalHeight);

  const width = Math.max(1, Math.round(right - left));
  const height = Math.max(1, Math.round(bottom - top));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  requireContext(canvas).drawImage(image, left, top, width, height, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

/** Reads an uploaded photo and scales it down. Used by the "Choose a photo" fallback. */
export async function fileToFrame(file: File, maxSide: number): Promise<CapturedFrame> {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const size = fitWithin(image.naturalWidth, image.naturalHeight, maxSide);

  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  requireContext(canvas).drawImage(image, 0, 0, size.width, size.height);
  return { ...size, dataUrl: canvas.toDataURL('image/jpeg', 0.9) };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('File could not be read'));
    };
    reader.onerror = () => reject(new Error('File could not be read'));
    reader.readAsDataURL(file);
  });
}

import { ProviderHttpError } from '../vision/perceptron';

/**
 * ElevenLabs text-to-speech, server side only. Endpoint and field names follow
 * https://elevenlabs.io/docs/api-reference/text-to-speech/convert. Verify against
 * the current docs if the account reports a validation error.
 */
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MODEL_ID = 'eleven_multilingual_v2';
const OUTPUT_FORMAT = 'mp3_44100_128';

export interface SpeechRequest {
  apiKey: string;
  voiceId: string;
  text: string;
  speed: number;
  signal: AbortSignal;
}

export async function synthesizeSpeech(request: SpeechRequest): Promise<ArrayBuffer> {
  const url = `${ELEVENLABS_BASE_URL}/${encodeURIComponent(request.voiceId)}?output_format=${OUTPUT_FORMAT}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
      'xi-api-key': request.apiKey,
    },
    body: JSON.stringify({
      text: request.text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: request.speed,
      },
    }),
    signal: request.signal,
  });

  if (!response.ok) {
    throw new ProviderHttpError('ElevenLabs', response.status);
  }
  return response.arrayBuffer();
}

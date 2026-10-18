import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PERCEPTRON_MODEL, forgetRejectedModels, perceptronMode, perceptronModels, rejectedModelNames, runConfirm, runDetection } from './runDetection';

const JPEG = '/9j/4AAQSkZJRgABAQ==';
const request = { imageBase64: JPEG, mimeType: 'image/jpeg' as const, frame: { width: 640, height: 480 } };
const env = { PERCEPTRON_API_KEY: 'test-key', PERCEPTRON_MODEL_LIVE: 'ghost-model' };

const ok = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }), { status: 200 });
const notFound = () => new Response(JSON.stringify({ error: { message: 'no such model', code: 'model_not_found' } }), { status: 404 });

const bodies: Record<string, unknown>[] = [];

beforeEach(() => {
  forgetRejectedModels();
  bodies.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(responses: (() => Response)[]) {
  let index = 0;
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)) as Record<string, unknown>);
    const next = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return next();
  }));
}

describe('model slots', () => {
  it('uses the live and confirm slots and falls back to PERCEPTRON_MODEL', () => {
    expect(perceptronModels({ PERCEPTRON_MODEL_LIVE: 'a', PERCEPTRON_MODEL_CONFIRM: 'b', PERCEPTRON_MODEL: 'c' }, 'live')).toEqual({ model: 'a', fallbackModel: 'c' });
    expect(perceptronModels({ PERCEPTRON_MODEL_LIVE: 'a', PERCEPTRON_MODEL_CONFIRM: 'b', PERCEPTRON_MODEL: 'c' }, 'confirm')).toEqual({ model: 'b', fallbackModel: 'c' });
    expect(perceptronModels({}, 'live')).toEqual({ model: DEFAULT_PERCEPTRON_MODEL, fallbackModel: DEFAULT_PERCEPTRON_MODEL });
  });

  it('asks for native boxes on the live loop and JSON for a confirm call', () => {
    expect(perceptronMode({}, 'live')).toBe('box');
    expect(perceptronMode({ PERCEPTRON_BOX_MODE: 'json' }, 'live')).toBe('json');
    expect(perceptronMode({}, 'confirm')).toBe('json');
  });
});

describe('runDetection with Perceptron', () => {
  it('sends the box-mode request and reads native markup', async () => {
    stubFetch([() => ok('<point_box mention="mug" asset_idx="0"> (100,200) (300,600) </point_box>')]);
    const result = await runDetection(request, { PERCEPTRON_API_KEY: 'test-key' });
    expect(bodies[0]).toMatchObject({ model: DEFAULT_PERCEPTRON_MODEL, reasoning_effort: 'none', vision_config: { annotation_format: 'box' } });
    expect(result.mode).toBe('box');
    expect(result.model).toBe(DEFAULT_PERCEPTRON_MODEL);
    expect(result.objects).toHaveLength(1);
    expect(result.objects[0]).toMatchObject({ label: 'mug', confidence: 1 });
    expect(result.objects[0].x).toBeCloseTo(0.1);
    expect(result.objects[0].y).toBeCloseTo(0.2);
    expect(result.objects[0].w).toBeCloseTo(0.2);
    expect(result.objects[0].h).toBeCloseTo(0.4);
  });

  it('falls back to PERCEPTRON_MODEL when the API rejects the live model, and remembers it', async () => {
    stubFetch([notFound, () => ok('<point_box mention="chair"> (0,0) (500,500) </point_box>')]);
    const result = await runDetection(request, env);
    expect(bodies.map((body) => body.model)).toEqual(['ghost-model', DEFAULT_PERCEPTRON_MODEL]);
    expect(result.model).toBe(DEFAULT_PERCEPTRON_MODEL);
    expect(rejectedModelNames()).toEqual(['ghost-model']);

    bodies.length = 0;
    stubFetch([() => ok('<point_box mention="chair"> (0,0) (500,500) </point_box>')]);
    await runDetection(request, env);
    expect(bodies.map((body) => body.model)).toEqual([DEFAULT_PERCEPTRON_MODEL]);
  });

  it('uses the JSON prompt for a confirm call and keeps the confidence', async () => {
    stubFetch([() => ok('[{"label": "mug", "confidence": 0.55, "box": [100, 200, 300, 600]}]')]);
    const result = await runDetection({ ...request, purpose: 'confirm' }, { PERCEPTRON_API_KEY: 'test-key' });
    expect(bodies[0]).not.toHaveProperty('vision_config');
    expect(result.mode).toBe('json');
    expect(result.objects[0]).toMatchObject({ label: 'mug', confidence: 0.55 });
  });

  it('treats a plain-text box-mode answer as nothing seen', async () => {
    stubFetch([() => ok('Nothing clear is visible.')]);
    const result = await runDetection(request, { PERCEPTRON_API_KEY: 'test-key' });
    expect(result.objects).toEqual([]);
  });
});

describe('runConfirm with Perceptron', () => {
  it('sends the schema request on the confirm slot and reads the answer', async () => {
    stubFetch([() => ok('{"label": "mug", "alternatives": ["cup"], "confidence": 0.42}')]);
    const result = await runConfirm({ ...request, purpose: 'confirm' }, { PERCEPTRON_API_KEY: 'test-key', PERCEPTRON_MODEL_CONFIRM: 'perceptron-mk1.5' });
    expect(bodies[0]).toMatchObject({ model: 'perceptron-mk1.5', reasoning_effort: 'none' });
    expect(bodies[0].response_format).toMatchObject({ type: 'json_schema' });
    expect(result).toMatchObject({ label: 'mug', alternatives: ['cup'], confidence: 0.42, model: 'perceptron-mk1.5', provider: 'perceptron' });
  });

  it('falls back to PERCEPTRON_MODEL when the confirm model is rejected', async () => {
    stubFetch([notFound, () => ok('{"label": "mug", "alternatives": [], "confidence": 0.9}')]);
    const result = await runConfirm({ ...request, purpose: 'confirm' }, { PERCEPTRON_API_KEY: 'test-key', PERCEPTRON_MODEL_CONFIRM: 'ghost-confirm' });
    expect(bodies.map((body) => body.model)).toEqual(['ghost-confirm', DEFAULT_PERCEPTRON_MODEL]);
    expect(result.model).toBe(DEFAULT_PERCEPTRON_MODEL);
  });

  it('reports an unreadable answer as a calm retry', async () => {
    stubFetch([() => ok('I am not sure.')]);
    await expect(runConfirm({ ...request, purpose: 'confirm' }, { PERCEPTRON_API_KEY: 'test-key' })).rejects.toMatchObject({ code: 'unreadable' });
  });
});

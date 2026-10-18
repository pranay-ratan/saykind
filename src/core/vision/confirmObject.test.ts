import { describe, expect, it } from 'vitest';
import { buildConfirmBody, needsConfirmation, parseConfirmReply } from './confirmObject';

describe('buildConfirmBody', () => {
  it('asks for a strict JSON schema answer with no reasoning', () => {
    const body = buildConfirmBody('perceptron-mk1.5', 'data:image/jpeg;base64,abc');
    expect(body).toMatchObject({ model: 'perceptron-mk1.5', reasoning_effort: 'none', temperature: 0 });
    expect(body.response_format).toMatchObject({ type: 'json_schema', json_schema: { name: 'object_name', strict: true } });
  });
});

describe('parseConfirmReply', () => {
  it('reads the label, alternatives and confidence', () => {
    expect(parseConfirmReply('{"label": "pagoda", "alternatives": ["temple"], "confidence": 0.95}')).toEqual({ label: 'pagoda', alternatives: ['temple'], confidence: 0.95 });
  });

  it('cleans labels and drops alternatives that repeat the label', () => {
    expect(parseConfirmReply('{"label": "Glass (drink container)", "alternatives": ["glass", "Cup", "cup", "jar"], "confidence": 0.4}')).toEqual({ label: 'glass', alternatives: ['cup', 'jar'], confidence: 0.4 });
  });

  it('clamps the confidence and tolerates prose around the JSON', () => {
    expect(parseConfirmReply('Sure: {"label": "mug", "alternatives": [], "confidence": 1.4}')?.confidence).toBe(1);
    expect(parseConfirmReply('{"label": "mug", "alternatives": [], "confidence": "high"}')?.confidence).toBe(0);
  });

  it('returns null when there is no usable label', () => {
    expect(parseConfirmReply('nothing here')).toBeNull();
    expect(parseConfirmReply('{"label": "", "alternatives": [], "confidence": 0.9}')).toBeNull();
  });
});

describe('needsConfirmation', () => {
  it('asks only when the confidence is low', () => {
    expect(needsConfirmation({ label: 'mug', alternatives: [], confidence: 0.4 })).toBe(true);
    expect(needsConfirmation({ label: 'mug', alternatives: [], confidence: 0.5 })).toBe(false);
  });
});

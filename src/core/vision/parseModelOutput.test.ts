import { describe, expect, it } from 'vitest';
import { ModelOutputError, parseModelOutput } from './parseModelOutput';

describe('parseModelOutput', () => {
  it('reads a plain JSON array of labelled boxes', () => {
    const reply = '[{"label": "mug", "confidence": 0.92, "box": [120, 340, 310, 620]}]';
    expect(parseModelOutput(reply)).toEqual([
      { label: 'mug', confidence: 0.92, box: [120, 340, 310, 620] },
    ]);
  });

  it('ignores code fences and prose around the array', () => {
    const reply = 'Here you go:\n```json\n[{"label": "lamp", "confidence": 0.8, "box": [1, 2, 3, 4]}]\n```';
    expect(parseModelOutput(reply)).toHaveLength(1);
  });

  it('accepts bbox as an alias for box', () => {
    const reply = '[{"label": "cup", "bbox": [10, 20, 30, 40]}]';
    expect(parseModelOutput(reply)[0].box).toEqual([10, 20, 30, 40]);
  });

  it('accepts top_left and bottom_right corner points', () => {
    const reply = '[{"label": "cup", "top_left": {"x": 10, "y": 20}, "bottom_right": {"x": 30, "y": 40}}]';
    expect(parseModelOutput(reply)[0].box).toEqual([10, 20, 30, 40]);
  });

  it('parses confidence given as a string', () => {
    const reply = '[{"label": "cup", "confidence": "0.7", "box": [1, 2, 3, 4]}]';
    expect(parseModelOutput(reply)[0].confidence).toBe(0.7);
  });

  it('skips items without a usable box or label', () => {
    const reply = '[{"label": "cup"}, {"box": [1, 2, 3, 4]}, {"label": "pen", "box": [1, 2, 3, 4]}]';
    expect(parseModelOutput(reply).map((item) => item.label)).toEqual(['pen']);
  });

  it('throws a ModelOutputError when there is no array', () => {
    expect(() => parseModelOutput('I see a mug.')).toThrow(ModelOutputError);
  });

  it('throws a ModelOutputError for malformed JSON', () => {
    expect(() => parseModelOutput('[{"label": "mug",}]')).toThrow(ModelOutputError);
  });
});

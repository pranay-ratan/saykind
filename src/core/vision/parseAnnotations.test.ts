import { describe, expect, it } from 'vitest';
import { hasBoxMarkup, parseBoxAnnotations } from './parseAnnotations';

describe('parseBoxAnnotations', () => {
  it('reads boxes with their mention on the 0..1000 grid', () => {
    const content = '<point_box mention="mug" asset_idx="0"> (120,340) (310,620) </point_box>\n<point_box mention="chair"> (0,657) (475,1000) </point_box>';
    expect(parseBoxAnnotations(content)).toEqual([
      { label: 'mug', confidence: null, box: [120, 340, 310, 620] },
      { label: 'chair', confidence: null, box: [0, 657, 475, 1000] },
    ]);
  });

  it('ignores prose around the markup and boxes without a mention', () => {
    const content = 'I can see a cup. <point_box> (768,408) (893,703) </point_box> and <point_box mention="cup"> (768,408) (893,703) </point_box>';
    expect(parseBoxAnnotations(content)).toEqual([{ label: 'cup', confidence: null, box: [768, 408, 893, 703] }]);
  });

  it('decodes escaped characters in the mention', () => {
    expect(parseBoxAnnotations('<point_box mention="salt &amp; pepper"> (1,2) (3,4) </point_box>')[0].label).toBe('salt & pepper');
  });

  it('returns nothing for a plain-text answer', () => {
    expect(parseBoxAnnotations('Nothing clear is visible.')).toEqual([]);
    expect(hasBoxMarkup('Nothing clear is visible.')).toBe(false);
    expect(hasBoxMarkup('<point_box mention="x"> (1,1) (2,2) </point_box>')).toBe(true);
  });
});

'use client';

import { CAMERA_CONFIG } from '../../config/camera';
import type { Level2Settings } from '../../core/settings';

interface SettingsSheetProps {
  open: boolean;
  settings: Level2Settings;
  onChange: (next: Level2Settings) => void;
  onClose: () => void;
}

const CHOICE_BUTTON = 'flex-1 min-h-[64px] rounded-full text-xl font-medium transition-colors focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal';
const SELECTED = 'bg-deep-teal text-white';
const UNSELECTED = 'border-2 border-deep-teal bg-cream text-plum hover:bg-lavender/25';

const INTERVAL_LABELS: Readonly<Record<number, string>> = { 1000: '1 sec', 1500: '1.5 sec', 3000: '3 sec' };
const RATE_LABELS: Readonly<Record<number, string>> = { 0.7: 'Slow', 1: 'Normal', 1.3: 'Fast' };

interface SwitchRowProps {
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}

function SwitchRow({ label, checked, onToggle }: SwitchRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onToggle(!checked)}
      className="w-full min-h-[64px] flex items-center justify-between gap-4 rounded-full bg-cream px-5 text-xl text-plum focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal"
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-9 w-16 shrink-0 rounded-full transition-colors ${checked ? 'bg-deep-teal' : 'bg-plum/15'}`}
      >
        <span
          className={`absolute top-1 h-7 w-7 rounded-full bg-cream shadow transition-transform motion-reduce:transition-none ${checked ? 'translate-x-8' : 'translate-x-1'}`}
        />
      </span>
    </button>
  );
}

export function SettingsSheet({ open, settings, onChange, onClose }: SettingsSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-plum/40">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[2rem] bg-cream p-6 pb-10 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="settings-title" className="text-2xl font-semibold text-plum">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-h-[64px] min-w-[64px] flex items-center justify-center rounded-full border-2 border-deep-teal bg-cream text-plum hover:bg-lavender/25 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-deep-teal"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <SwitchRow
            label="Look at the room"
            checked={settings.liveDetection}
            onToggle={(next) => onChange({ ...settings, liveDetection: next })}
          />

          <fieldset>
            <legend className="text-xl text-muted mb-3">How often to look</legend>
            <div className="flex gap-3">
              {CAMERA_CONFIG.intervalChoicesMs.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={settings.intervalMs === value}
                  onClick={() => onChange({ ...settings, intervalMs: value })}
                  className={`${CHOICE_BUTTON} ${settings.intervalMs === value ? SELECTED : UNSELECTED}`}
                >
                  {INTERVAL_LABELS[value]}
                </button>
              ))}
            </div>
          </fieldset>

          <SwitchRow
            label="Say the word when I tap"
            checked={settings.autoSpeak}
            onToggle={(next) => onChange({ ...settings, autoSpeak: next })}
          />

          <fieldset>
            <legend className="text-xl text-muted mb-3">Voice speed</legend>
            <div className="flex gap-3">
              {CAMERA_CONFIG.voiceRateChoices.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={settings.voiceRate === value}
                  onClick={() => onChange({ ...settings, voiceRate: value })}
                  className={`${CHOICE_BUTTON} ${settings.voiceRate === value ? SELECTED : UNSELECTED}`}
                >
                  {RATE_LABELS[value]}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </section>
    </div>
  );
}

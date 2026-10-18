'use client';

import type { DetectFailure } from '../../core/vision/detectObjects';
import type { LiveBlockReason } from '../../core/camera/liveGate';

interface DebugPanelProps {
  provider?: string;
  latencyMs?: number;
  callsUsed: number;
  maxCalls: number;
  blockReason: LiveBlockReason | null;
  failure: DetectFailure | null;
  showRawBoxes: boolean;
  onToggleRawBoxes: () => void;
}

/** Visible with ?debug=1. Shows what the last detection did, so alignment and budget can be checked. */
export function DebugPanel({
  provider,
  latencyMs,
  callsUsed,
  maxCalls,
  blockReason,
  failure,
  showRawBoxes,
  onToggleRawBoxes,
}: DebugPanelProps) {
  return (
    <div className="absolute left-4 bottom-4 max-w-xs space-y-2 rounded-xl bg-black/80 p-4 text-sm text-white">
      <div>Provider: {provider ?? 'none yet'}</div>
      <div>Latency: {latencyMs === undefined ? 'n/a' : `${latencyMs} ms`}</div>
      <div>
        Calls: {callsUsed} / {maxCalls}
      </div>
      <div>Loop: {blockReason ?? 'looking'}</div>
      <div>Last failure: {failure ?? 'none'}</div>
      <button
        type="button"
        onClick={onToggleRawBoxes}
        aria-pressed={showRawBoxes}
        className="mt-1 min-h-[44px] rounded bg-white/20 px-3 hover:bg-white/30"
      >
        {showRawBoxes ? 'Hide raw boxes' : 'Show raw boxes'}
      </button>
    </div>
  );
}

import { connection } from 'next/server';
import { Suspense } from 'react';
import { buildClientConfig } from '../../src/config/clientConfig';
import { LiveCamera } from '../../src/ui/level2/LiveCamera';

/** Reads env at request time. Only numbers and the TTS mode reach the browser; keys stay on the server. */
async function LiveCameraWithServerConfig() {
  await connection();
  return <LiveCamera config={buildClientConfig(process.env)} />;
}

export default function Level2Page() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-stone-950" aria-busy="true" />}>
      <LiveCameraWithServerConfig />
    </Suspense>
  );
}

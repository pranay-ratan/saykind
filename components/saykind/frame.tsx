"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import CafeAmbient from "@/components/cafe/CafeAmbient";

/**
 * Saykind is designed as a phone. On a phone the app fills the screen. On a wider screen it sits in a portrait
 * "window" (with a soft blur of the café around it), and everything inside measures that window, not the browser.
 */
type FrameSize = { width: number; height: number; short: boolean };
const FrameContext = createContext<FrameSize>({ width: 390, height: 844, short: false });

export const useFrame = () => useContext(FrameContext);

export function Frame({ children, note }: { children: ReactNode; note?: ReactNode }) {
  const [size, setSize] = useState<FrameSize>({ width: 390, height: 844, short: false });
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((previous) => (Math.abs(previous.width - width) < 1 && Math.abs(previous.height - height) < 1 ? previous : { width, height, short: height < 720 }));
  }, []);
  const value = useMemo(() => size, [size]);

  return (
    <main className="app">
      <CafeAmbient />
      {note}
      <div className="frame">
        <FrameContext.Provider value={value}>
          <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
            {children}
          </View>
        </FrameContext.Provider>
      </div>
    </main>
  );
}

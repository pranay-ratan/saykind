"use client";

import { useState } from "react";
import { ScrollView, Text, View, type ViewStyle } from "react-native";
import CafeArt from "@/components/cafe/Art";
import { CheckIcon, CloseIcon, SnailIcon, SpeakerIcon } from "@/components/cafe/icons";
import { useOrderCard } from "@/lib/saykind/controllers/use-cafe";
import type { Order } from "@/lib/order";
import { Body, Button, Heading, IconButton, Label, Screen } from "./kit";
import { color, font, safe } from "./theme";

/** TEMPORARY end-of-café screen: what was ordered, and a large card to use in a real café. */
export default function CafeDoneView({ order, onAgain, onHome, onReport }: { order: Order; onAgain: () => void; onHome: () => void; onReport?: () => void }) {
  const card = useOrderCard(order);
  const [showing, setShowing] = useState(false);
  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, alignItems: "center", padding: 24, paddingTop: `calc(${safe.top} + 56px)`, paddingBottom: `calc(${safe.bottom} + 24px)`, gap: 14 }}>
        <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: color.primarySoft, alignItems: "center", justifyContent: "center", color: color.primary } as ViewStyle}>
          <CheckIcon className="size-8" />
        </View>
        <Heading size={30} style={{ textAlign: "center" }}>
          {card.hasOrder ? "Your order is in." : "Thank you for practicing."}
        </Heading>
        {card.lines.length > 0 ? (
          <View style={{ alignSelf: "stretch", gap: 8, marginTop: 6 }}>
            <Label>What you asked for</Label>
            {card.lines.map((line) => (
              <View key={line.art + line.text} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: color.line, backgroundColor: color.surface }}>
                <View style={{ width: 56, height: 56 }}>
                  <CafeArt id={line.art} />
                </View>
                <Text style={{ fontFamily: font.ui, fontSize: 20, fontWeight: "700", color: color.ink }}>{line.text}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        <View style={{ alignSelf: "stretch", gap: 10, paddingTop: 20 }}>
          {onReport ? <Button label="Make a report for my doctor" onPress={onReport} style={{ alignSelf: "stretch" }} /> : null}
          {card.hasOrder ? <Button label="Use in a real café" kind={onReport ? "secondary" : "primary"} onPress={() => setShowing(true)} style={{ alignSelf: "stretch" }} /> : null}
          <Button label="Order again" kind="secondary" onPress={onAgain} style={{ alignSelf: "stretch" }} />
          <Button label="Back to learning" kind="secondary" onPress={onHome} style={{ alignSelf: "stretch" }} />
        </View>
      </ScrollView>

      {showing && (
        <View style={{ position: "absolute", inset: 0, zIndex: 40, backgroundColor: color.bg, paddingTop: `calc(${safe.top} + 12px)`, paddingBottom: `calc(${safe.bottom} + 22px)`, paddingHorizontal: 22 } as ViewStyle} role="dialog" aria-modal aria-label="Your order, to show at a counter">
          <View style={{ alignItems: "flex-end" }}>
            <IconButton label="Close" onPress={() => { card.stop(); setShowing(false); }} size={48}>
              <CloseIcon className="size-5" />
            </IconButton>
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 24 }}>
            <Label>I'd like to say</Label>
            <Text style={{ fontFamily: font.ui, fontWeight: "800", fontSize: 40, lineHeight: 48, letterSpacing: -0.8, color: color.ink, textAlign: "center", maxWidth: 360 }}>{card.sentence}</Text>
            <View style={{ flexDirection: "row", gap: 24 }}>
              <IconButton label="Play aloud" caption={card.isPlayingAudio ? "Playing…" : "Play aloud"} size={84} tone="primary" onPress={card.play}>
                <SpeakerIcon className="size-9" />
              </IconButton>
              <IconButton label="Play aloud, slowly" caption="Slowly" size={84} active={card.isPlayingSlowAudio} onPress={card.playSlowly}>
                <SnailIcon className="size-10" />
              </IconButton>
            </View>
            <Body size={15} style={{ textAlign: "center", maxWidth: 300 }}>
              Show this to the person at the counter, or play it aloud from this phone.
            </Body>
          </View>
        </View>
      )}
    </Screen>
  );
}

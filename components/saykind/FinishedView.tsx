"use client";

import { ScrollView, Text, View, type ViewStyle } from "react-native";
import { CheckIcon } from "@/components/cafe/icons";
import type { ExerciseController } from "@/lib/saykind";
import { Body, Button, Heading, Screen } from "./kit";
import { color, font, safe } from "./theme";

/** TEMPORARY "that's the set" screen: calm, no score, no claim of improvement. */
export default function FinishedView({ exercise, onAgain, onNext, nextLabel }: { exercise: ExerciseController; onAgain: () => void; onNext?: () => void; nextLabel?: string }) {
  const worked = exercise.items.filter((item) => exercise.completedIds.includes(item.id));
  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, alignItems: "center", padding: 24, paddingTop: `calc(${safe.top} + 64px)`, paddingBottom: `calc(${safe.bottom} + 24px)`, gap: 14 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: color.primarySoft, alignItems: "center", justifyContent: "center", color: color.primary } as ViewStyle}>
          <CheckIcon className="size-8" />
        </View>
        <Heading size={32} style={{ textAlign: "center" }}>
          Thank you for practicing.
        </Heading>
        <Body size={18} style={{ textAlign: "center", maxWidth: 320 }}>
          {worked.length > 0 ? `You worked on ${worked.length} of ${exercise.total}. Come back whenever you like.` : "Come back to these whenever you like."}
        </Body>
        {worked.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 }}>
            {worked.map((item) => (
              <View key={item.id} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line }}>
                <Text style={{ fontFamily: font.ui, fontSize: 20, fontWeight: "700", color: color.ink }}>{item.text}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        <View style={{ gap: 10, alignSelf: "stretch", paddingTop: 20 }}>
          <Button label="Practice again" onPress={onAgain} style={{ alignSelf: "stretch" }} />
          {onNext ? <Button label={nextLabel ?? "Next"} kind="secondary" onPress={onNext} style={{ alignSelf: "stretch" }} /> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

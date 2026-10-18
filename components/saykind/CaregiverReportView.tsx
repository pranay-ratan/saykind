"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Pressable, ScrollView, Text, View, type ViewStyle } from "react-native";
import { relativeTime, useCaregiverReport, type WordSummary } from "@/lib/saykind";
import { color, font } from "./theme";

/**
 * TEMPORARY caregiver report, bound to useCaregiverReport() (which has already filtered everything by what the person
 * authorized). Every recognition result is labelled uncertain; there are no scores. PROTOTYPE: same-device data only.
 */
const LEVEL_NAME: Record<number, string> = { 1: "Objects", 2: "Discover", 3: "Café", 4: "Phrases" };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Pill({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "on" | "off" | "note" }) {
  const p = { plain: [color.surfaceStrong, color.ink], on: [color.primarySoft, color.primaryDark], off: [color.surface, color.inkMuted], note: [color.accentSoft, color.accent] }[tone];
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: p[0] }}>
      <Text style={{ fontFamily: font.ui, fontSize: 13, fontWeight: "700", color: p[1] }}>{children}</Text>
    </View>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Text role="heading" style={{ fontFamily: font.ui, fontWeight: "800", fontSize: 22, color: color.ink }}>
          {title}
        </Text>
        {hint ? <Text style={{ fontFamily: font.ui, fontSize: 14, lineHeight: 20, color: color.inkMuted }}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, minWidth: 130, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: color.line, backgroundColor: color.bg }}>
      <Text style={{ fontFamily: font.ui, fontWeight: "800", fontSize: 30, color: color.ink }}>{value}</Text>
      <Text style={{ fontFamily: font.ui, fontSize: 14, color: color.inkMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function WordRow({ word, assistance }: { word: WordSummary; assistance: boolean }) {
  const recognised = word.matches + word.differs + word.nothing + word.errors;
  return (
    <View style={{ paddingVertical: 14, borderTopWidth: 1, borderColor: color.line, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <Text style={{ fontFamily: font.ui, fontWeight: "800", fontSize: 20, color: color.ink }}>{word.itemText}</Text>
        <Text style={{ fontFamily: font.ui, fontSize: 12, fontWeight: "700", color: color.inkMuted, letterSpacing: 1, textTransform: "uppercase" }}>{LEVEL_NAME[word.level]}</Text>
        <Text style={{ fontFamily: font.ui, fontSize: 14, color: color.inkMuted, marginLeft: "auto" }}>{relativeTime(word.lastTs)}</Text>
      </View>
      <Text style={{ fontFamily: font.ui, fontSize: 16, color: color.ink }}>
        {plural(word.attempts, "try", "tries")}
        {word.retries > 0 ? `, including ${plural(word.retries, "retry", "retries")}` : ""}
        {word.selfConfirmed > 0 ? `. They said “that's what I said” ${word.selfConfirmed}×.` : ""}
      </Text>
      {assistance && (word.normalPlays > 0 || word.slowPlays > 0 || word.helpUses > 0) ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {word.normalPlays > 0 ? <Pill>Heard {word.normalPlays}×</Pill> : null}
          {word.slowPlays > 0 ? <Pill>Slow audio {word.slowPlays}×</Pill> : null}
          {word.helpUses > 0 ? <Pill>Help or hints {word.helpUses}×</Pill> : null}
        </View>
      ) : null}
      {recognised > 0 ? (
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: font.ui, fontSize: 14, color: color.inkSoft }}>Computer heard (uncertain): {word.heard.length ? word.heard.map((h) => `“${h.text.replace(/[.!?]+$/, "")}”`).join(", ") : "nothing clear"}</Text>
          <Text style={{ fontFamily: font.ui, fontSize: 13, color: color.inkMuted }}>
            Matched the word on {word.matches} of {recognised} tries. Recognition can be wrong, so this is not a measure of pronunciation.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function CaregiverReportView() {
  const router = useRouter();
  const r = useCaregiverReport();
  const [copied, setCopied] = useState("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(r.reportText());
      setCopied("Copied.");
    } catch {
      setCopied("Couldn't copy. You can select the text on this page instead.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.page, minHeight: "100vh" as never }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 60, alignItems: "center" }}>
        <View style={{ width: "100%", maxWidth: 760, gap: 28 }}>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Text style={{ fontFamily: font.ui, fontWeight: "800", fontSize: 26, color: color.ink }}>Saykind</Text>
              <Text style={{ fontFamily: font.ui, fontSize: 13, fontWeight: "700", letterSpacing: 1.5, color: color.inkMuted, textTransform: "uppercase" }}>Caregiver view</Text>
              <Pill tone="note">Prototype</Pill>
            </View>
            <Text role="heading" style={{ fontFamily: font.ui, fontWeight: "800", fontSize: 34, lineHeight: 40, color: color.ink, letterSpacing: -0.5 }}>
              {r.caregiverName ? `Hi ${r.caregiverName}. ` : ""}Here is what's being shared with you.
            </Text>
            <Text style={{ fontFamily: font.ui, fontSize: 16, lineHeight: 24, color: color.inkSoft }}>This shows practice saved on this device. The person using Saykind chooses what appears here, and can change it at any time.</Text>
            <Pressable accessibilityRole="link" accessibilityLabel="Back to Saykind" onPress={() => router.push("/")} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
              <Text style={{ fontFamily: font.ui, fontSize: 16, fontWeight: "700", color: color.primary, textDecorationLine: "underline" }}>Back to Saykind</Text>
            </Pressable>
          </View>

          <Section title="What the person is sharing">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Pill tone={r.sharing.progress ? "on" : "off"}>{`Words and tries: ${r.sharing.progress ? "shared" : "not shared"}`}</Pill>
              <Pill tone={r.sharing.assistance ? "on" : "off"}>{`Help used: ${r.sharing.assistance ? "shared" : "not shared"}`}</Pill>
              <Pill tone={r.sharing.audio ? "on" : "off"}>{`Recordings: ${r.sharing.audio ? "shared" : "not shared"}`}</Pill>
              <Pill tone={r.sharing.helpRequests ? "on" : "off"}>{`Help requests: ${r.sharing.helpRequests ? "shared" : "not shared"}`}</Pill>
            </View>
          </Section>

          <View style={{ padding: 16, borderRadius: 16, backgroundColor: color.accentSoft, borderWidth: 1, borderColor: "#F0CFA8", gap: 4 }}>
            <Text style={{ fontFamily: font.ui, fontSize: 15, fontWeight: "800", color: color.accent }}>About these results</Text>
            <Text style={{ fontFamily: font.ui, fontSize: 15, lineHeight: 22, color: color.ink }}>
              “Computer heard” is the output of automatic speech recognition. It can be wrong for any voice, and it is especially unreliable for speech affected by aphasia. It is not a clinical measure of pronunciation and Saykind gives no scores. Use it as a prompt for conversation, and trust your own listening and a speech-language pathologist's judgement.
            </Text>
          </View>

          {!r.isAnythingShared ? (
            <Section title="Nothing is shared yet">
              <Text style={{ fontFamily: font.ui, fontSize: 17, lineHeight: 26, color: color.ink }}>
                {r.caregiverName ? `${r.caregiverName}, ` : ""}practice details appear here only after the person turns sharing on in Saykind, under Settings. That choice is theirs.
              </Text>
            </Section>
          ) : (
            <>
              {r.totals && (
                <>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    <Stat value={String(r.totals.wordsPracticed)} label="Words or phrases practiced" />
                    <Stat value={String(r.totals.attempts)} label="Speaking tries" />
                    <Stat value={String(r.totals.retries)} label="Retries" />
                    <Stat value={r.totals.lastPracticeTs ? relativeTime(r.totals.lastPracticeTs) : "–"} label="Last practice" />
                  </View>
                  <Section title="Word by word" hint="Newest first.">
                    {r.words.length === 0 ? <Text style={{ fontFamily: font.ui, fontSize: 16, color: color.inkMuted }}>No practice recorded yet.</Text> : <View>{r.words.map((w) => <WordRow key={`${w.level}-${w.itemId}`} word={w} assistance={r.sharing.assistance} />)}</View>}
                  </Section>
                  {r.mayBenefitFromPractice.length > 0 && (
                    <Section title="May benefit from more practice" hint="Suggestions from how often help or retries were used. They are prompts, not conclusions.">
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {r.mayBenefitFromPractice.map((w) => (
                          <Pill key={`${w.level}-${w.itemId}`} tone="note">
                            {w.itemText}
                          </Pill>
                        ))}
                      </View>
                    </Section>
                  )}
                </>
              )}

              {r.sharing.helpRequests && (
                <Section title="Help requests">
                  {r.helpRequests.length === 0 ? (
                    <Text style={{ fontFamily: font.ui, fontSize: 16, color: color.inkMuted }}>No help requests.</Text>
                  ) : (
                    r.helpRequests.map((e, i) => (
                      <Text key={i} style={{ fontFamily: font.ui, fontSize: 16, color: color.ink, paddingVertical: 6 }}>
                        {e.action === "call-started" ? "Opened the call screen to call you" : e.action === "summary-opened" ? "Opened a message to you" : e.action === "summary-copied" ? "Copied a message for you" : "Opened a share menu with a message for you"}
                        {" · "}
                        {relativeTime(e.ts)}
                      </Text>
                    ))
                  )}
                  <Text style={{ fontFamily: font.ui, fontSize: 13, color: color.inkMuted }}>These show what the person started on their phone. Saykind can't tell whether a call connected or a message was sent.</Text>
                </Section>
              )}

              {r.sharing.audio && (
                <Section title="Recordings shared with you" hint="Only recordings the person approved.">
                  {r.sharedSamples.length === 0 ? (
                    <Text style={{ fontFamily: font.ui, fontSize: 16, color: color.inkMuted }}>No recordings approved.</Text>
                  ) : (
                    r.sharedSamples.map((sample) => (
                      <View key={sample.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: color.line }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: font.ui, fontSize: 16, fontWeight: "800", color: color.ink }}>{sample.kind === "session" ? "Real-world recording" : (sample.itemText ?? "Practice attempt")}</Text>
                          <Text style={{ fontFamily: font.ui, fontSize: 13, color: color.inkMuted }}>{new Date(sample.ts).toLocaleString()}</Text>
                        </View>
                        <Pressable accessibilityRole="button" accessibilityLabel={`Play recording of ${sample.itemText ?? "a conversation"}`} onPress={() => r.playSample(sample.id)} style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: color.ink, justifyContent: "center" } as ViewStyle}>
                          <Text style={{ fontFamily: font.ui, fontSize: 15, fontWeight: "700", color: color.bg }}>{r.playingSampleId === sample.id ? "Playing" : "Play"}</Text>
                        </Pressable>
                      </View>
                    ))
                  )}
                </Section>
              )}

              {r.sharing.progress && (
                <View style={{ gap: 8, alignItems: "flex-start" }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Copy a plain-text summary" onPress={() => void copy()} style={{ minHeight: 48, paddingHorizontal: 22, borderRadius: 24, backgroundColor: color.primary, justifyContent: "center" } as ViewStyle}>
                    <Text style={{ fontFamily: font.ui, fontSize: 16, fontWeight: "700", color: color.onPrimary }}>Copy a plain-text summary</Text>
                  </Pressable>
                  <Text aria-live="polite" style={{ fontFamily: font.ui, fontSize: 14, color: color.inkMuted }}>
                    {copied}
                  </Text>
                </View>
              )}
            </>
          )}

          <View style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: color.line }}>
            <Text style={{ fontFamily: font.ui, fontSize: 15, fontWeight: "800", color: color.ink }}>How this works, and what isn't built yet</Text>
            <Text style={{ fontFamily: font.ui, fontSize: 14, lineHeight: 21, color: color.inkMuted }}>
              This prototype reads the practice record stored in this browser. Seeing it from a caregiver's own phone, receiving alerts, and verifying that the viewer is authorized would need caregiver accounts, a secure server, and a stored record of the person's consent. None of that exists yet, so nothing here is sent anywhere.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

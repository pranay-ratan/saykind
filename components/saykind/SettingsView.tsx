"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Pressable, ScrollView, Switch, Text, TextInput, View, type ViewStyle } from "react-native";
import { ShieldIcon, TrashIcon } from "@/components/cafe/icons";
import { clearReports } from "@/lib/report/store";
import { clearLog, clearProgress, deleteAllSamples, deleteSample, playSample, resetSettings, setApproved, setCaregiver, setDoctor, setKeepPracticeAudio, setShareCategory, useSamples, useSettings } from "@/lib/saykind";
import { Body, Button, Chip, Heading, Label, Panel, Screen, ScreenHeader } from "./kit";
import { color, font, safe } from "./theme";

function Toggle({ label, detail, value, onChange }: { label: string; detail: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 64 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.ui, fontSize: 20, fontWeight: "800", color: color.ink }}>{label}</Text>
        <Body size={14} style={{ marginTop: 2 }}>
          {detail}
        </Body>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: color.primary, false: color.line }} thumbColor="#FFFFFF" accessibilityLabel={label} />
    </Pressable>
  );
}

function Field({ label, value, onChange, placeholder, keyboard }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; keyboard?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: font.ui, fontSize: 20, fontWeight: "700", color: color.inkSoft }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={color.inkMuted} keyboardType={keyboard} accessibilityLabel={label} style={{ minHeight: 64, borderRadius: 14, borderWidth: 2, borderColor: color.control, backgroundColor: color.bg, color: color.ink, paddingHorizontal: 16, fontFamily: font.ui, fontSize: 20 } as never} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Label>{title}</Label>
      {children}
    </View>
  );
}

/** TEMPORARY settings screen. Everything about sharing lives here and starts OFF. Nothing here sends anything anywhere. */
export default function SettingsView({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const settings = useSettings();
  const samples = useSamples();
  const [playing, setPlaying] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const play = (id: string) => {
    stopRef.current?.();
    const sample = samples.find((s) => s.id === id);
    if (!sample) return;
    setPlaying(id);
    stopRef.current = playSample(sample, () => setPlaying((current) => (current === id ? null : current)));
  };

  return (
    <Screen>
      <ScreenHeader title="Settings" eyebrow="Saykind" onBack={onBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: `calc(${safe.bottom} + 40px)`, gap: 28 }}>
        <Section title="Your caregiver">
          <Panel>
            <Field label="Name" value={settings.caregiverName} onChange={(v) => setCaregiver(v, settings.caregiverPhone)} placeholder="For example, Sam" />
            <Field label="Phone number" value={settings.caregiverPhone} onChange={(v) => setCaregiver(settings.caregiverName, v)} placeholder="For the call button" keyboard="phone-pad" />
            <Body size={14}>Kept only on this device. It's used for the phone button, and nowhere else.</Body>
          </Panel>
        </Section>

        <Section title="Your doctor">
          <Panel>
            <Field label="Doctor's name" value={settings.doctorName} onChange={(v) => setDoctor(v, settings.doctorEmail)} placeholder="For example, Dr. Lee" />
            <Field label="Doctor's email" value={settings.doctorEmail} onChange={(v) => setDoctor(settings.doctorName, v)} placeholder="For the report email" keyboard="email-address" />
            <Body size={14}>Kept only on this device. It's used to start an email when you tap "Email to my doctor", and nowhere else.</Body>
          </Panel>
        </Section>

        <Section title="What your caregiver can see">
          <Panel>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <View style={{ color: color.primary } as ViewStyle}>
                <ShieldIcon className="size-6" />
              </View>
              <Body size={15} style={{ flex: 1 }}>
                Everything is off until you turn it on. You can change your mind at any time.
              </Body>
            </View>
            <Toggle label="Which words I practiced" detail="Words, number of tries, and when." value={settings.share.progress} onChange={(v) => setShareCategory("progress", v)} />
            <Toggle label="What help I used" detail="Hearing a word again, slow audio, hints." value={settings.share.assistance} onChange={(v) => setShareCategory("assistance", v)} />
            <Toggle label="My recordings" detail="Only recordings you approve below." value={settings.share.audio} onChange={(v) => setShareCategory("audio", v)} />
            <Toggle label="When I ask for help" detail="That I used the help button, and when." value={settings.share.helpRequests} onChange={(v) => setShareCategory("helpRequests", v)} />
          </Panel>
          <Body size={14}>This prototype keeps everything on this device. A caregiver on another device would need accounts and a secure server, which are not built yet.</Body>
        </Section>

        <Section title="Caregiver view">
          <Panel>
            <Body size={15}>A separate page that shows your caregiver only what you've switched on above. In this prototype it opens on this device.</Body>
            <Button label="Open the caregiver view" kind="secondary" onPress={() => router.push("/caregiver")} style={{ alignSelf: "stretch" }} />
          </Panel>
        </Section>

        <Section title="Practice recordings">
          <Panel>
            <Toggle label="Keep my practice recordings" detail="Saves each attempt on this device so you can listen back. Off by default." value={settings.keepPracticeAudio} onChange={setKeepPracticeAudio} />
            {samples.length === 0 ? (
              <Body size={15}>No recordings saved.</Body>
            ) : (
              <View style={{ gap: 10 }}>
                {samples.slice(0, 20).map((sample) => (
                  <View key={sample.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", paddingVertical: 4 }}>
                    <View style={{ flex: 1, minWidth: 120 }}>
                      <Text numberOfLines={1} style={{ fontFamily: font.ui, fontSize: 20, fontWeight: "800", color: color.ink }}>
                        {sample.kind === "session" ? "Real-world recording" : (sample.itemText ?? "Practice attempt")}
                      </Text>
                      <Body size={13}>{new Date(sample.ts).toLocaleString()}</Body>
                    </View>
                    <Chip label={playing === sample.id ? "Playing" : "Play"} onPress={() => play(sample.id)} />
                    <Chip label={sample.approvedForCaregiver ? "Shared" : "Private"} selected={sample.approvedForCaregiver} onPress={() => void setApproved(sample.id, !sample.approvedForCaregiver)} hint="Choose whether your caregiver may hear this" />
                    <Pressable accessibilityRole="button" accessibilityLabel="Delete this recording" onPress={() => void deleteSample(sample.id)} style={{ padding: 10, color: color.inkMuted } as ViewStyle}>
                      <TrashIcon className="size-5" />
                    </Pressable>
                  </View>
                ))}
                <Button label="Delete all recordings" kind="secondary" onPress={() => void deleteAllSamples()} />
              </View>
            )}
          </Panel>
        </Section>

        <Section title="Your practice history">
          <Panel>
            <Body size={15}>Saykind remembers which words you practiced on this device so it can show you, and only if you allow it, your caregiver.</Body>
            {confirmClear ? (
              <View style={{ gap: 10 }}>
                <Body size={15} tone={color.danger}>
                  This removes your practice history, progress, settings and recordings from this device. It can't be undone.
                </Body>
                <Button
                  label="Yes, delete everything"
                  kind="danger"
                  onPress={() => {
                    clearLog();
                    clearReports();
                    clearProgress();
                    resetSettings();
                    void deleteAllSamples();
                    setConfirmClear(false);
                  }}
                  style={{ alignSelf: "stretch" }}
                />
                <Button label="Keep it" kind="secondary" onPress={() => setConfirmClear(false)} style={{ alignSelf: "stretch" }} />
              </View>
            ) : (
              <Button label="Delete my history" kind="secondary" icon={<TrashIcon className="size-5" />} onPress={() => setConfirmClear(true)} />
            )}
          </Panel>
        </Section>

        <View style={{ alignItems: "center", gap: 6 }}>
          <Heading size={20}>Saykind</Heading>
          <Body size={13} style={{ textAlign: "center", maxWidth: 300 }}>
            A prototype for speech practice. Automatic speech recognition can be wrong, and nothing here is a medical or clinical measure.
          </Body>
        </View>
      </ScrollView>
    </Screen>
  );
}

import type { Metadata } from "next";
import CaregiverEntry from "@/components/saykind/CaregiverEntry";

export const metadata: Metadata = { title: "Saykind · Caregiver view" };

export default function CaregiverPage() {
  return <CaregiverEntry />;
}

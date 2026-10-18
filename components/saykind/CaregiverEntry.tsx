"use client";

import dynamic from "next/dynamic";

const CaregiverView = dynamic(() => import("./CaregiverReportView"), { ssr: false });

export default function CaregiverEntry() {
  return <CaregiverView />;
}

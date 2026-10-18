"use client";

import dynamic from "next/dynamic";

const PrintEntry = dynamic(() => import("./PrintEntry"), { ssr: false });

export default function PrintLoader() {
  return <PrintEntry />;
}

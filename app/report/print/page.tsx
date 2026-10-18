import type { Metadata } from "next";
import PrintLoader from "@/components/report/PrintLoader";

export const metadata: Metadata = { title: "Saykind · Practice report" };

export default function ReportPrintPage() {
  return <PrintLoader />;
}

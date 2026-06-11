"use client";

import { Suspense } from "react";
import PrintReportContent from "./PrintReportContent";

export default function PrintReportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>}>
      <PrintReportContent />
    </Suspense>
  );
}

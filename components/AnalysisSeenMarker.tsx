"use client";

import { useEffect } from "react";
import { markAnalysisSeenAction } from "../app/actions";

export default function AnalysisSeenMarker({
  analysisId,
}: {
  analysisId: string;
}) {
  useEffect(() => {
    markAnalysisSeenAction(analysisId);
  }, [analysisId]);

  return null;
}

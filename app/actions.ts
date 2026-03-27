"use server";

import { revalidatePath } from "next/cache";
import { setSetting, getSetting } from "../lib/settings";
import { deleteAnalysisResult } from "../lib/analysis-results";

export async function markAnalysisSeenAction(id: string): Promise<void> {
  setSetting("last_seen_analysis_id", id);
  revalidatePath("/");
}

export async function deleteAnalysisResultAction(id: string): Promise<void> {
  deleteAnalysisResult(id);
  const lastId = getSetting("last_analysis_id") ?? "";
  if (lastId === id) setSetting("last_analysis_id", "");
  revalidatePath("/");
}

"use server";

import { revalidatePath } from "next/cache";
import { setSetting } from "../lib/settings";

export async function markAnalysisSeenAction(id: string): Promise<void> {
  setSetting("last_seen_analysis_id", id);
  revalidatePath("/");
}

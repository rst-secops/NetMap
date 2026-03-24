"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  toggleNodeEnabled as repoToggle,
  deleteNode,
  createNode,
  updateNode,
  getEnabledNodes,
  saveNodeResults,
  saveNodeError,
} from "../../lib/dc-nodes";
import { setSchedule } from "../../lib/settings";
import { scheduleSchema, dcNodeCreateSchema } from "../../lib/schemas";
import { runCollection } from "../../lib/ssh-collector";

export async function toggleNodeEnabledAction(id: string, isEnabled: boolean) {
  repoToggle(id, isEnabled);
  revalidatePath("/dc-nodes");
}

export async function deleteNodeAction(id: string) {
  deleteNode(id);
  revalidatePath("/dc-nodes");
}

export async function updateScheduleAction(formData: FormData) {
  const raw = {
    type: formData.get("type") as string,
    time: formData.get("time") as string,
    day: formData.get("day") as string | undefined,
  };

  if (!raw.day) {
    delete raw.day;
  }

  const result = scheduleSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid schedule" };
  }

  const { type, time, day } = result.data;
  setSchedule(type, time, day);
  revalidatePath("/dc-nodes");
  return { success: true };
}

export async function runCollectionNow() {
  const nodes = getEnabledNodes();

  if (nodes.length === 0) {
    return { message: "No enabled SSH nodes to collect from." };
  }

  // Run collection in background — don't await in the action
  // so the UI gets immediate feedback
  runCollection(nodes).then((results) => {
    for (const result of results) {
      if (result.success && result.results) {
        saveNodeResults(result.nodeId, result.results);
      } else if (!result.success && result.error) {
        saveNodeError(result.nodeId, result.error);
      }
    }
  });

  return { message: `Collection started for ${nodes.length} node(s). Refresh the page to see results.` };
}

export interface NodeFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createNodeAction(
  _prev: NodeFormState,
  formData: FormData
): Promise<NodeFormState> {
  const raw = {
    nodeType: formData.get("nodeType") as string,
    nodeDisplayName: (formData.get("nodeDisplayName") as string).trim(),
    host: (formData.get("host") as string).trim(),
    port: Number(formData.get("port")),
    commands: (formData.getAll("commands") as string[]).filter(
      (c) => c.trim() !== ""
    ),
    nodeUser: (formData.get("nodeUser") as string).trim(),
    nodePasswd: formData.get("nodePasswd") as string,
    isEnabled: formData.get("isEnabled") === "on",
  };

  const result = dcNodeCreateSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  createNode(result.data);
  redirect("/dc-nodes");
}

export async function updateNodeAction(
  _prev: NodeFormState,
  formData: FormData
): Promise<NodeFormState> {
  const id = formData.get("id") as string;

  const raw = {
    nodeType: formData.get("nodeType") as string,
    nodeDisplayName: (formData.get("nodeDisplayName") as string).trim(),
    host: (formData.get("host") as string).trim(),
    port: Number(formData.get("port")),
    commands: (formData.getAll("commands") as string[]).filter(
      (c) => c.trim() !== ""
    ),
    nodeUser: (formData.get("nodeUser") as string).trim(),
    nodePasswd: formData.get("nodePasswd") as string,
    isEnabled: formData.get("isEnabled") === "on",
  };

  const result = dcNodeCreateSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const updated = updateNode(id, result.data);
  if (!updated) {
    return { error: "Node not found" };
  }

  redirect(`/dc-nodes/${id}`);
}

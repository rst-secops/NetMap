import { z } from "zod";

export const scheduleSchema = z.object({
  type: z.enum(["daily", "weekly"]),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),
  day: z
    .string()
    .regex(/^[0-6]$/, "Day must be 0-6")
    .optional(),
});

export const dcNodeCreateSchema = z.object({
  nodeType: z.enum(["SSH", "API"]).default("SSH"),
  nodeDisplayName: z.string().min(1, "Node name is required").max(100),
  host: z.string().min(1, "Host is required").max(255),
  port: z.number().int().min(1).max(65535).default(22),
  commands: z.array(z.string().min(1)).min(1, "At least one command is required"),
  nodeUser: z.string().min(1, "Username is required"),
  nodePasswd: z.string().min(1, "Password is required"),
  isEnabled: z.boolean().default(true),
});

export type ScheduleInput = z.input<typeof scheduleSchema>;
export type DcNodeCreateInput = z.input<typeof dcNodeCreateSchema>;

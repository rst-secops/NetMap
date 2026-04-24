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

export const analysisProviderSchema = z.object({
  provider: z.enum(["claude"]),
});

export const claudeConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  model: z.enum([
    "claude-sonnet-4-20250514",
    "claude-haiku-4-5-20251001",
    "claude-opus-4-20250514",
  ]),
  maxTokens: z.coerce.number().int().min(1).max(32768).default(4096),
  baseUrl: z
    .string()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .optional()
    .default(""),
});

export const networkNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["router", "switch", "ap", "host", "vlan", "unknown"]).catch("unknown"),
  label: z.string(),
  data: z.record(z.string(), z.unknown()).optional().default({}),
});

export const networkEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional().default({}),
});

export const networkGraphSchema = z.object({
  nodes: z.array(networkNodeSchema),
  edges: z.array(networkEdgeSchema),
});

export const analysisConfigSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    provider: z.enum(["claude", "google", "ollama"]),
    model: z.string().min(1, "Model is required"),
    maxTokens: z.coerce.number().int().min(1).max(500000).default(4096),
    baseUrl: z
      .string()
      .url("Must be a valid URL")
      .or(z.literal(""))
      .optional()
      .default(""),
    apiKey: z.string(),
    isDefault: z.boolean().default(false),
    skipVlans: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.provider === "ollama" && !data.baseUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Server URL is required for Ollama",
        path: ["baseUrl"],
      });
    }
  });

export type ScheduleInput = z.input<typeof scheduleSchema>;
export type DcNodeCreateInput = z.input<typeof dcNodeCreateSchema>;
export type ClaudeConfigInput = z.input<typeof claudeConfigSchema>;
export type AnalysisConfigInput = z.input<typeof analysisConfigSchema>;
export type NetworkGraph = z.output<typeof networkGraphSchema>;
export type NetworkNode = z.output<typeof networkNodeSchema>;
export type NetworkEdge = z.output<typeof networkEdgeSchema>;

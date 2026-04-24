import type { DcNode } from "./dc-nodes";

export function buildPrompt(
  nodes: DcNode[],
  maxTokens: number
): { systemPrompt: string; userMessage: string } {
  const systemPrompt = `You are a network topology analyst. You will receive raw CLI output and/or API responses collected from network devices.

Analyse the provided data and identify all network components (routers, switches, access points, hosts, VLANs, links) and the relationships between them.

You MUST respond with ONLY a valid JSON object. No prose, no markdown, no code fences. The JSON must have this exact structure:
{
  "nodes": [
    { "id": "string", "type": "router|switch|ap|host|vlan|unknown", "label": "string", "data": {} }
  ],
  "edges": [
    { "id": "string", "source": "node-id", "target": "node-id", "label": "optional string", "data": {} }
  ]
}

Rules:
- Use the device's display name as the node label.
- Include ALL discovered components, including unknown or ambiguous ones with type "unknown" — do not omit them.
- Edge IDs must be unique. Use the format "e-<source>-<target>" or similar.
- The "data" fields may contain any relevant metadata (IP addresses, MAC, model, interfaces, VLANs, etc.).`;

  // ~100k input tokens budget (well within Claude's 200k context window).
  // maxTokens controls output size only — input budget is independent.
  const charBudget = 400_000;
  let usedChars = 0;
  const deviceBlocks: string[] = [];

  for (const node of nodes) {
    const resultsStr = node.results
      ? JSON.stringify(node.results, null, 2)
      : "(no output)";

    const header = `Device: ${node.nodeDisplayName} (${node.nodeType})\nHost: ${node.host}\n--- Output ---\n`;
    const footer = `\n---\n`;
    const remaining = charBudget - usedChars - header.length - footer.length;

    let body: string;
    if (remaining <= 0) {
      body = "[TRUNCATED]";
    } else if (resultsStr.length > remaining) {
      body = resultsStr.slice(0, remaining) + "\n[TRUNCATED]";
    } else {
      body = resultsStr;
    }

    deviceBlocks.push(header + body + footer);
    usedChars += header.length + body.length + footer.length;
  }

  const userMessage =
    "Analyze the following network device data and return the topology graph JSON:\n\n" +
    deviceBlocks.join("\n");

  return { systemPrompt, userMessage };
}

export function buildOllamaPrompt(
  nodes: DcNode[],
  maxTokens: number,
  skipVlans: boolean
): { systemPrompt: string; userMessage: string } {
  const systemPrompt = `You are a network topology analyst. Output ONLY a valid JSON object — no prose, no markdown, no explanation.`;

  const charBudget = 400_000;
  let usedChars = 0;
  const deviceBlocks: string[] = [];

  for (const node of nodes) {
    const resultsStr = node.results
      ? JSON.stringify(node.results, null, 2)
      : "(no output)";

    const header = `Device: ${node.nodeDisplayName} (${node.nodeType})\nHost: ${node.host}\n--- Output ---\n`;
    const footer = `\n---\n`;
    const remaining = charBudget - usedChars - header.length - footer.length;

    let body: string;
    if (remaining <= 0) {
      body = "[TRUNCATED]";
    } else if (resultsStr.length > remaining) {
      body = resultsStr.slice(0, remaining) + "\n[TRUNCATED]";
    } else {
      body = resultsStr;
    }

    deviceBlocks.push(header + body + footer);
    usedChars += header.length + body.length + footer.length;
  }

  const schemaExample = `{
  "nodes": [
    { "id": "unique-id", "type": "router|switch|ap|host|vlan|unknown", "label": "Display Name", "data": { "ip": "...", "model": "..." } }
  ],
  "edges": [
    { "id": "e-source-target", "source": "node-id", "target": "other-node-id", "label": "interface or link", "data": {} }
  ]
}`;

  const vlanRule = skipVlans
    ? `- Do NOT include VLAN nodes. Only include physical devices (switches, routers, APs, hosts, servers).`
    : `- Include VLANs as separate nodes with type "vlan".`;

  const userMessage =
    `Analyze the following network device data and return a JSON topology graph.\n\n` +
    `Required JSON structure:\n${schemaExample}\n\n` +
    `Rules:\n` +
    `- Node IDs must be unique strings (use hostname or device name).\n` +
    `- Edge IDs must be unique; use format "e-<source>-<target>".\n` +
    `- Include ALL physical connections (port-channels, uplinks, trunk links) as edges.\n` +
    `- Include relevant metadata in "data" fields (IP, model, interfaces, VLANs carried).\n` +
    vlanRule + `\n\n` +
    `Device data:\n\n` +
    deviceBlocks.join("\n") +
    `\nReturn ONLY the JSON object. Do not write any explanation. Start your response with { and end with }.`;

  return { systemPrompt, userMessage };
}

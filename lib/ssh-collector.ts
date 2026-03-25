import { Client } from "ssh2";
import type { DcNode } from "./dc-nodes";

export interface CollectionResult {
  nodeId: string;
  success: boolean;
  results: Record<string, string> | null;
  error?: string;
  collectedAt: string;
}

/**
 * Open an interactive shell and run all commands sequentially.
 * Network devices typically only support a single channel/shell,
 * so we cannot use conn.exec() per command.
 */
function execCommandsViaShell(
  conn: Client,
  commands: string[],
  timeoutMs = 30_000
): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      conn.destroy();
      reject(new Error(`Shell session timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    conn.shell(
      { term: "vt100", cols: 200, rows: 50 },
      (err, stream) => {
        if (err) {
          clearTimeout(timer);
          return reject(err);
        }

        let fullOutput = "";

        stream.on("data", (chunk: Buffer) => {
          fullOutput += chunk.toString();
        });

        stream.on("close", () => {
          clearTimeout(timer);
          const results = parseShellOutput(fullOutput, commands);
          resolve(results);
        });

        // Send commands with a small delay between them to let the
        // device process each one, then exit
        let i = 0;
        const sendNext = () => {
          if (i < commands.length) {
            stream.write(commands[i] + "\n");
            i++;
            setTimeout(sendNext, 500);
          } else {
            // Give device time to flush output, then close
            setTimeout(() => stream.end("exit\n"), 1000);
          }
        };
        sendNext();
      }
    );
  });
}

/**
 * Split raw shell output into per-command sections.
 * Looks for each command string in the output as a delimiter.
 */
function parseShellOutput(
  raw: string,
  commands: string[]
): Record<string, string> {
  const results: Record<string, string> = {};

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    const startIdx = raw.indexOf(cmd);
    if (startIdx === -1) {
      results[cmd] = "";
      continue;
    }

    // Start after the command line itself
    const afterCmd = startIdx + cmd.length;
    // End at the next command, or at "exit" / end of output
    let endIdx = raw.length;
    if (i + 1 < commands.length) {
      const nextIdx = raw.indexOf(commands[i + 1], afterCmd);
      if (nextIdx !== -1) endIdx = nextIdx;
    } else {
      // Look for the exit command or prompt at the end
      const exitIdx = raw.indexOf("exit", afterCmd);
      if (exitIdx !== -1) endIdx = exitIdx;
    }

    results[cmd] = raw.slice(afterCmd, endIdx).trim();
  }

  return results;
}

function connectToNode(node: DcNode): Promise<Client> {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    console.log(`[DC] Connecting to ${node.nodeDisplayName} (${node.host}:${node.port})...`);

    const timeout = setTimeout(() => {
      conn.destroy();
      reject(new Error(`Connection to ${node.host} timed out after 15s`));
    }, 15_000);

    conn
      .on("ready", () => {
        clearTimeout(timeout);
        console.log(`[DC] Connected to ${node.nodeDisplayName} (${node.host})`);
        resolve(conn);
      })
      .on("error", (err) => {
        clearTimeout(timeout);
        console.error(`[DC] Connection error for ${node.nodeDisplayName} (${node.host}):`, err.message);
        reject(err);
      })
      .connect({
        host: node.host,
        port: node.port,
        username: node.nodeUser,
        password: node.nodePasswd,
        readyTimeout: 15_000,
        algorithms: {
          kex: [
            "ecdh-sha2-nistp256",
            "ecdh-sha2-nistp384",
            "ecdh-sha2-nistp521",
            "diffie-hellman-group-exchange-sha256",
            "diffie-hellman-group14-sha256",
            "diffie-hellman-group14-sha1",
            "diffie-hellman-group1-sha1",
          ],
          cipher: [
            "aes128-ctr",
            "aes192-ctr",
            "aes256-ctr",
            "aes128-gcm",
            "aes128-gcm@openssh.com",
            "aes256-gcm",
            "aes256-gcm@openssh.com",
            "aes256-cbc",
            "aes128-cbc",
            "3des-cbc",
          ],
          hmac: [
            "hmac-sha2-256",
            "hmac-sha2-512",
            "hmac-sha1",
          ],
          serverHostKey: [
            "ssh-rsa",
            "ecdsa-sha2-nistp256",
            "ecdsa-sha2-nistp384",
            "ecdsa-sha2-nistp521",
            "ssh-ed25519",
            "rsa-sha2-256",
            "rsa-sha2-512",
          ],
        },
      });
  });
}

async function collectFromNode(node: DcNode): Promise<CollectionResult> {
  const collectedAt = new Date().toISOString();

  try {
    const conn = await connectToNode(node);

    console.log(`[DC] Running ${node.commands.length} command(s) on ${node.nodeDisplayName}: ${node.commands.join(", ")}`);
    const results = await execCommandsViaShell(conn, node.commands);
    console.log(`[DC] Completed commands on ${node.nodeDisplayName}`);

    conn.end();

    return { nodeId: node.id, success: true, results, collectedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[DC] Collection failed for ${node.nodeDisplayName} (${node.host}): ${message}`);
    return {
      nodeId: node.id,
      success: false,
      results: null,
      error: message,
      collectedAt,
    };
  }
}

/**
 * Run SSH data collection on all provided nodes in parallel.
 * Returns results for each node.
 */
export async function runCollection(
  nodes: DcNode[]
): Promise<CollectionResult[]> {
  const sshNodes = nodes.filter(
    (n) => n.isEnabled && n.nodeType === "SSH"
  );

  if (sshNodes.length === 0) {
    console.log("[DC] No enabled SSH nodes to collect from");
    return [];
  }

  console.log(`[DC] Starting collection for ${sshNodes.length} node(s): ${sshNodes.map((n) => n.nodeDisplayName).join(", ")}`);

  const results = await Promise.allSettled(
    sshNodes.map((node) => collectFromNode(node))
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          nodeId: sshNodes[i].id,
          success: false,
          results: null,
          error: r.reason?.message ?? "Unknown error",
          collectedAt: new Date().toISOString(),
        }
  );
}

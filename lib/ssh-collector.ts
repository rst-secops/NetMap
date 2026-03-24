import { Client } from "ssh2";
import type { DcNode } from "./dc-nodes";

interface CommandResult {
  command: string;
  output: string;
}

export interface CollectionResult {
  nodeId: string;
  success: boolean;
  results: Record<string, string> | null;
  error?: string;
  collectedAt: string;
}

function execCommand(
  conn: Client,
  command: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    conn.exec(command, { pty: true }, (err, stream) => {
      if (err) return reject(err);

      let stdout = "";
      let stderr = "";

      stream
        .on("data", (chunk: Buffer) => {
          stdout += chunk.toString();
        })
        .on("close", () => resolve({ stdout, stderr }));

      stream.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });
    });
  });
}

function connectToNode(node: DcNode): Promise<Client> {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    const timeout = setTimeout(() => {
      conn.destroy();
      reject(new Error(`Connection to ${node.host} timed out after 15s`));
    }, 15_000);

    conn
      .on("ready", () => {
        clearTimeout(timeout);
        resolve(conn);
      })
      .on("error", (err) => {
        clearTimeout(timeout);
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

    const commandResults: CommandResult[] = [];
    for (const command of node.commands) {
      const { stdout } = await execCommand(conn, command);
      commandResults.push({ command, output: stdout });
    }

    // Close session gracefully
    conn.end();

    // Build results as { command: output } map
    const results: Record<string, string> = {};
    for (const r of commandResults) {
      results[r.command] = r.output;
    }

    return { nodeId: node.id, success: true, results, collectedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
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

  if (sshNodes.length === 0) return [];

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

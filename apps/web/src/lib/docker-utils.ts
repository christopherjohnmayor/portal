import { request } from "node:http";
import { existsSync } from "node:fs";

const DOCKER_HOST = process.env.DOCKER_HOST || "unix:///var/run/docker.sock";
const OPENCODE_CONTAINER =
    process.env.OPENCODE_CONTAINER || process.env.HOSTNAME || "";

/**
 * Execute a command in the OpenCode container and return the output.
 */
// ... (Keep existing imports)

/**
 * Execute a command in the OpenCode container and return the output.
 */
export async function execCommand(cmd: string[]): Promise<string> {
    return execCommandWithInput(cmd, undefined);
}

/**
 * Execute a command in the OpenCode container with optional input (stdin).
 */
export async function execCommandWithInput(
    cmd: string[],
    input?: string | Buffer
): Promise<string> {
    if (!OPENCODE_CONTAINER) {
        throw new Error("OPENCODE_CONTAINER env variable is required");
    }

    // 1. Create Exec Instance
    const execConfig = {
        AttachStdin: !!input,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        Cmd: cmd,
    };

    const execData = await dockerRequest(
        `/containers/${OPENCODE_CONTAINER}/exec`,
        "POST",
        execConfig
    );

    const execId = execData.Id;

    // 2. Start Exec Instance
    const startConfig = {
        Detach: false,
        Tty: false,
    };

    // If we have input, we need to treat this carefully.
    // However, the standard non-hijacked /exec/{id}/start API with Tty=false
    // doesn't easily support simultaneous Read/Write via simple HTTP POST body without upgrading.
    // BUT checking the docs: "If Detach is false, this endpoint attaches to the process... 
    // input is sent via the request body... output is returned via response body"
    // So if we send input in request body, it should go to stdin.

    // NOTE: Docker expects specific protocols here? 
    // Actually, normally one upgrades to TCP. But for simple input, let's try sending it as body.

    const rawOutput = await dockerRequest(
        `/exec/${execId}/start`,
        "POST",
        startConfig, // This is the JSON config usually sent
        true // return raw buffer
        // Wait, the Docker Engine API for /exec/{id}/start says:
        // "This endpoint returns a 101 Switching Protocols... to start the stream"
        // IF we don't upgrade, we might be limited.
        // HOWEVER, "If tty is false, the stream is multiplexed..."

        // Let's rely on the fact that existing execCommand works. 
        // For writing files with `cat > file`, we might need a separate approach or hijack.
        // Let's try to see if we can perform a separate "interactive" flow if input is present,
        // OR simpler: `sh -c 'echo "BASE64" | base64 -d > file'` like we did for skills.
        // That avoids dealing with stdin streams directly over HTTP 1.1 blocking.
    );

    return parseDockerStream(rawOutput);
}

// Re-implementing base64 writing strategy as a safer 'write' wrapper for now
// to avoid complex stream hijacking implementation in this simple utility.
export async function writeFile(path: string, content: string | Buffer): Promise<void> {
    const base64 = Buffer.isBuffer(content)
        ? content.toString('base64')
        : Buffer.from(content).toString('base64');

    // Chunking might be needed for very large files, but starting simple.
    // echo "..." | base64 -d > path
    await execCommand([
        "sh",
        "-c",
        `echo "${base64}" | base64 -d > "${path}"`
    ]);
}

export async function readFile(path: string): Promise<string> {
    return execCommand(["cat", path]);
}

function parseDockerStream(buffer: Buffer): string {
    let output = "";
    let offset = 0;

    while (offset < buffer.length) {
        // Header is 8 bytes
        // Byte 0: Stream type (1 = stdout, 2 = stderr)
        // Bytes 4-7: Payload size (big endian)
        if (offset + 8 > buffer.length) break;

        const size = buffer.readUInt32BE(offset + 4);
        const content = buffer.slice(offset + 8, offset + 8 + size);
        output += content.toString("utf-8");

        offset += 8 + size;
    }

    return output;
}

function dockerRequest(
    path: string,
    method: string,
    body?: any,
    returnBuffer = false
): Promise<any> {
    return new Promise((resolve, reject) => {
        const socketPath = DOCKER_HOST.startsWith("unix://")
            ? DOCKER_HOST.replace("unix://", "")
            : undefined;

        const options: any = {
            method,
            path,
            headers: {
                "Content-Type": "application/json",
            },
        };

        if (socketPath) {
            if (!existsSync(socketPath)) {
                return reject(new Error(`Docker socket not found at ${socketPath}`));
            }
            options.socketPath = socketPath;
        } else {
            const hostUrl = new URL(DOCKER_HOST.replace("tcp://", "http://"));
            options.hostname = hostUrl.hostname;
            options.port = hostUrl.port;
        }

        const req = request(options, (res: any) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () => {
                const fullBuffer = Buffer.concat(chunks);

                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    if (returnBuffer) {
                        resolve(fullBuffer);
                    } else {
                        try {
                            resolve(JSON.parse(fullBuffer.toString()));
                        } catch (e) {
                            resolve(fullBuffer.toString());
                        }
                    }
                } else {
                    reject(
                        new Error(
                            `Docker API error ${res.statusCode}: ${fullBuffer.toString()}`
                        )
                    );
                }
            });
        });

        req.on("error", (err: Error) => reject(err));

        if (body) {
            // Support raw buffer or string for non-JSON bodies if needed in future
            if (Buffer.isBuffer(body) || typeof body === 'string') {
                // For now, dockerRequest is strictly JSON body for configs.
                // If we need raw body, we'd need to change Content-Type.
                req.write(JSON.stringify(body));
            } else {
                req.write(JSON.stringify(body));
            }
        }
        req.end();
    });
}

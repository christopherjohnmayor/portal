import type { NextApiRequest, NextApiResponse } from "next";
import { execCommand } from "../../../lib/docker-utils";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    const path = (req.query.path as string) || "/workspace";
    const showHidden = req.query.showHidden === "true";

    try {
        // ls -F adds a trailing / to directories, making parsing easier
        // -1 lists one per line
        // --group-directories-first puts folders at the top
        // -a shows hidden files (dotfiles)
        const lsArgs = [
            "ls",
            "-F",
            "-1",
            "--group-directories-first",
        ];
        if (showHidden) {
            lsArgs.push("-a");
        }
        lsArgs.push(path);

        const output = await execCommand(lsArgs);

        const items = output
            .split("\n")
            .filter((line) => line.trim().length > 0)
            // Filter out . and .. special directories
            .filter((line) => {
                const name = line.replace(/[/*@=|]$/, ""); // Remove ls -F suffixes
                return name !== "." && name !== "..";
            })
            .map((line) => {
                const isDirectory = line.endsWith("/");
                const name = isDirectory ? line.slice(0, -1) : line;

                // Remove * or @ from executables/links if present (ls -F adds these)
                // Actually ls -F adds * for executable, @ for link, = for socket etc.
                // Simple heuristic for now: clean up suffix if not directory
                let cleanName = name;
                if (!isDirectory && (name.endsWith("*") || name.endsWith("@"))) {
                    cleanName = name.slice(0, -1);
                }

                return {
                    name: cleanName,
                    isDirectory,
                    path: `${path}/${cleanName}`.replace(/\/+/g, "/"),
                };
            });

        res.status(200).json({ items, path });
    } catch (error) {
        console.error("FS List error:", error);
        res.status(500).json({
            message: "Failed to list files",
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

import type { NextApiRequest, NextApiResponse } from "next";
import { readFile, writeFile } from "../../../lib/docker-utils";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { path } = req.query;

    if (!path || typeof path !== "string") {
        return res.status(400).json({ message: "path is required" });
    }

    try {
        if (req.method === "GET") {
            const content = await readFile(path);
            return res.status(200).send(content);
        } else if (req.method === "POST") {
            const { content } = req.body;
            if (typeof content !== "string") {
                return res.status(400).json({ message: "content is required" });
            }
            await writeFile(path, content);
            return res.status(200).json({ success: true });
        } else {
            return res.status(405).json({ message: "Method not allowed" });
        }
    } catch (error) {
        console.error("FS Content error:", error);
        res.status(500).json({
            message: "Failed to access file",
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

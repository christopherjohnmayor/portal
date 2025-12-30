import type { NextApiRequest, NextApiResponse } from "next";
import { execCommand } from "../../../lib/docker-utils";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    const { name, content } = req.body;

    if (!name || !content) {
        return res.status(400).json({ message: "Name and content are required" });
    }

    // Sanitize filename to strict alphanumeric/dashed
    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();
    const fileName = `${safeName}.md`;
    const dirPath = "/workspace/.opencode/skills";
    const filePath = `${dirPath}/${fileName}`;

    try {
        // 1. Ensure directory exists
        await execCommand(["mkdir", "-p", dirPath]);

        // 2. Write file using base64 to avoid escaping issues
        const base64Content = Buffer.from(content).toString("base64");

        // Command: echo "CONTENT" | base64 -d > /path/to/file
        // We run this via sh -c to handle the pipe/redirection
        await execCommand([
            "sh",
            "-c",
            `echo "${base64Content}" | base64 -d > "${filePath}"`
        ]);

        res.status(200).json({ success: true, path: filePath });
    } catch (error) {
        console.error("Create Skill error:", error);
        res.status(500).json({
            message: "Failed to create skill",
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

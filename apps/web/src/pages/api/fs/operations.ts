import type { NextApiRequest, NextApiResponse } from "next";
import { execCommand } from "../../../lib/docker-utils";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    const { action, path, destination } = req.body;

    if (!path || typeof path !== "string") {
        return res.status(400).json({ message: "path is required" });
    }

    try {
        switch (action) {
            case "rename":
                if (!destination || typeof destination !== "string") {
                    return res.status(400).json({ message: "destination is required for rename" });
                }
                await execCommand(["mv", path, destination]);
                break;
            case "delete":
                // Safety check: Don't delete root or critical paths easily
                if (path === "/" || path === "/workspace" || path === "/home") {
                    return res.status(400).json({ message: "Cannot delete protected paths" });
                }
                await execCommand(["rm", "-rf", path]);
                break;
            case "mkdir":
                await execCommand(["mkdir", "-p", path]);
                break;
            default:
                return res.status(400).json({ message: "Invalid action" });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("FS Operations error:", error);
        res.status(500).json({
            message: "Operation failed",
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

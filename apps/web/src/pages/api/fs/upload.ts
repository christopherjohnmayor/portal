import type { NextApiRequest, NextApiResponse } from "next";
import { writeFile } from "../../../lib/docker-utils";

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    const { path } = req.query;

    if (!path || typeof path !== "string") {
        return res.status(400).json({ message: "path query param is required" });
    }

    try {
        // Read request body into a buffer
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        // Write to file
        await writeFile(path, fileBuffer);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({
            message: "Upload failed",
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

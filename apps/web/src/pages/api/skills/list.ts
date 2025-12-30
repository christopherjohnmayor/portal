import type { NextApiRequest, NextApiResponse } from "next";
import { execCommand } from "../../../lib/docker-utils";

interface Skill {
    name: string;
    path: string;
    description?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        const skills: Skill[] = [];

        // Check for skills in .opencode/skills (workspace-local)
        const localSkillsPath = "/workspace/.opencode/skills";
        try {
            const localOutput = await execCommand([
                "sh", "-c",
                `find ${localSkillsPath} -name "*.md" -type f 2>/dev/null || true`
            ]);

            const localFiles = localOutput.split("\n").filter((f) => f.trim());
            for (const filePath of localFiles) {
                const name = filePath.split("/").pop()?.replace(".md", "") || "";
                if (name) {
                    // Try to read first line as description
                    let description = "";
                    try {
                        const content = await execCommand(["head", "-n", "3", filePath]);
                        // Look for a # header or first paragraph
                        const lines = content.split("\n");
                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (trimmed.startsWith("#")) {
                                description = trimmed.replace(/^#+\s*/, "");
                                break;
                            } else if (trimmed && !description) {
                                description = trimmed;
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
                    skills.push({ name, path: filePath, description });
                }
            }
        } catch (e) {
            // Directory may not exist, that's fine
        }

        // Check for skills in ~/.config/opencode/skills (global)
        const globalSkillsPath = "/root/.config/opencode/skills";
        try {
            const globalOutput = await execCommand([
                "sh", "-c",
                `find ${globalSkillsPath} -name "*.md" -type f 2>/dev/null || true`
            ]);

            const globalFiles = globalOutput.split("\n").filter((f) => f.trim());
            for (const filePath of globalFiles) {
                const name = filePath.split("/").pop()?.replace(".md", "") || "";
                if (name && !skills.find(s => s.name === name)) {
                    let description = "";
                    try {
                        const content = await execCommand(["head", "-n", "3", filePath]);
                        const lines = content.split("\n");
                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (trimmed.startsWith("#")) {
                                description = trimmed.replace(/^#+\s*/, "");
                                break;
                            } else if (trimmed && !description) {
                                description = trimmed;
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
                    skills.push({ name, path: filePath, description });
                }
            }
        } catch (e) {
            // Directory may not exist, that's fine
        }

        res.status(200).json({ skills });
    } catch (error) {
        console.error("Skills list error:", error);
        res.status(500).json({
            message: "Failed to list skills",
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

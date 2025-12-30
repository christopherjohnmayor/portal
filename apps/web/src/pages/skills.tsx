import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/hooks/use-config";
import {
    SparklesIcon,
    FolderIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    PlusIcon,
} from "@heroicons/react/24/solid";
import { toast } from "sonner";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetBody,
    SheetFooter,
    SheetTrigger,
} from "@/components/ui/sheet";
import { TextField } from "react-aria-components";
import { Label, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Skill {
    name: string;
    description: string;
    source?: string;
    tools?: string[];
}

export default function SkillsPage() {
    const router = useRouter();
    const { plugins } = useConfig();
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(false);

    // Creation state
    const [newSkillName, setNewSkillName] = useState("");
    const [newSkillContent, setNewSkillContent] = useState("");
    const [createLoading, setCreateLoading] = useState(false);

    const hasSkillsPlugin = plugins.includes("opencode-skills");

    // Discover skills by reading from filesystem
    const discoverSkills = useCallback(async () => {
        setLoading(true);

        try {
            const res = await fetch("/api/skills/list");
            if (!res.ok) {
                throw new Error("Failed to list skills");
            }
            const data = await res.json();
            const fetchedSkills = (data.skills || []).map((s: any) => ({
                name: s.name,
                description: s.description || "",
                source: s.path,
            }));
            setSkills(fetchedSkills);
            if (fetchedSkills.length === 0) {
                toast.info("No skills found. Create one to get started!");
            } else {
                toast.success(`Found ${fetchedSkills.length} skill(s)`);
            }
        } catch (err) {
            console.error("Failed to discover skills:", err);
            toast.error("Failed to discover skills");
        } finally {
            setLoading(false);
        }
    }, []);

    // Parse skills from AI output (best effort)
    const parseSkillsFromOutput = (text: string) => {
        const parsedSkills: Skill[] = [];

        // Look for patterns like "**skill-name**: description" or "# skill-name"
        const lines = text.split("\n");
        let currentSkill: Partial<Skill> | null = null;

        for (const line of lines) {
            // Match markdown headers or bold text as skill names
            const headerMatch = line.match(/^#+\s+(.+)$/);
            const boldMatch = line.match(/^\*\*(.+?)\*\*[:\s]*(.*)$/);

            if (headerMatch) {
                if (currentSkill?.name) {
                    parsedSkills.push(currentSkill as Skill);
                }
                currentSkill = { name: headerMatch[1].trim() };
            } else if (boldMatch) {
                if (currentSkill?.name) {
                    parsedSkills.push(currentSkill as Skill);
                }
                currentSkill = {
                    name: boldMatch[1].trim(),
                    description: boldMatch[2]?.trim() || "",
                };
            } else if (currentSkill && line.trim() && !currentSkill.description) {
                currentSkill.description = line.trim();
            }
        }

        if (currentSkill?.name) {
            parsedSkills.push(currentSkill as Skill);
        }

        if (parsedSkills.length > 0) {
            setSkills(parsedSkills);
        }
    };

    const handleCreateSkill = async (close: () => void) => {
        if (!newSkillName.trim() || !newSkillContent.trim()) {
            toast.error("Name and description are required");
            return;
        }

        setCreateLoading(true);
        try {
            const res = await fetch("/api/skills/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newSkillName,
                    content: newSkillContent,
                }),
            });

            if (res.ok) {
                toast.success("Skill created successfully");
                setNewSkillName("");
                setNewSkillContent("");
                close();
                // Optionally trigger discovery to show new skill?
                // discoverSkills();
            } else {
                const data = await res.json();
                toast.error(data.message || "Failed to create skill");
            }
        } catch (err) {
            console.error("Create skill error:", err);
            toast.error("Failed to create skill");
        } finally {
            setCreateLoading(false);
        }
    };

    if (!hasSkillsPlugin) {
        return (
            <AppLayout>
                <div className="flex h-full items-center justify-center">
                    <div className="text-center max-w-md p-6">
                        <SparklesIcon className="size-12 text-muted-fg mx-auto mb-4" />
                        <h1 className="text-xl font-semibold mb-2">
                            Skills Plugin Not Found
                        </h1>
                        <p className="text-muted-fg mb-4">
                            The opencode-skills plugin is not configured. Add it to your
                            opencode.json to enable Agent Skills discovery.
                        </p>
                        <pre className="text-left text-xs bg-muted p-3 rounded-lg overflow-auto">
                            {`{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-skills"]
}`}
                        </pre>
                        <Button onPress={() => router.push("/settings")} className="mt-4">
                            Go to Settings
                        </Button>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="size-5 text-primary" />
                        <h1 className="text-lg font-semibold">Agent Skills</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Sheet>
                            <SheetTrigger>
                                <Button size="sm" intent="outline">
                                    <PlusIcon className="size-4" />
                                    Create Skill
                                </Button>
                            </SheetTrigger>
                            <SheetContent>
                                {({ close }) => (
                                    <>
                                        <SheetHeader>
                                            <SheetTitle>Create New Skill</SheetTitle>
                                            <SheetDescription>
                                                Define a new skill for the agent to use. Skills are markdown files describing how to perform a task.
                                            </SheetDescription>
                                        </SheetHeader>
                                        <SheetBody className="space-y-4">
                                            <TextField value={newSkillName} onChange={setNewSkillName} isRequired>
                                                <Label>Skill Name</Label>
                                                <Input placeholder="e.g. check-weather" />
                                                <FieldError />
                                            </TextField>
                                            <TextField value={newSkillContent} onChange={setNewSkillContent} isRequired className="flex-1 flex flex-col">
                                                <Label>Description / Instructions</Label>
                                                <Textarea
                                                    placeholder="# Check Weather&#10;&#10;Use this skill to check the weather in a location..."
                                                    className="flex-1 min-h-[300px] font-mono text-sm"
                                                />
                                                <FieldError />
                                            </TextField>
                                        </SheetBody>
                                        <SheetFooter>
                                            <Button intent="outline" onPress={close}>Cancel</Button>
                                            <Button onPress={() => handleCreateSkill(close)} isDisabled={createLoading}>
                                                {createLoading ? "Creating..." : "Create Skill"}
                                            </Button>
                                        </SheetFooter>
                                    </>
                                )}
                            </SheetContent>
                        </Sheet>
                        <Button
                            size="sm"
                            intent="secondary"
                            onPress={discoverSkills}
                            isDisabled={loading}
                        >
                            <ArrowPathIcon
                                className={`size-4 ${loading ? "animate-spin" : ""}`}
                            />
                            {loading ? "Discovering..." : "Discover Skills"}
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {/* Skills Grid */}
                    {skills.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {skills.map((skill, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <DocumentTextIcon className="size-5 text-primary shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm">{skill.name}</div>
                                            {skill.description && (
                                                <div className="text-xs text-muted-fg mt-1 line-clamp-2">
                                                    {skill.description}
                                                </div>
                                            )}
                                            {skill.source && (
                                                <div className="flex items-center gap-1 mt-2 text-xs text-muted-fg">
                                                    <FolderIcon className="size-3" />
                                                    <span className="truncate">{skill.source}</span>
                                                </div>
                                            )}
                                            {skill.tools && skill.tools.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {skill.tools.map((tool, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                                                        >
                                                            {tool}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <SparklesIcon className="size-12 text-muted-fg/50 mx-auto mb-4" />
                            <h2 className="text-lg font-medium mb-2">No Skills Discovered</h2>
                            <p className="text-muted-fg text-sm max-w-md mx-auto mb-4">
                                Skills are defined in <code>.opencode/skills/</code> or{" "}
                                <code>~/.config/opencode/skills/</code> directories. Click
                                "Discover Skills" to find available skills.
                            </p>
                            <Button onPress={discoverSkills} isDisabled={loading}>
                                <SparklesIcon className="size-4" />
                                Discover Skills
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

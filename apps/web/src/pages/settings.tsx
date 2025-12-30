import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import useLocalStorage from "@/hooks/use-local-storage";
import { useConfig } from "@/hooks/use-config";
import AppLayout from "@/layouts/app-layout";
import { PR_PREFIX_KEY } from "@/lib/constants";
import { toast } from "sonner";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";

// Known plugin metadata
const PLUGIN_INFO: Record<
  string,
  { name: string; description: string; docs?: string }
> = {
  "opencode-google-antigravity-auth": {
    name: "Antigravity Auth",
    description:
      "Google OAuth for Gemini models with multi-account load balancing",
    docs: "https://github.com/shekohex/opencode-google-antigravity-auth",
  },

  "opencode-skills": {
    name: "Agent Skills",
    description: "Anthropic Agent Skills specification support",
    docs: "https://github.com/shekohex/opencode-skills",
  },
};

function PluginCard({ pluginId }: { pluginId: string }) {
  const info = PLUGIN_INFO[pluginId] || {
    name: pluginId,
    description: "Community plugin",
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
      <CheckCircleIcon className="size-5 text-success mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{info.name}</div>
        <div className="text-xs text-muted-fg mt-0.5">{info.description}</div>
        {info.docs && (
          <a
            href={info.docs}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mt-1 inline-block"
          >
            Documentation →
          </a>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [storedPrefix, setStoredPrefix] = useLocalStorage<string>(
    PR_PREFIX_KEY,
    "",
  );
  const [prefix, setPrefix] = useState("");
  const { config, plugins, isLoading, error } = useConfig();

  // Sync local state with stored value
  useEffect(() => {
    setPrefix(storedPrefix);
  }, [storedPrefix]);

  const handleSave = () => {
    setStoredPrefix(prefix);
    toast.success("Settings saved!");
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Settings</h1>

        <div className="space-y-8">
          {/* Plugins Section */}
          <section>
            <h2 className="text-lg font-medium mb-4">OpenCode Plugins</h2>

            {isLoading && (
              <div className="text-sm text-muted-fg">Loading plugins...</div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-danger">
                <ExclamationCircleIcon className="size-4" />
                Failed to load config: {error.message}
              </div>
            )}

            {!isLoading && !error && plugins.length === 0 && (
              <div className="text-sm text-muted-fg p-4 rounded-lg border border-dashed border-border">
                No plugins configured. Add plugins to your{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  opencode.json
                </code>{" "}
                config file.
              </div>
            )}

            {!isLoading && !error && plugins.length > 0 && (
              <div className="space-y-2">
                {plugins.map((plugin) => (
                  <PluginCard key={plugin} pluginId={plugin} />
                ))}
              </div>
            )}

            {/* Auth hint for Antigravity */}
            {plugins.includes("opencode-google-antigravity-auth") && (
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-sm font-medium text-primary">
                  Antigravity Authentication
                </div>
                <div className="text-xs text-muted-fg mt-1">
                  To authenticate, run{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">
                    opencode auth login
                  </code>{" "}
                  in your terminal and select "OAuth with Google (Antigravity)".
                </div>
              </div>
            )}
          </section>

          {/* PR Prefix Section */}
          <section>
            <h2 className="text-lg font-medium mb-4">Git Settings</h2>
            <div className="space-y-2">
              <Label htmlFor="pr-prefix">PR Branch Prefix</Label>
              <p className="text-sm text-muted-fg">
                This prefix will be added to branch names when creating pull
                requests. For example, if you set &quot;feature/&quot;, branches
                will be named like &quot;feature/my-branch&quot;.
              </p>
              <Input
                id="pr-prefix"
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="e.g., feature/, fix/, yourname/"
              />
            </div>

            <div className="flex items-center gap-3 mt-4">
              <Button onPress={handleSave}>Save Settings</Button>
            </div>
          </section>

          {/* Config Info */}
          {config && (
            <section>
              <h2 className="text-lg font-medium mb-4">Current Model</h2>
              <div className="text-sm text-muted-fg">
                {config.model || "Default model"}
              </div>
            </section>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

import { useConfig } from "@/hooks/use-config";
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export function AuthStatus() {
    const { plugins, isLoading } = useConfig();

    const hasAntigravity = plugins.includes("opencode-google-antigravity-auth");

    if (isLoading) {
        return null;
    }

    if (!hasAntigravity) {
        return null;
    }

    return (
        <Tooltip>
            <TooltipTrigger className="cursor-help">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50">
                    <CheckCircleIcon className="size-4 text-success" />
                    <span className="text-xs text-muted-fg">Antigravity</span>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <div className="max-w-xs">
                    <div className="font-medium mb-1">Antigravity Auth Plugin</div>
                    <div className="text-xs text-muted-fg">
                        To authenticate or add accounts, run:
                        <code className="block mt-1 bg-muted px-1 py-0.5 rounded text-[10px]">
                            opencode auth login
                        </code>
                        and select "OAuth with Google (Antigravity)"
                    </div>
                </div>
            </TooltipContent>
        </Tooltip>
    );
}

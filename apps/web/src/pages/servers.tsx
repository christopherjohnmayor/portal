import { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { useServers } from "@/hooks/use-servers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { TrashIcon, PlusIcon } from "@/components/icons/server-icon";

export default function ServersPage() {
  const { servers, activeServer, setActiveServer, addServer, removeServer } =
    useServers();

  const [serverName, setServerName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [serverColor, setServerColor] = useState("#3b82f6");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = (close: () => void) => {
    if (!serverName.trim() || !serverUrl.trim()) {
      toast.error("Name and URL are required");
      return;
    }

    if (servers.some((s) => s.url === serverUrl.trim())) {
      toast.error("Server with this URL already exists");
      return;
    }

    addServer({
      id: `server-${Date.now()}`,
      name: serverName.trim(),
      url: serverUrl.trim(),
      color: serverColor,
    });

    setServerName("");
    setServerUrl("");
    setServerColor("#3b82f6");
    close();
    toast.success("Server added successfully");
  };

  const handleDelete = (id: string) => {
    if (servers.length <= 1) {
      toast.error("Cannot delete last server");
      return;
    }

    setDeletingId(id);
    setTimeout(() => {
      removeServer(id);
      setDeletingId(null);
      toast.success("Server deleted");
    }, 2000);
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Servers</h1>

        <div className="space-y-4">
          {servers.map((server) => (
            <div
              key={server.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                activeServer?.id === server.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border/70"
              }`}
            >
              <div className="flex items-center gap-3">
                {server.color && (
                  <span
                    className="size-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: server.color }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">
                    {server.name}
                  </div>
                  <div
                    className="text-sm text-muted-fg truncate"
                    title={server.url}
                  >
                    {server.url}
                  </div>
                </div>
                {activeServer?.id === server.id && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded whitespace-nowrap">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeServer?.id !== server.id && (
                  <Button
                    size="sm"
                    intent="outline"
                    onPress={() => setActiveServer(server.id)}
                  >
                    Switch
                  </Button>
                )}
                <Button
                  size="sm"
                  intent="danger"
                  onPress={() => handleDelete(server.id)}
                  isDisabled={deletingId === server.id || servers.length <= 1}
                >
                  {deletingId === server.id ? (
                    <span className="animate-pulse">Deleting...</span>
                  ) : (
                    <>
                      <TrashIcon className="size-4" />
                      <span className="sr-only">Delete</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {servers.length === 0 && (
          <div className="text-center py-12 text-muted-fg">
            <p className="text-sm">No servers configured</p>
            <Sheet>
              <SheetTrigger>
                <Button className="mt-4">
                  <PlusIcon className="size-4 mr-2" />
                  Add Server
                </Button>
              </SheetTrigger>
              <SheetContent>
                {({ close }) => (
                  <>
                    <SheetHeader>
                      <h2 className="text-lg font-semibold">Add Server</h2>
                    </SheetHeader>
                    <SheetBody className="space-y-4">
                      <div>
                        <Label htmlFor="server-name">Name</Label>
                        <Input
                          id="server-name"
                          value={serverName}
                          onChange={(e) => setServerName(e.target.value)}
                          placeholder="Project Alpha"
                        />
                      </div>
                      <div>
                        <Label htmlFor="server-url">URL</Label>
                        <Input
                          id="server-url"
                          value={serverUrl}
                          onChange={(e) => setServerUrl(e.target.value)}
                          placeholder="http://localhost:4001"
                          type="url"
                        />
                      </div>
                      <div>
                        <Label htmlFor="server-color">Color</Label>
                        <div className="flex gap-2">
                          {[
                            "#3b82f6",
                            "#10b981",
                            "#f59e0b",
                            "#ef4444",
                            "#8b5cf6",
                            "#ec4899",
                          ].map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setServerColor(color)}
                              className={`w-8 h-8 rounded-md border-2 transition-all ${
                                serverColor === color
                                  ? "border-primary scale-110"
                                  : "border-border hover:border-border/70"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </SheetBody>
                    <SheetFooter>
                      <Button
                        intent="secondary"
                        onPress={() => {
                          setServerName("");
                          setServerUrl("");
                          setServerColor("#3b82f6");
                          close();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onPress={() => handleAdd(close)}>Add</Button>
                    </SheetFooter>
                  </>
                )}
              </SheetContent>
            </Sheet>
          </div>
        )}

        {servers.length > 0 && (
          <div className="mt-6">
            <Sheet>
              <SheetTrigger>
                <Button size="sm" intent="primary">
                  <PlusIcon className="size-4 mr-2" />
                  Add Server
                </Button>
              </SheetTrigger>
              <SheetContent>
                {({ close }) => (
                  <>
                    <SheetHeader>
                      <h2 className="text-lg font-semibold">Add Server</h2>
                    </SheetHeader>
                    <SheetBody className="space-y-4">
                      <div>
                        <Label htmlFor="server-name">Name</Label>
                        <Input
                          id="server-name"
                          value={serverName}
                          onChange={(e) => setServerName(e.target.value)}
                          placeholder="Project Alpha"
                        />
                      </div>
                      <div>
                        <Label htmlFor="server-url">URL</Label>
                        <Input
                          id="server-url"
                          value={serverUrl}
                          onChange={(e) => setServerUrl(e.target.value)}
                          placeholder="http://localhost:4001"
                          type="url"
                        />
                      </div>
                      <div>
                        <Label htmlFor="server-color">Color</Label>
                        <div className="flex gap-2">
                          {[
                            "#3b82f6",
                            "#10b981",
                            "#f59e0b",
                            "#ef4444",
                            "#8b5cf6",
                            "#ec4899",
                          ].map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setServerColor(color)}
                              className={`w-8 h-8 rounded-md border-2 transition-all ${
                                serverColor === color
                                  ? "border-primary scale-110"
                                  : "border-border hover:border-border/70"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </SheetBody>
                    <SheetFooter>
                      <Button
                        intent="secondary"
                        onPress={() => {
                          setServerName("");
                          setServerUrl("");
                          setServerColor("#3b82f6");
                          close();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onPress={() => handleAdd(close)}>Add</Button>
                    </SheetFooter>
                  </>
                )}
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

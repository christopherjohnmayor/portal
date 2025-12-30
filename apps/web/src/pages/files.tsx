import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import AppLayout from "@/layouts/app-layout";
import { useServers } from "@/hooks/use-servers";
import {
  FolderIcon,
  DocumentIcon,
  HomeIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/solid";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
} from "@/components/ui/menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
}

export default function FilesPage() {
  const router = useRouter();
  const { activeServer } = useServers();
  const [currentPath, setCurrentPath] = useState("/workspace");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Editor State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPath, setEditorPath] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Hidden files toggle
  const [showHidden, setShowHidden] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("files-showHidden") === "true";
    }
    return false;
  });

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath, showHidden]);

  // Persist showHidden preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("files-showHidden", String(showHidden));
    }
  }, [showHidden]);

  const fetchFiles = async (path: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ path });
      if (showHidden) params.append("showHidden", "true");
      const headers: Record<string, string> = {};
      if (activeServer?.url) {
        headers["X-Active-Server-Url"] = activeServer.url;
      }
      const res = await fetch(`/api/fs/directory?${params.toString()}`, {
        headers,
      });
      if (!res.ok) throw new Error("Failed to load files");
      const data = await res.json();
      setFiles(data.items);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load file list");
    } finally {
      setLoading(false);
    }
  };

  const fetchContent = async (path: string) => {
    try {
      const headers: Record<string, string> = {};
      if (activeServer?.url) {
        headers["X-Active-Server-Url"] = activeServer.url;
      }
      const res = await fetch(
        `/api/fs/content?path=${encodeURIComponent(path)}`,
        { headers },
      );
      if (!res.ok) throw new Error("Failed to load content");
      const text = await res.text();
      setEditorContent(text);
      setEditorPath(path);
      setEditorOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to read file");
    }
  };

  const saveContent = async () => {
    setSaving(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (activeServer?.url) {
        headers["X-Active-Server-Url"] = activeServer.url;
      }
      const res = await fetch(
        `/api/fs/content?path=${encodeURIComponent(editorPath)}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ content: editorContent }),
        },
      );
      if (!res.ok) throw new Error("Failed to save");
      toast.success("File saved");
      setEditorOpen(false);
      fetchFiles(currentPath);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save file");
    } finally {
      setSaving(false);
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.isDirectory) {
      setCurrentPath(file.path);
    } else {
      fetchContent(file.path);
    }
  };

  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  const navigateUp = () => {
    if (currentPath === "/workspace" || currentPath === "/") return;
    const parent = currentPath.split("/").slice(0, -1).join("/") || "/";
    setCurrentPath(parent);
  };

  const handleAction = async (action: string, file: FileItem) => {
    if (action === "delete") {
      if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (activeServer?.url) {
          headers["X-Active-Server-Url"] = activeServer.url;
        }
        const res = await fetch("/api/fs/operations", {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "delete", path: file.path }),
        });
        if (!res.ok) throw new Error("Failed to delete");
        toast.success("Deleted successfully");
        fetchFiles(currentPath);
      } catch (err) {
        toast.error("Failed to delete item");
      }
    } else if (action === "rename") {
      const newName = prompt("Enter new name:", file.name);
      if (!newName || newName === file.name) return;
      try {
        const destination = `${currentPath}/${newName}`.replace(/\/+/g, "/");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (activeServer?.url) {
          headers["X-Active-Server-Url"] = activeServer.url;
        }
        const res = await fetch("/api/fs/operations", {
          method: "POST",
          headers,
          body: JSON.stringify({
            action: "rename",
            path: file.path,
            destination,
          }),
        });
        if (!res.ok) throw new Error("Failed to rename");
        toast.success("Renamed successfully");
        fetchFiles(currentPath);
      } catch (err) {
        toast.error("Failed to rename item");
      }
    }
  };

  const handleNew = async (type: "file" | "folder") => {
    const name = prompt(`Enter name for new ${type}:`);
    if (!name) return;
    const path = `${currentPath}/${name}`.replace(/\/+/g, "/");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (activeServer?.url) {
        headers["X-Active-Server-Url"] = activeServer.url;
      }
      if (type === "folder") {
        await fetch("/api/fs/operations", {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "mkdir", path }),
        });
      } else {
        await fetch(`/api/fs/content?path=${encodeURIComponent(path)}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ content: "" }),
        });
      }
      toast.success(`Created ${name}`);
      fetchFiles(currentPath);
    } catch (err) {
      toast.error("Failed to create item");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);

    try {
      const path = `${currentPath}/${file.name}`.replace(/\/+/g, "/");
      const headers: Record<string, string> = {
        "Content-Type": "application/octet-stream",
      };
      if (activeServer?.url) {
        headers["X-Active-Server-Url"] = activeServer.url;
      }
      const res = await fetch(
        `/api/fs/upload?path=${encodeURIComponent(path)}`,
        {
          method: "POST",
          body: file,
          headers,
        },
      );
      if (!res.ok) throw new Error("Upload failed");
      toast.success("Uploaded successfully");
      fetchFiles(currentPath);
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const breadcrumbs = currentPath.split("/").filter(Boolean);

  return (
    <AppLayout>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border px-4 py-3 bg-muted/5 min-h-[60px]">
          <div className="flex items-center gap-2 overflow-hidden w-full sm:w-auto">
            <Button
              intent="plain"
              size="sq-xs"
              onPress={() => setCurrentPath("/workspace")}
              className={
                currentPath === "/workspace" ? "text-primary" : "text-muted-fg"
              }
            >
              <HomeIcon className="size-5" />
            </Button>

            <div className="flex items-center overflow-x-auto no-scrollbar mask-linear-fade">
              {breadcrumbs.map((part, index) => {
                const pathSoFar =
                  "/" + breadcrumbs.slice(0, index + 1).join("/");
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <div
                    key={pathSoFar}
                    className="flex items-center gap-1 shrink-0"
                  >
                    <ChevronRightIcon className="size-4 text-muted-fg/30" />
                    <button
                      onClick={() => navigateTo(pathSoFar)}
                      className={`text-sm px-1.5 py-1 rounded-md transition-colors ${
                        isLast
                          ? "font-semibold text-foreground bg-muted/10"
                          : "text-muted-fg hover:text-foreground hover:bg-muted/10"
                      }`}
                    >
                      {part}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
            <Button
              intent="plain"
              size="sq-sm"
              onPress={() => setShowHidden(!showHidden)}
              className={showHidden ? "text-primary" : "text-muted-fg"}
              aria-label={
                showHidden ? "Hide hidden files" : "Show hidden files"
              }
            >
              {showHidden ? (
                <EyeIcon className="size-5" />
              ) : (
                <EyeSlashIcon className="size-5" />
              )}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              intent="secondary"
              size="sm"
              onPress={handleUploadClick}
              isDisabled={uploading}
              className="flex-1 sm:flex-none justify-center"
            >
              <ArrowUpTrayIcon className="size-4 mr-2" />
              <span className="inline">Upload</span>
            </Button>
            <Menu>
              <MenuTrigger
                className="flex-1 sm:flex-none justify-center"
                size="sm"
                intent="primary"
              >
                <PlusIcon className="size-4 mr-2" />
                <span className="inline">New</span>
              </MenuTrigger>
              <MenuContent placement="bottom right">
                <MenuItem onAction={() => handleNew("file")}>
                  <DocumentIcon className="size-4 mr-2" />
                  New File
                </MenuItem>
                <MenuItem onAction={() => handleNew("folder")}>
                  <FolderIcon className="size-4 mr-2" />
                  New Folder
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-fg gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-sm">Loading files...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {/* Parent directory */}
              {currentPath !== "/workspace" && currentPath !== "/" && (
                <div
                  onClick={navigateUp}
                  className="aspect-square flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-all group"
                >
                  <FolderIcon className="size-10 text-muted-fg/40 group-hover:text-primary/60 transition-colors" />
                  <span className="text-xs font-medium text-muted-fg">
                    Parent Folder
                  </span>
                </div>
              )}

              {files.map((file) => (
                <div
                  key={file.path}
                  className="group relative aspect-square flex flex-col items-center justify-between p-4 rounded-xl border border-border bg-card hover:shadow-sm hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => handleFileClick(file)}
                >
                  <div className="w-full flex justify-end">
                    <Menu>
                      <MenuTrigger
                        intent="plain"
                        size="sq-xs"
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity -mr-2 -mt-2"
                        onClick={(e: any) => e.stopPropagation()}
                      >
                        <EllipsisVerticalIcon className="size-5 text-muted-fg hover:text-foreground" />
                      </MenuTrigger>
                      <MenuContent placement="bottom right">
                        <MenuItem onAction={() => handleAction("rename", file)}>
                          Rename
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem
                          intent="danger"
                          onAction={() => handleAction("delete", file)}
                        >
                          Delete
                        </MenuItem>
                      </MenuContent>
                    </Menu>
                  </div>

                  <div className="flex-1 flex items-center justify-center w-full">
                    {file.isDirectory ? (
                      <FolderIcon className="size-12 sm:size-14 text-blue-400 group-hover:scale-105 transition-transform" />
                    ) : (
                      <DocumentIcon className="size-12 sm:size-14 text-gray-400 group-hover:scale-105 transition-transform" />
                    )}
                  </div>

                  <div className="w-full text-center mt-2">
                    <div
                      className="truncate text-sm font-medium text-foreground w-full"
                      title={file.name}
                    >
                      {file.name}
                    </div>
                  </div>
                </div>
              ))}

              {!loading && files.length === 0 && (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-fg">
                  <div className="p-4 rounded-full bg-muted/30 mb-3">
                    <FolderIcon className="size-8 opacity-50" />
                  </div>
                  <p className="text-sm">Empty directory</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* File Editor Sheet */}
        <Sheet isOpen={editorOpen} onOpenChange={setEditorOpen}>
          <SheetContent
            side="right"
            className="sm:max-w-3xl w-full h-full flex flex-col overflow-hidden"
          >
            <SheetHeader className="shrink-0 px-4 py-4 border-b border-border">
              <SheetTitle className="truncate pr-8">
                {editorPath.split("/").pop()}
              </SheetTitle>
            </SheetHeader>
            <SheetBody className="p-0 flex flex-col flex-1 overflow-hidden min-h-0">
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="flex-1 w-full h-full resize-none border-0 rounded-none focus:ring-0 p-4 font-mono text-sm leading-relaxed bg-transparent focus:outline-none text-foreground placeholder:text-muted-fg"
                spellCheck={false}
              />
            </SheetBody>
            <SheetFooter className="p-4 border-t border-border shrink-0 bg-muted/5">
              <SheetClose>
                <Button intent="secondary">Cancel</Button>
              </SheetClose>
              <Button onPress={saveContent} isDisabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}

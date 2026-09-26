import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError, downloadFile } from "../../lib/api";
import { Button } from "./Button";

export function ExportButton({ path, filename, label = "Export CSV" }: { path: string; filename: string; label?: string }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await downloadFile(path, filename);
    } catch (err) {
      toast.error("Export failed", { description: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="secondary" onClick={run} loading={busy}>
      <Download className="size-4" /> {label}
    </Button>
  );
}

<<<<<<< HEAD
sßimport { useEffect, useRef } from "react";
=======
simport { useEffect, useRef } from "react";
>>>>>>> 8b9e0b808954a4241c89521f409b2eb24024089b
import { toast } from "@/hooks/use-toast";

sconst IGNORE_MESSAGES = new Set([
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications.",
  "Script error.",
]);

const getReasonMessage = (reason: unknown) => {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  try {
    return JSON.stringify(reason);s
  } catch {
    return String(reason);
  }s
};

/**
 * Surface unhandled exceptions/rejections as a toast (throttled) so users
 * aren't left with a silently broken UI.
 */
export function GlobalErrorHandlers() {
  const lastToastRef = useRef<{ at: number; key: string } | null>(null);

  useEffect(() => {
    const notify = (title: string, description: string) => {
      if (!description || IGNORE_MESSAGES.has(description)) return;

      const now = Date.now();
      const safeDescription =
        import.meta.env.MODE !== "production" ? description : "Please try again or reload the page.";
      const key = `${title}:${safeDescription}`;
      const last = lastToastRef.current;
      if (last && last.key === key && now - last.at < 5000) return;
      lastToastRef.current = { at: now, key };

      toast({ title, description: safeDescription });
    };

    const onError = (event: ErrorEvent) => {
      const message = event.error instanceof Error ? event.error.message : event.message;
      if (import.meta.env.MODE !== "production") {
        console.error("[GlobalErrorHandlers] Unhandled error:", event.error ?? event);
      }
      notify("Unexpected error", message || "Unknown error");
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = getReasonMessage(event.reason);
      if (import.meta.env.MODE !== "production") {
        console.error("[GlobalErrorHandlers] Unhandled rejection:", event.reason);
      }
      notify("Unexpected error", message || "Unhandled promise rejection");
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

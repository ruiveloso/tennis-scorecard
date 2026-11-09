import { useEffect } from "react";
import { toast } from "sonner";

export function screenWakeLockAvailable(): boolean {
  return window.isSecureContext && "wakeLock" in navigator;
}

export function useScreenWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (!screenWakeLockAvailable()) {
      toast.error("Keeping the screen awake is not supported here. Use a supported browser over HTTPS.");
      return;
    }

    let disposed = false;
    let pending = false;
    let lock: WakeLockSentinel | null = null;

    const release = async (sentinel: WakeLockSentinel) => {
      try {
        if (!sentinel.released) await sentinel.release();
      } catch (error) {
        toast.error("Could not release the screen wake lock.", {
          description: error instanceof Error ? error.message : String(error),
        });
      }
    };

    const releaseCurrent = () => {
      const current = lock;
      lock = null;
      if (current) void release(current);
    };

    const request = async () => {
      if (disposed || pending || lock || document.visibilityState !== "visible") return;
      pending = true;
      let retryOnReturn = false;
      try {
        const acquired = await navigator.wakeLock.request("screen");
        // Requests can finish after the match is closed or the app is hidden.
        if (disposed || document.visibilityState !== "visible") {
          retryOnReturn = true;
          await release(acquired);
          return;
        }
        lock = acquired;
        acquired.addEventListener("release", () => {
          if (lock !== acquired) return;
          lock = null;
          if (!disposed && document.visibilityState === "visible") {
            toast.warning("Your device released the screen wake lock. The screen may now sleep.");
          }
        }, { once: true });
        if (acquired.released) {
          lock = null;
          toast.warning("Your device could not keep the screen awake. Check battery-saving settings.");
        }
      } catch (error) {
        if (!disposed && document.visibilityState === "visible") {
          toast.error("Could not keep the screen awake. Your device may restrict this to save battery.", {
            description: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        pending = false;
        if (retryOnReturn && !disposed && document.visibilityState === "visible") void request();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void request();
      else releaseCurrent();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    void request();
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      releaseCurrent();
    };
  }, [enabled]);
}

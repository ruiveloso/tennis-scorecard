import { useState } from "react";

export type PinStatus = "idle" | "locating" | "error";

/** Reads the device position once (rounded to ~1 m) and hands it to `onPinned`. */
export function usePinLocation(onPinned: (p: { lat: number; lon: number }) => void) {
  const [status, setStatus] = useState<PinStatus>("idle");
  const pin = () => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPinned({ lat: Math.round(pos.coords.latitude * 1e5) / 1e5, lon: Math.round(pos.coords.longitude * 1e5) / 1e5 });
        setStatus("idle");
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };
  return { status, pin, reset: () => setStatus("idle") };
}

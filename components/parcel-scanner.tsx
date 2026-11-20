"use client";

import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from "react";
import { inputCls } from "@/components/ui";
import { SearchIcon, BoxIcon } from "@/components/icons";

/**
 * Smartphone QR scanning (SN-SCAN-02, AT-04).
 *
 * Uses the browser's built-in BarcodeDetector, so there is no scanner
 * hardware and no heavy decoding library to download over a modest mobile
 * connection. Manual code entry is always available alongside it — that is
 * the required fallback for a damaged label, a camera permission refusal, or
 * a browser without BarcodeDetector (SN-SCAN-07).
 */
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

export function ParcelScanner({
  onScan,
  busy,
  label = "Scanner le colis",
}: {
  onScan: (value: string) => void;
  busy?: boolean;
  label?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  // Read the capability during render rather than setting state in an effect:
  // the server snapshot assumes support so the hint never flashes on first
  // paint, and the client reports the real value.
  const supported = useSyncExternalStore(
    () => () => {},
    () => Boolean(window.BarcodeDetector),
    () => true,
  );

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  // Always release the camera when the component goes away.
  useEffect(() => () => stop(), [stop]);

  async function start() {
    setCameraError(null);
    if (!window.BarcodeDetector) {
      setCameraError(
        "Ce navigateur ne gère pas le scan par caméra. Saisissez le code manuellement.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0 && codes[0].rawValue) {
            const value = codes[0].rawValue;
            stop();
            onScan(value);
            return;
          }
        } catch {
          // A single failed frame is normal — keep going.
        }
        requestAnimationFrame(() => void tick());
      };
      void tick();
    } catch {
      setCameraError(
        "Caméra indisponible. Autorisez l'accès ou saisissez le code manuellement.",
      );
      stop();
    }
  }

  return (
    <div>
      {scanning ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-black">
          <video ref={videoRef} className="aspect-square w-full object-cover" playsInline muted />
          <button
            onClick={stop}
            className="h-12 w-full bg-ink text-sm font-semibold text-white"
          >
            Arrêter la caméra
          </button>
        </div>
      ) : (
        <button
          onClick={start}
          disabled={busy}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-semibold text-white transition hover:bg-brand-dark active:scale-[0.99] disabled:opacity-60"
        >
          <BoxIcon width={20} height={20} /> {label}
        </button>
      )}

      {cameraError && (
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
          {cameraError}
        </p>
      )}
      {!supported && !cameraError && (
        <p className="mt-2 text-xs text-muted">
          Scan caméra indisponible sur ce navigateur — utilisez la saisie manuelle.
        </p>
      )}

      <div className="mt-3">
        <p className="mb-1.5 text-sm font-medium text-ink">Ou saisissez le code du colis</p>
        <div className="flex gap-2">
          <input
            className={inputCls}
            placeholder="YM-SN-000128"
            value={manual}
            autoCapitalize="characters"
            autoCorrect="off"
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manual.trim()) {
                onScan(manual.trim());
                setManual("");
              }
            }}
          />
          <button
            onClick={() => {
              if (!manual.trim()) return;
              onScan(manual.trim());
              setManual("");
            }}
            disabled={busy || !manual.trim()}
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand disabled:opacity-40"
          >
            <SearchIcon width={16} height={16} /> Valider
          </button>
        </div>
      </div>
    </div>
  );
}

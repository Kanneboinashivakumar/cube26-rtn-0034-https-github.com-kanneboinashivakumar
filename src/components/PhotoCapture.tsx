"use client";

/**
 * PhotoCapture.tsx
 *
 * Unified camera capture + file upload component.
 * Both sources feed the same images[] array (base64 strings + MIME types).
 * Camera capture uses MediaDevices.getUserMedia().
 * Limit: 1–5 photos total.
 *
 * Props:
 *   images         — current base64 image array
 *   mimeTypes      — parallel MIME type array
 *   onChange       — called with (images, mimeTypes) on every change
 *   maxPhotos      — max total photos (default 5)
 */

import { useRef, useState, useCallback } from "react";

type MimeType = "image/jpeg" | "image/png" | "image/webp";

interface PhotoCaptureProps {
  images: string[];
  mimeTypes: MimeType[];
  onChange: (images: string[], mimeTypes: MimeType[]) => void;
  maxPhotos?: number;
}

function dataUrlToBase64(dataUrl: string): { base64: string; mime: MimeType } {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] as MimeType ?? "image/jpeg";
  return { base64, mime };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PhotoCapture({
  images,
  mimeTypes,
  onChange,
  maxPhotos = 5,
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const atLimit = images.length >= maxPhotos;
  const remaining = maxPhotos - images.length;

  // ── Add images helper ─────────────────────────────────────────────────────
  const addImages = useCallback(
    (newImgs: string[], newMimes: MimeType[]) => {
      const available = maxPhotos - images.length;
      const toAdd = Math.min(available, newImgs.length);
      onChange(
        [...images, ...newImgs.slice(0, toAdd)],
        [...mimeTypes, ...newMimes.slice(0, toAdd)]
      );
    },
    [images, mimeTypes, onChange, maxPhotos]
  );

  // ── Remove a single image ─────────────────────────────────────────────────
  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newMimes = mimeTypes.filter((_, i) => i !== index);
    onChange(newImages, newMimes);
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const dataUrls = await Promise.all(files.map(fileToDataUrl));
    const parsed = dataUrls.map(dataUrlToBase64);
    addImages(parsed.map((p) => p.base64), parsed.map((p) => p.mime));

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Camera helpers ────────────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError(
        "Camera unavailable or permission denied. Use Upload Photos instead."
      );
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const { base64, mime } = dataUrlToBase64(dataUrl);
    addImages([base64], [mime]);
    stopCamera();
  };

  return (
    <div className="space-y-4">
      {/* ── Camera viewfinder ─────────────────────────────────────────── */}
      {cameraActive && (
        <div className="relative rounded-lg overflow-hidden bg-black border border-gray-300">
          <video
            ref={videoRef}
            className="w-full max-h-72 object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={atLimit}
              className="px-5 py-2 rounded-full bg-white text-gray-900 text-sm font-semibold shadow-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📸 Capture
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-5 py-2 rounded-full bg-gray-800/80 text-white text-sm font-medium hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Hidden canvas for capture ─────────────────────────────────── */}
      {!cameraActive && <canvas ref={canvasRef} className="hidden" />}

      {/* ── Buttons ───────────────────────────────────────────────────── */}
      {!cameraActive && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startCamera}
            disabled={atLimit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            Take Photo
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={atLimit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload Photos
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* ── Camera error ──────────────────────────────────────────────── */}
      {cameraError && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {cameraError}
        </p>
      )}

      {/* ── Photo count / limit indicator ─────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {images.length} of {maxPhotos} photos
          {atLimit && (
            <span className="ml-2 text-amber-600 font-medium">(limit reached)</span>
          )}
          {!atLimit && images.length === 0 && (
            <span className="ml-2 text-red-500">— at least 1 required</span>
          )}
        </span>
        {!atLimit && images.length > 0 && (
          <span className="text-gray-400">{remaining} more allowed</span>
        )}
      </div>

      {/* ── Image previews ────────────────────────────────────────────── */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((b64, i) => (
            <div key={i} className="relative group">
              <img
                src={`data:${mimeTypes[i]};base64,${b64}`}
                alt={`Photo ${i + 1}`}
                className="w-24 h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
              />
              <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                aria-label={`Remove photo ${i + 1}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Guidance ──────────────────────────────────────────────────── */}
      {images.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Photo guidance</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Front of product</li>
            <li>• Back or side view</li>
            <li>• Product label / serial number if visible</li>
            <li>• Accessories &amp; components laid out</li>
            <li>• Any visible damage</li>
          </ul>
        </div>
      )}
    </div>
  );
}

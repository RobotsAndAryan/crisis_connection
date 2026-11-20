import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X } from 'lucide-react';

interface CameraCaptureModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  open,
  title = 'Live Field Camera Capture',
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    setError(null);
    setReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera API unavailable in this browser context. Use the file upload button instead.');
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
          setReady(true);
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? `Camera permission unavailable (${err.message}). You can still upload any photo file.`
            : 'Unable to access camera.'
        );
      });

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);

  if (!open) return null;

  const snapPhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onCapture(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Camera className="h-4 w-4 text-cyan-400" />
            <span>{title}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 text-xs text-amber-200">
              {error}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-[300px] w-full object-cover"
              />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Opening camera...
                </div>
              )}
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={snapPhoto}
              disabled={!ready || Boolean(error)}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Capture Snapshot</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

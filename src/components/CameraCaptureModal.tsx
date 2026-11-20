import React, { useEffect, useRef, useState } from 'react';
import { CameraIcon, RefreshIcon, XIcon } from './icons';

interface CameraCaptureModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  open,
  title = 'Live camera capture',
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    setError(null);
    setReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera API unavailable in this browser context. Use photo upload instead.');
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
            ? `Camera permission unavailable (${err.message}). Upload a photo file instead.`
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-control bg-surface shadow-overlay">
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
            <CameraIcon size={16} className="text-ink-muted" />
            <span id="camera-modal-title">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-raised hover:text-ink-primary"
            aria-label="Close camera"
          >
            <XIcon size={16} />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="rounded-lg border border-caution/30 bg-caution-dim/60 p-4 text-xs text-ink-primary">
              {error}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-lg border border-hairline bg-recessed">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-[300px] w-full object-cover"
              />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-ink-secondary">
                  <RefreshIcon size={16} className="animate-spin" />
                  <span>Opening camera...</span>
                </div>
              )}
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="btn-secondary h-10 rounded-lg px-3.5 text-xs font-medium sm:h-9"
            >
              Cancel
            </button>
            <button
              onClick={snapPhoto}
              disabled={!ready || Boolean(error)}
              className="btn-primary flex h-10 items-center gap-1.5 rounded-lg px-4 text-xs font-medium disabled:opacity-50 sm:h-9"
            >
              <CameraIcon size={14} />
              <span>Capture snapshot</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

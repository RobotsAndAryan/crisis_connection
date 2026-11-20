// Generates realistic field ward / CCTV surveillance snapshots as PNG data URLs
// so coordinators can test multimodal Cloud Gemini bed counting and damage detection
// alongside uploading real photos or live camera snaps.

export interface SampleCctvPreset {
  id: string;
  campId: string;
  label: string;
  cameraId: string;
  description: string;
  totalCots: number;
  occupiedCots: number;
  smokeOcclusion: boolean;
  structuralDamage: boolean;
}

export const SAMPLE_CCTV_PRESETS: SampleCctvPreset[] = [
  {
    id: 'cctv-east-ward',
    campId: 'camp-east',
    label: 'Camp East · Ward B (CCTV-04, partial smoke)',
    cameraId: 'CAM-EAST-04B',
    description: '12 cots visible: 7 occupied, 5 open cots; light smoke occlusion in north-east corner.',
    totalCots: 12,
    occupiedCots: 7,
    smokeOcclusion: true,
    structuralDamage: false,
  },
  {
    id: 'cctv-north-trauma',
    campId: 'camp-north',
    label: 'Camp North · St. Jude Trauma Tent (CCTV-02)',
    cameraId: 'CAM-NORTH-02A',
    description: '16 cots visible: 14 occupied, 2 empty beds remaining, approaching overflow.',
    totalCots: 16,
    occupiedCots: 14,
    smokeOcclusion: false,
    structuralDamage: false,
  },
  {
    id: 'cctv-south-damaged',
    campId: 'camp-south',
    label: 'Camp South · Valley Clinic Annex (Drone/CCTV-07)',
    cameraId: 'CAM-SOUTH-07D',
    description: 'Collapsed roof beam over east wing, debris across cots, severe structural hazard.',
    totalCots: 10,
    occupiedCots: 2,
    smokeOcclusion: true,
    structuralDamage: true,
  },
];

export function generateCctvImageDataUrl(preset: SampleCctvPreset): string {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Matte neutral IR-optical floor background
  ctx.fillStyle = '#0f1110';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle floor grid tiles
  ctx.strokeStyle = 'rgba(237, 237, 235, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Ward perimeter walls
  ctx.strokeStyle = '#363936';
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 56, 664, 326);

  // Aisle centerline
  ctx.strokeStyle = 'rgba(237, 237, 235, 0.16)';
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(28, 218);
  ctx.lineTo(692, 218);
  ctx.stroke();
  ctx.setLineDash([]);

  // Cots in 2 rows
  const cols = Math.ceil(preset.totalCots / 2);
  const cotWidth = Math.min(82, Math.floor(600 / cols) - 16);
  const cotHeight = 112;
  const startX = 56;
  const gapX = (608 - cols * cotWidth) / Math.max(1, cols - 1);

  for (let i = 0; i < preset.totalCots; i++) {
    const row = i < cols ? 0 : 1;
    const col = row === 0 ? i : i - cols;
    const x = startX + col * (cotWidth + gapX);
    const y = row === 0 ? 78 : 244;
    const isOccupied = i < preset.occupiedCots;
    const isDamagedCot = preset.structuralDamage && col >= cols - 2;

    ctx.fillStyle = isDamagedCot ? '#281516' : '#181a18';
    ctx.strokeStyle = isDamagedCot ? '#e5484d' : isOccupied ? '#e2a43b' : '#4cc38a';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, cotWidth, cotHeight);
    ctx.strokeRect(x, y, cotWidth, cotHeight);

    // Pillow
    ctx.fillStyle = '#c5c7c2';
    ctx.fillRect(x + 12, y + 8, cotWidth - 24, 15);

    if (isDamagedCot) {
      ctx.strokeStyle = '#e5484d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6);
      ctx.lineTo(x + cotWidth - 6, y + cotHeight - 6);
      ctx.moveTo(x + cotWidth - 6, y + 6);
      ctx.lineTo(x + 6, y + cotHeight - 6);
      ctx.stroke();
    } else if (isOccupied) {
      ctx.fillStyle = '#9c6f23';
      ctx.fillRect(x + 10, y + 32, cotWidth - 20, cotHeight - 44);
      ctx.fillStyle = '#e8dfc9';
      ctx.beginPath();
      ctx.arc(x + cotWidth / 2, y + 20, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2a43b';
      ctx.font = '500 9.5px monospace';
      ctx.fillText('OCCUPIED', x + 9, y + cotHeight - 6);
    } else {
      ctx.fillStyle = 'rgba(76, 195, 138, 0.12)';
      ctx.fillRect(x + 8, y + 30, cotWidth - 16, cotHeight - 40);
      ctx.fillStyle = '#4cc38a';
      ctx.font = '500 9.5px monospace';
      ctx.fillText('OPEN BED', x + 10, y + cotHeight - 6);
    }

    ctx.fillStyle = '#828581';
    ctx.font = '10px monospace';
    ctx.fillText(`#${i + 1}`, x + 4, y + 14);
  }

  // Structural beam collapse overlay if damaged
  if (preset.structuralDamage) {
    ctx.save();
    ctx.translate(470, 120);
    ctx.rotate(0.28);
    ctx.fillStyle = 'rgba(53, 23, 25, 0.92)';
    ctx.strokeStyle = '#e5484d';
    ctx.lineWidth = 2;
    ctx.fillRect(-40, -16, 260, 32);
    ctx.strokeRect(-40, -16, 260, 32);
    ctx.fillStyle = '#f3b2b4';
    ctx.font = '600 12px monospace';
    ctx.fillText('ROOF BEAM COLLAPSE / DEBRIS', -18, 5);
    ctx.restore();
  }

  // Smoke / haze occlusion overlay
  if (preset.smokeOcclusion) {
    const grad = ctx.createRadialGradient(590, 130, 15, 590, 130, 180);
    grad.addColorStop(0, 'rgba(210, 212, 208, 0.52)');
    grad.addColorStop(0.6, 'rgba(150, 152, 148, 0.22)');
    grad.addColorStop(1, 'rgba(15, 17, 16, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(360, 56, 332, 326);
  }

  // Subtle scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 1);
  }

  // Top CCTV telemetry bar
  ctx.fillStyle = 'rgba(17, 18, 17, 0.92)';
  ctx.fillRect(0, 0, canvas.width, 40);
  ctx.fillStyle = '#e5484d';
  ctx.beginPath();
  ctx.arc(20, 20, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ededeb';
  ctx.font = '500 12px monospace';
  ctx.fillText(`REC  ${preset.cameraId}  |  ${preset.label}`, 34, 24);

  // Bottom UTC timestamp
  ctx.fillStyle = 'rgba(17, 18, 17, 0.92)';
  ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
  ctx.fillStyle = '#a5a7a4';
  ctx.font = '11px monospace';
  ctx.fillText(
    `IR-OPTICAL  |  UTC ${new Date().toISOString().replace('T', ' ').slice(0, 19)}  |  WARD TELEMETRY`,
    16,
    canvas.height - 10
  );

  return canvas.toDataURL('image/png');
}

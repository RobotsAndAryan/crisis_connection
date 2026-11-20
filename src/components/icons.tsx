import React from 'react';
import {
  Activity as LucideActivity,
  AlertOctagon as LucideAlertOctagon,
  AlertTriangle as LucideAlertTriangle,
  Battery as LucideBattery,
  BookOpen as LucideBookOpen,
  Camera as LucideCamera,
  Check as LucideCheck,
  CheckCircle2 as LucideCheckCircle2,
  ChevronDown as LucideChevronDown,
  ChevronRight as LucideChevronRight,
  ChevronUp as LucideChevronUp,
  Clapperboard as LucideClapperboard,
  Clock as LucideClock,
  Cloud as LucideCloud,
  CloudOff as LucideCloudOff,
  Compass as LucideCompass,
  Cpu as LucideCpu,
  Crosshair as LucideCrosshair,
  Database as LucideDatabase,
  Download as LucideDownload,
  ExternalLink as LucideExternalLink,
  Eye as LucideEye,
  Flame as LucideFlame,
  GitMerge as LucideGitMerge,
  HeartPulse as LucideHeartPulse,
  Image as LucideImage,
  LineChart as LucideLineChart,
  Map as LucideMap,
  MessageSquare as LucideMessageSquare,
  Mic as LucideMic,
  MicOff as LucideMicOff,
  Navigation as LucideNavigation,
  Play as LucidePlay,
  Radio as LucideRadio,
  RefreshCw as LucideRefreshCw,
  RotateCcw as LucideRotateCcw,
  Route as LucideRoute,
  Search as LucideSearch,
  Send as LucideSend,
  Settings as LucideSettings,
  Shield as LucideShield,
  ShieldAlert as LucideShieldAlert,
  ShieldCheck as LucideShieldCheck,
  Signal as LucideSignal,
  Sliders as LucideSliders,
  Smartphone as LucideSmartphone,
  TrendingDown as LucideTrendingDown,
  Upload as LucideUpload,
  UploadCloud as LucideUploadCloud,
  WifiOff as LucideWifiOff,
  X as LucideX,
  Zap as LucideZap,
  type LucideProps,
} from 'lucide-react';

export type IconProps = LucideProps;

function makeIcon(IconComp: React.ComponentType<LucideProps>) {
  const Wrapped: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.5, className, ...rest }) => (
    <IconComp size={size} strokeWidth={strokeWidth} className={className} {...rest} />
  );
  Wrapped.displayName = IconComp.displayName ?? 'Icon';
  return Wrapped;
}

/** Flat geometric Crisis Connection mark: emergency cross inside cardinal coordinate ticks. */
export const CrisisMark: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 5.5V14.5M5.5 10H14.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
  </svg>
);

export const ActivityIcon = makeIcon(LucideActivity);
export const AlertOctagonIcon = makeIcon(LucideAlertOctagon);
export const AlertTriangleIcon = makeIcon(LucideAlertTriangle);
export const BatteryIcon = makeIcon(LucideBattery);
export const BookOpenIcon = makeIcon(LucideBookOpen);
export const CameraIcon = makeIcon(LucideCamera);
export const CheckIcon = makeIcon(LucideCheck);
export const CheckCircleIcon = makeIcon(LucideCheckCircle2);
export const ChevronDownIcon = makeIcon(LucideChevronDown);
export const ChevronRightIcon = makeIcon(LucideChevronRight);
export const ChevronUpIcon = makeIcon(LucideChevronUp);
export const ClapperboardIcon = makeIcon(LucideClapperboard);
export const ClockIcon = makeIcon(LucideClock);
export const CloudIcon = makeIcon(LucideCloud);
export const CloudOffIcon = makeIcon(LucideCloudOff);
export const CompassIcon = makeIcon(LucideCompass);
export const CpuIcon = makeIcon(LucideCpu);
export const CrosshairIcon = makeIcon(LucideCrosshair);
export const DatabaseIcon = makeIcon(LucideDatabase);
export const DownloadIcon = makeIcon(LucideDownload);
export const ExternalLinkIcon = makeIcon(LucideExternalLink);
export const EyeIcon = makeIcon(LucideEye);
export const FlameIcon = makeIcon(LucideFlame);
export const GitMergeIcon = makeIcon(LucideGitMerge);
export const HeartPulseIcon = makeIcon(LucideHeartPulse);
export const ImageIcon = makeIcon(LucideImage);
export const LineChartIcon = makeIcon(LucideLineChart);
export const MapIcon = makeIcon(LucideMap);
export const MessageSquareIcon = makeIcon(LucideMessageSquare);
export const MicIcon = makeIcon(LucideMic);
export const MicOffIcon = makeIcon(LucideMicOff);
export const NavigationIcon = makeIcon(LucideNavigation);
export const PlayIcon = makeIcon(LucidePlay);
export const RadioIcon = makeIcon(LucideRadio);
export const RefreshIcon = makeIcon(LucideRefreshCw);
export const RotateCcwIcon = makeIcon(LucideRotateCcw);
export const RouteIcon = makeIcon(LucideRoute);
export const SearchIcon = makeIcon(LucideSearch);
export const SendIcon = makeIcon(LucideSend);
export const SettingsIcon = makeIcon(LucideSettings);
export const ShieldIcon = makeIcon(LucideShield);
export const ShieldAlertIcon = makeIcon(LucideShieldAlert);
export const ShieldCheckIcon = makeIcon(LucideShieldCheck);
export const SignalIcon = makeIcon(LucideSignal);
export const SlidersIcon = makeIcon(LucideSliders);
export const SmartphoneIcon = makeIcon(LucideSmartphone);
export const TrendingDownIcon = makeIcon(LucideTrendingDown);
export const UploadIcon = makeIcon(LucideUpload);
export const UploadCloudIcon = makeIcon(LucideUploadCloud);
export const WifiOffIcon = makeIcon(LucideWifiOff);
export const XIcon = makeIcon(LucideX);
export const ZapIcon = makeIcon(LucideZap);

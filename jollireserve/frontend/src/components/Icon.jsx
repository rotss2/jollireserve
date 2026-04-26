// Icon Component - Lucide Icons for consistent UI
// Replaces all emoji usage with proper icon components

import React from 'react';
import {
  // Navigation & Actions
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Plus,
  Minus,
  Search,
  Filter,
  Menu,
  MoreHorizontal,
  MoreVertical,
  RefreshCw,
  
  // Status & Feedback
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  Loader2,
  
  // Food & Dining
  Utensils,
  UtensilsCrossed,
  ChefHat,
  Coffee,
  Wine,
  GlassWater,
  ShoppingBag,
  
  // Time & Scheduling
  Calendar,
  Clock,
  Timer,
  Hourglass,
  Watch,
  
  // People & Social
  Users,
  User,
  UserPlus,
  UserMinus,
  Heart,
  Star,
  ThumbsUp,
  
  // Communication
  MessageSquare,
  Mail,
  Phone,
  Bell,
  BellRing,
  Send,
  
  // Location & Maps
  MapPin,
  Navigation,
  Compass,
  
  // Payment & Commerce
  CreditCard,
  Wallet,
  Banknote,
  Receipt,
  ShoppingBag,
  
  // Security & Access
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  
  // Technology & Connectivity
  Wifi,
  WifiOff,
  Smartphone,
  Monitor,
  Laptop,
  Battery,
  BatteryCharging,
  
  // Data & Analytics
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  
  // Files & Documents
  FileText,
  FileCheck,
  Download,
  Upload,
  Copy,
  Trash2,
  Edit,
  
  // Settings & System
  Settings,
  Cog,
  Sliders,
  Wrench,
  RefreshCw,
  RotateCcw,
  Power,
  
  // Misc
  Home,
  Building2,
  Store,
  DoorOpen,
  Ticket,
  QrCode,
  ScanLine,
  Sparkles,
  Zap,
  Flame,
  Sun,
  Moon,
  
  // Specific to booking features
  Armchair,
  Table2,
  Chair,
  LayoutGrid,
  Layers,
  Grid3x3,
  List,
  LayoutList,
  
  // Queue specific
  ListOrdered,
  ListStart,
  ListEnd,
  MoveVertical,
  
  // Payment specific
  BadgeCheck,
  CircleDollarSign,
  DollarSign,
  
  // Real-time indicators
  Radio,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  SignalZero,
  
} from 'lucide-react';

// Icon mapping for consistent usage across the app
const iconMap = {
  // Navigation
  back: ChevronLeft,
  next: ChevronRight,
  chevron: ChevronRight,
  close: X,
  menu: Menu,
  search: Search,
  filter: Filter,
  more: MoreHorizontal,
  
  // Dining options
  dineIn: UtensilsCrossed,
  takeaway: ShoppingBag,
  queue: ListOrdered,
  
  // Status
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  help: HelpCircle,
  loading: Loader2,
  check: Check,
  
  // Dining
  dineIn: Utensils,
  takeaway: ShoppingBag,
  queue: ListOrdered,
  restaurant: Store,
  table: Table2,
  chair: Chair,
  chef: ChefHat,
  
  // Time
  calendar: Calendar,
  clock: Clock,
  timer: Timer,
  hourglass: Hourglass,
  
  // People
  users: Users,
  user: User,
  party: Users,
  
  // Communication
  message: MessageSquare,
  email: Mail,
  phone: Phone,
  notification: Bell,
  notificationActive: BellRing,
  
  // Payment
  payment: CreditCard,
  cash: Banknote,
  receipt: Receipt,
  secure: ShieldCheck,
  verified: BadgeCheck,
  
  // Location
  location: MapPin,
  navigation: Navigation,
  
  // Connectivity
  wifi: Wifi,
  wifiOff: WifiOff,
  signal: Signal,
  signalHigh: SignalHigh,
  signalMedium: SignalMedium,
  signalLow: SignalLow,
  signalZero: SignalZero,
  live: Radio,
  
  // Actions
  edit: Edit,
  delete: Trash2,
  copy: Copy,
  download: Download,
  upload: Upload,
  refresh: RefreshCw,
  undo: RotateCcw,
  settings: Settings,
  
  // Features
  sparkle: Sparkles,
  fast: Zap,
  hot: Flame,
  home: Home,
  qr: QrCode,
  scan: ScanLine,
  
  // Data
  chart: BarChart3,
  analytics: PieChart,
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  
  // Areas
  indoor: Building2,
  outdoor: Sun,
  private: Lock,
  bar: Wine,
  
  // Layout
  grid: LayoutGrid,
  list: List,
  layers: Layers,
};

export const Icon = ({ 
  name, 
  size = 20, 
  className = '', 
  color = 'currentColor',
  strokeWidth = 2,
  ...props 
}) => {
  const IconComponent = iconMap[name] || HelpCircle;
  
  return (
    <IconComponent 
      size={size} 
      className={className}
      color={color}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
};

// Pre-sized icon variants for common use cases
export const IconXs = (props) => <Icon {...props} size={14} />;
export const IconSm = (props) => <Icon {...props} size={18} />;
export const IconMd = (props) => <Icon {...props} size={20} />;
export const IconLg = (props) => <Icon {...props} size={24} />;
export const IconXl = (props) => <Icon {...props} size={32} />;

// Status icon with color
export const StatusIcon = ({ status, size = 20, className = '' }) => {
  const config = {
    success: { icon: 'success', color: 'var(--color-success)' },
    error: { icon: 'error', color: 'var(--color-danger)' },
    warning: { icon: 'warning', color: 'var(--color-warning)' },
    info: { icon: 'info', color: 'var(--color-info)' },
    loading: { icon: 'loading', color: 'var(--color-brand)' },
  };
  
  const { icon, color } = config[status] || config.info;
  
  return (
    <Icon 
      name={icon} 
      size={size} 
      className={`${className} ${status === 'loading' ? 'animate-spin' : ''}`}
      color={color}
    />
  );
};

// Feature icon with brand color
export const FeatureIcon = ({ name, size = 24, className = '' }) => (
  <Icon 
    name={name} 
    size={size} 
    className={className}
    color="var(--color-brand)"
  />
);

export default Icon;

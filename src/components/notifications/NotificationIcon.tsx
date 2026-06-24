import {
  Bell,
  BookOpen,
  ChevronsUp,
  ClipboardList,
  Clock,
  Coins,
  CreditCard,
  Flame,
  Info,
  RotateCcw,
  Shield,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Podium } from "@/components/ui/podium-icon";
import { cn } from "@/lib/utils";

interface NotificationIconProps {
  type: string;
  isRead?: boolean | null;
}

/**
 * Small icon shown inline before a notification's title, picked from the
 * notification's `type`. Muted grey by default; dimmed further once the
 * notification is read.
 */
export function NotificationIcon({ type, isRead }: NotificationIconProps) {
  const className = cn(
    "mt-0.5 h-3.5 w-3.5 shrink-0",
    isRead ? "text-gray-300" : "text-muted-foreground"
  );

  switch (type) {
    case "achievement":
      return <Trophy className={className} aria-hidden="true" />;
    case "streak":
      return <Flame className={className} aria-hidden="true" />;
    case "goal":
      return <Target className={className} aria-hidden="true" />;
    case "personal_best":
      return <TrendingUp className={className} aria-hidden="true" />;
    case "level":
      return <ChevronsUp className={className} aria-hidden="true" />;
    case "league":
      return <Podium className={className} aria-hidden="true" />;
    case "coins":
      return <Coins className={className} aria-hidden="true" />;
    case "wordprogress":
      return <RotateCcw className={className} aria-hidden="true" />;
    case "learning":
      return <ClipboardList className={className} aria-hidden="true" />;
    case "reminder":
      return <Clock className={className} aria-hidden="true" />;
    case "billing":
      return <CreditCard className={className} aria-hidden="true" />;
    case "content":
      return <BookOpen className={className} aria-hidden="true" />;
    case "system":
      return <Info className={className} aria-hidden="true" />;
    case "admin":
      return <Shield className={className} aria-hidden="true" />;
    default:
      return <Bell className={className} aria-hidden="true" />;
  }
}

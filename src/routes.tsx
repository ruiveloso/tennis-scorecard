import type { ReactElement } from "react";
import { BookOpen, ClipboardList, History, type LucideIcon, Trophy } from "lucide-react";
import { HomePage } from "@/pages/home";
import { HistoryPage } from "@/pages/history";
import { CoachPage } from "@/pages/coach";
import { GuidePage } from "@/pages/guide";

export interface AppRoute {
  /** "/" is the index route; others are paths under the shell. */
  path: string;
  element: ReactElement;
  label?: string;
  icon?: LucideIcon;
}

// Single source of truth for routes; the shell's nav maps over the labelled entries.
export const routes: AppRoute[] = [
  { path: "/", element: <HomePage />, label: "Score", icon: Trophy },
  { path: "/history", element: <HistoryPage />, label: "History", icon: History },
  { path: "/coach", element: <CoachPage />, label: "Coach", icon: ClipboardList },
  { path: "/guide", element: <GuidePage />, label: "Guide", icon: BookOpen },
];

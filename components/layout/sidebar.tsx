"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEvent } from "@/contexts/event-context";
import {
  Music2,
  LayoutDashboard,
  CalendarDays,
  Ticket,
  Users,
  UserCheck,
  GlassWater,
  Receipt,
  ClipboardList,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/events", icon: CalendarDays, label: "Eventos" },
  { href: "/tickets", icon: Ticket, label: "Ingressos" },
  { href: "/guests", icon: UserCheck, label: "Convidados" },
  { href: "/promoters", icon: Users, label: "Promotores" },
  { href: "/bar", icon: GlassWater, label: "Bar" },
  { href: "/stock", icon: Package, label: "Estoque" },
  { href: "/expenses", icon: Receipt, label: "Despesas" },
  { href: "/closing", icon: ClipboardList, label: "Fechamento" },
  { href: "/export", icon: Download, label: "Exportação" },
  { href: "/settings", icon: Settings, label: "Configurações" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { activeEvent } = useEvent();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-white/5 bg-zinc-950 transition-all duration-300",
        "bg-gradient-to-b from-zinc-950 via-zinc-950 to-indigo-950/20",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 p-4 border-b border-white/5", collapsed && "justify-center px-3")}>
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
          <Music2 className="w-4 h-4 text-indigo-400" />
        </div>
        {!collapsed && (
          <span className="font-bold text-sm tracking-tight truncate bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">Dyzo Finance</span>
        )}
      </div>

      {/* Active event indicator */}
      {activeEvent && !collapsed && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-indigo-500/8 border border-indigo-500/20 backdrop-blur-sm">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Evento ativo</p>
          <p className="text-xs font-medium text-indigo-300 truncate">{activeEvent.name}</p>
        </div>
      )}
      {activeEvent && collapsed && (
        <div className="mt-3 w-8 h-1.5 rounded-full bg-indigo-500/50 mx-auto" title={activeEvent.name} />
      )}

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 mt-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                collapsed && "justify-center px-2",
                active
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm shadow-indigo-500/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-white/5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200",
            collapsed && "justify-center px-2"
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

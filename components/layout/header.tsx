"use client";

import { signOut } from "next-auth/react";
import { useEvent } from "@/contexts/event-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Settings, X } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
  };
}

export default function Header({ user }: HeaderProps) {
  const { activeEvent, setActiveEvent } = useEvent();

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() ?? "U";

  return (
    <header className="h-14 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      {/* Active event */}
      <div className="flex items-center gap-3">
        {activeEvent ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <span className="text-xs text-muted-foreground">Evento:</span>{" "}
              <span className="text-sm font-medium text-foreground">{activeEvent.name}</span>
            </div>
            <button
              onClick={() => setActiveEvent(null)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Remover seleção"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link href="/events">
            <Badge variant="outline" className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer transition-colors">
              Selecionar evento
            </Badge>
          </Link>
        )}
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary transition-colors">
          <Avatar className="w-7 h-7">
            <AvatarFallback className="text-xs bg-indigo-500/15 text-indigo-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium leading-none">{user.name ?? user.email}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{user.role === "admin" ? "Administrador" : "Operador"}</p>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user.role === "admin" && (
            <DropdownMenuItem>
              <Link href="/settings" className="flex items-center w-full">
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-red-400 focus:text-red-400"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

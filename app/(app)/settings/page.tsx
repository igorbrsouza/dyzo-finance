"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Settings, Plus, Trash2, Edit2, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/constants";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const defaultForm = { name: "", email: "", password: "", role: "operator" };

export default function SettingsPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  async function fetchUsers() {
    if (!isAdmin) return;
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, [isAdmin]);

  function openCreate() {
    setEditingUser(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.email) return;
    if (!editingUser && !form.password) {
      toast.error("Senha obrigatória para novo usuário");
      return;
    }
    setSaving(true);
    const method = editingUser ? "PUT" : "POST";
    const res = await fetch("/api/users", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingUser ? { id: editingUser.id, ...form } : form),
    });
    if (res.ok) {
      toast.success(editingUser ? "Usuário atualizado!" : "Usuário criado!");
      setDialogOpen(false);
      fetchUsers();
    } else {
      const data = await res.json();
      toast.error(data.error || "Erro ao salvar usuário");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este usuário?")) return;
    const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Usuário removido");
      fetchUsers();
    } else {
      const data = await res.json();
      toast.error(data.error || "Erro ao remover usuário");
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldCheck className="w-12 h-12 text-muted-foreground/20 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground text-sm">Apenas administradores podem acessar as configurações.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Configurações</h1>
          <p className="text-muted-foreground text-sm">Gerenciamento de equipe</p>
        </div>
        <Button onClick={openCreate} className="bg-green-600 hover:bg-green-500 text-white gap-2">
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4" />
            Equipe ({users.length} usuário{users.length !== 1 ? "s" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="hidden md:table-cell">Desde</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">Carregando...</TableCell>
                </TableRow>
              ) : users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-sm">{user.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${user.role === "admin" ? "border-green-500/30 text-green-400" : "border-zinc-500/30 text-zinc-400"}`}>
                      {user.role === "admin" ? "Admin" : "Operador"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(user)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {user.id !== session?.user?.id && (
                        <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input type="email" placeholder="email@exemplo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editingUser} />
            </div>
            <div className="space-y-1.5">
              <Label>{editingUser ? "Nova Senha (deixe em branco para não alterar)" : "Senha *"}</Label>
              <Input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.email} className="bg-green-600 hover:bg-green-500 text-white">
              {saving ? "Salvando..." : editingUser ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

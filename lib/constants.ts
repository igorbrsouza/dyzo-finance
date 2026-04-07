export const PLATFORM_RETENTION = 0.3; // 30% retido pela plataforma

export const EXPENSE_CATEGORIES = [
  { value: "dj_artists", label: "DJ / Artistas" },
  { value: "security", label: "Segurança" },
  { value: "bartenders", label: "Bartenders / Garçons" },
  { value: "marketing", label: "Divulgação / Marketing" },
  { value: "venue", label: "Aluguel do Espaço" },
  { value: "production", label: "Equipe de Produção" },
  { value: "drinks", label: "Bebidas (Custo)" },
  { value: "decoration", label: "Decoração" },
  { value: "supplies", label: "Insumos" },
];

export const EVENT_STATUSES = [
  { value: "planning", label: "Em Planejamento" },
  { value: "active", label: "Ativo" },
  { value: "closed", label: "Encerrado" },
];

export const TICKET_CHANNELS = [
  { value: "platform", label: "Plataforma" },
  { value: "pix", label: "PIX Direto" },
];

export const GUEST_STATUSES = [
  { value: "confirmed", label: "Confirmado" },
  { value: "pending", label: "Pendente" },
  { value: "cancelled", label: "Cancelado" },
];

export const EXPENSE_STATUSES = [
  { value: "paid", label: "Pago" },
  { value: "pending", label: "Pendente" },
  { value: "partial", label: "Parcial" },
];

export const BATCH_STATUSES = [
  { value: "active", label: "Ativo" },
  { value: "sold_out", label: "Esgotado" },
  { value: "closed", label: "Encerrado" },
];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDatetime(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getEventStatusLabel(status: string): string {
  return EVENT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function getExpenseCategoryLabel(category: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

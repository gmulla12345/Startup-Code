import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface BillingHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "failed" | "pending" | "refunded";
  createdAt: string;
}

const STATUS_VARIANT = {
  paid: "forest",
  failed: "default",
  pending: "outline",
  refunded: "gold",
} as const;

export function BillingHistory({ items }: { items: BillingHistoryItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
      <div className="flex items-center gap-2 mb-4">
        <Receipt className="h-4 w-4 text-foreground-muted" />
        <h3 className="font-display text-lg font-semibold text-foreground">Billing history</h3>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
            <span className="text-foreground-muted">
              {new Date(item.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            </span>
            <span className="font-medium text-foreground">
              ${item.amount.toFixed(2)} {item.currency.toUpperCase()}
            </span>
            <Badge variant={STATUS_VARIANT[item.status]}>{item.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

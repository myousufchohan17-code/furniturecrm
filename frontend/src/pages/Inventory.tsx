import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { Product, StockLog } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { EmptyState } from "../components/ui/EmptyState";
import { Field, fieldClass } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { CardSkeleton } from "../components/ui/Skeleton";
import { dateTimeLabel } from "../lib/format";

type InventoryResponse = {
  items: Product[];
  threshold: number;
  totals: { all: number; low: number; out: number };
};

export function Inventory() {
  const { settings } = useAuth();
  const { push } = useToast();
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [change, setChange] = useState("1");
  const [reason, setReason] = useState("Stock received");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [inv, logData] = await Promise.all([
        api<InventoryResponse>(`/api/inventory?search=${encodeURIComponent(search)}&stock=${stock}`),
        api<{ items: StockLog[] }>("/api/inventory/logs"),
      ]);
      setData(inv);
      setLogs(logData.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [search, stock]);

  async function adjust(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await api(`/api/inventory/${selected.id}/adjust`, {
        method: "POST",
        json: { change: Number(change), reason },
      });
      push("Inventory updated");
      setSelected(null);
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Could not update stock", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Tracked products" value={data?.totals.all ?? 0} />
        <Stat label="Low stock" value={data?.totals.low ?? 0} />
        <Stat label="Out of stock" value={data?.totals.out ?? 0} />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input className={fieldClass} placeholder="Search inventory" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={fieldClass} value={stock} onChange={(e) => setStock(e.target.value)}>
          <option value="">All stock levels</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      {loading && !data ? <CardSkeleton rows={6} /> : !data?.items.length ? (
        <EmptyState title="No inventory records" text="Add products first. Stock quantities will appear here from the database." />
      ) : (
        <div className="rounded-3xl bg-white p-4 card-shadow sm:p-5">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td className="font-semibold">{item.name}</td>
                    <td>{item.sku}</td>
                    <td>{item.category?.name}</td>
                    <td>{item.stock}</td>
                    <td>
                      <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${
                        item.stockStatus === "out" ? "bg-red-50 text-red-800" : item.stockStatus === "low" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"
                      }`}>
                        {item.stockStatus === "out" ? "Out of stock" : item.stockStatus === "low" ? "Low stock" : "In stock"}
                      </span>
                    </td>
                    <td className="text-right">
                      <button className="text-sm font-semibold text-wood" onClick={() => { setSelected(item); setChange("1"); setReason("Stock received"); }}>Adjust</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">Low-stock threshold: {data.threshold} · Shop setting: {settings?.lowStockThreshold}</p>
        </div>
      )}

      <div className="rounded-3xl bg-white p-5 card-shadow">
        <h3 className="font-display text-xl text-wood">Stock activity</h3>
        {logs.length ? (
          <div className="mt-4 space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-col justify-between gap-1 rounded-xl bg-cream px-3 py-3 sm:flex-row sm:items-center">
                <p className="text-sm">{log.product.name}: {log.change > 0 ? "+" : ""}{log.change} · {log.reason}</p>
                <p className="text-xs text-muted">{dateTimeLabel(log.createdAt)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4"><EmptyState title="No stock changes yet" text="Adjustments and order-related stock movement will appear here." /></div>
        )}
      </div>

      <Modal open={!!selected} title={`Adjust stock${selected ? ` · ${selected.name}` : ""}`} onClose={() => setSelected(null)}>
        <form onSubmit={adjust} className="space-y-3">
          <Field label="Change amount">
            <input className={fieldClass} type="number" value={change} onChange={(e) => setChange(e.target.value)} required />
          </Field>
          <p className="text-xs text-muted">Use a positive number to add stock and a negative number to reduce it.</p>
          <Field label="Reason">
            <input className={fieldClass} value={reason} onChange={(e) => setReason(e.target.value)} required />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy ? "Saving..." : "Update stock"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white p-5 card-shadow">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl text-wood">{value}</p>
    </div>
  );
}

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { api, qs, ApiError } from "../api/client";
import type { Customer, Order, Paginated, Product } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Field, fieldClass } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { CardSkeleton } from "../components/ui/Skeleton";
import { dateLabel, money, statusClass } from "../lib/format";

const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

type Line = { productId: string; quantity: number };

export function Orders() {
  const { settings } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Paginated<Order> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get("search") || "");
  const [status, setStatus] = useState(params.get("status") || "");
  const [page, setPage] = useState(Number(params.get("page") || 1));
  const [formOpen, setFormOpen] = useState(params.get("new") === "1");
  const [editing, setEditing] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await api<Paginated<Order>>(`/api/orders${qs({ search, status, page, limit: 10 })}`);
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [search, status, page]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set("search", search);
    if (status) next.set("status", status);
    if (page > 1) next.set("page", String(page));
    setParams(next, { replace: true });
  }, [search, status, page, setParams]);

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/orders/${deleting.id}`, { method: "DELETE" });
      push("Order deleted");
      setDeleting(null);
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Could not delete order", "error");
    } finally {
      setBusy(false);
    }
  }

  const symbol = settings?.currencySymbol || "$";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:max-w-xl">
          <input className={fieldClass} placeholder="Search orders or customers" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          <select className={fieldClass} value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={16} /> Add order
        </button>
      </div>

      {loading && !data ? (
        <CardSkeleton rows={6} />
      ) : !data?.items.length ? (
        <EmptyState title="No orders yet" text="Create an order to reduce stock and update dashboard totals." action={<button className="btn-primary" onClick={() => setFormOpen(true)}>Add order</button>} />
      ) : (
        <div className="rounded-3xl bg-white p-4 card-shadow sm:p-5">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((order) => (
                  <tr key={order.id}>
                    <td className="font-semibold">
                      <Link to={`/orders/${order.id}`} className="text-wood">{order.orderNumber}</Link>
                    </td>
                    <td>{order.customer.name}</td>
                    <td>{order.items.reduce((n, i) => n + i.quantity, 0)}</td>
                    <td><span className={`rounded-full px-2.5 py-1 text-xs capitalize ${statusClass(order.status)}`}>{order.status}</span></td>
                    <td>{money(order.total, symbol)}</td>
                    <td>{dateLabel(order.createdAt)}</td>
                    <td className="text-right">
                      <button className="mr-2 text-sm font-semibold text-walnut" onClick={() => navigate(`/orders/${order.id}`)}>View</button>
                      <button className="mr-2 text-sm font-semibold text-wood" onClick={() => { setEditing(order); setFormOpen(true); }}>Edit</button>
                      <button className="text-red-700" onClick={() => setDeleting(order)} aria-label="Delete"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
        </div>
      )}

      <OrderForm
        open={formOpen}
        order={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); load(); }}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete this order?"
        message="This permanently removes the order. Stock will be restored if the order was not cancelled."
        loading={busy}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
    </div>
  );
}

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <button className="btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="text-muted">Page {page} of {pages}</span>
      <button className="btn-secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

export function OrderForm({
  open,
  order,
  onClose,
  onSaved,
}: {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [tax, setTax] = useState("0");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: 1 }]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [c, p] = await Promise.all([
        api<Paginated<Customer>>("/api/customers?limit=50"),
        api<Paginated<Product>>("/api/products?limit=50"),
      ]);
      setCustomers(c.items);
      setProducts(p.items);
    })();
    setCustomerId(order?.customerId || "");
    setNotes(order?.notes || "");
    setTax(String(order?.tax ?? 0));
    setLines(order?.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) || [{ productId: "", quantity: 1 }]);
  }, [open, order]);

  const preview = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => {
      const product = products.find((p) => p.id === line.productId);
      return sum + (product ? product.price * line.quantity : 0);
    }, 0);
    return { subtotal, total: subtotal + Number(tax || 0) };
  }, [lines, products, tax]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        customerId,
        notes,
        tax: Number(tax || 0),
        items: lines.filter((l) => l.productId),
      };
      if (order) {
        await api(`/api/orders/${order.id}`, { method: "PUT", json: payload });
        push("Order updated");
      } else {
        await api("/api/orders", { method: "POST", json: payload });
        push("Order created");
      }
      onSaved();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Could not save order", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={order ? "Edit order" : "Add order"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <Field label="Customer">
          <select className={fieldClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">Select a customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
              <select className={fieldClass} value={line.productId} onChange={(e) => setLines((rows) => rows.map((r, i) => i === index ? { ...r, productId: e.target.value } : r))} required>
                <option value="">Select a product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock} in stock)</option>)}
              </select>
              <input className={fieldClass} type="number" min={1} value={line.quantity} onChange={(e) => setLines((rows) => rows.map((r, i) => i === index ? { ...r, quantity: Number(e.target.value) } : r))} />
              <button type="button" className="btn-secondary" onClick={() => setLines((rows) => rows.filter((_, i) => i !== index))} disabled={lines.length === 1}>Remove</button>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={() => setLines((rows) => [...rows, { productId: "", quantity: 1 }])}>Add item</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tax">
            <input className={fieldClass} type="number" min={0} step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
          </Field>
          <Field label="Notes">
            <input className={fieldClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <p className="text-sm text-muted">Subtotal {money(preview.subtotal)} · Total {money(preview.total)}</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? "Saving..." : "Save order"}</button>
        </div>
      </form>
    </Modal>
  );
}

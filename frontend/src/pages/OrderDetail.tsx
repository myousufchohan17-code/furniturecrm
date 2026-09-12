import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Order } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { CardSkeleton } from "../components/ui/Skeleton";
import { dateTimeLabel, money, statusClass } from "../lib/format";
import { fieldClass } from "../components/ui/Field";
import { OrderForm } from "./Orders";

const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

export function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useAuth();
  const { push } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const symbol = settings?.currencySymbol || "$";

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      setOrder(await api<Order>(`/api/orders/${id}`));
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Order not found", "error");
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function changeStatus(status: string) {
    if (!order) return;
    try {
      const updated = await api<Order>(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        json: { status },
      });
      setOrder(updated);
      push("Order status updated");
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Could not update status", "error");
    }
  }

  async function remove() {
    if (!order) return;
    setBusy(true);
    try {
      await api(`/api/orders/${order.id}`, { method: "DELETE" });
      push("Order deleted");
      navigate("/orders");
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Could not delete order", "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !order) return <CardSkeleton rows={8} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/orders" className="text-sm text-walnut">Back to orders</Link>
          <h2 className="font-display text-3xl text-wood">{order.orderNumber}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setEditOpen(true)}>Edit</button>
          <button className="btn-danger" onClick={() => setConfirm(true)}>Delete</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 card-shadow lg:col-span-2">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product.name}</td>
                    <td>{item.quantity}</td>
                    <td>{money(item.price, symbol)}</td>
                    <td>{money(item.price * item.quantity, symbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl bg-white p-5 card-shadow">
            <p className="text-sm text-muted">Customer</p>
            <Link to={`/customers/${order.customerId}`} className="mt-1 block font-semibold">{order.customer.name}</Link>
            <p className="text-sm text-muted">{order.customer.email}</p>
            <p className="mt-3 text-sm text-muted">Created {dateTimeLabel(order.createdAt)}</p>
            <p className="mt-4 text-sm">Subtotal {money(order.subtotal, symbol)}</p>
            <p className="text-sm">Tax {money(order.tax, symbol)}</p>
            <p className="mt-2 font-display text-2xl">{money(order.total, symbol)}</p>
          </div>
          <div className="rounded-3xl bg-white p-5 card-shadow">
            <label className="text-sm font-medium text-wood">Order status</label>
            <select className={`${fieldClass} mt-2`} value={order.status} onChange={(e) => changeStatus(e.target.value)}>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <p className="mt-3">
              <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${statusClass(order.status)}`}>{order.status}</span>
            </p>
            {order.notes ? <p className="mt-3 text-sm text-muted">{order.notes}</p> : null}
          </div>
        </div>
      </div>

      <OrderForm open={editOpen} order={order} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); load(); }} />
      <ConfirmDialog open={confirm} title="Delete order?" message="Stock will be restored if this order is not cancelled." loading={busy} onClose={() => setConfirm(false)} onConfirm={remove} />
    </div>
  );
}

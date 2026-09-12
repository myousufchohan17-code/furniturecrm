import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Customer } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { CardSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { dateLabel, money, statusClass } from "../lib/format";

export function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useAuth();
  const { push } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const symbol = settings?.currencySymbol || "$";

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setCustomer(await api<Customer>(`/api/customers/${id}`));
      } catch (err) {
        push(err instanceof ApiError ? err.message : "Customer not found", "error");
        navigate("/customers");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate, push]);

  if (loading || !customer) return <CardSkeleton rows={7} />;

  return (
    <div className="space-y-4">
      <Link to="/customers" className="text-sm text-walnut">Back to customers</Link>
      <div className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-display text-3xl text-wood">{customer.name}</h2>
        <p className="mt-1 text-sm text-muted">{customer.email}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <p className="text-sm"><span className="text-muted">Phone:</span> {customer.phone || "—"}</p>
          <p className="text-sm"><span className="text-muted">City:</span> {customer.city || "—"}</p>
          <p className="text-sm sm:col-span-2"><span className="text-muted">Address:</span> {customer.address || "—"}</p>
          {customer.notes ? <p className="text-sm sm:col-span-2">{customer.notes}</p> : null}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 card-shadow">
        <h3 className="font-display text-xl text-wood">Order history</h3>
        {customer.orders?.length ? (
          <div className="table-wrap mt-4">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((order) => (
                  <tr key={order.id}>
                    <td><Link to={`/orders/${order.id}`}>{order.orderNumber}</Link></td>
                    <td><span className={`rounded-full px-2.5 py-1 text-xs capitalize ${statusClass(order.status)}`}>{order.status}</span></td>
                    <td>{money(order.total, symbol)}</td>
                    <td>{dateLabel(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState title="No orders yet" text="This customer has not placed an order." action={<Link className="btn-primary" to="/orders?new=1">Create order</Link>} />
          </div>
        )}
      </div>
    </div>
  );
}

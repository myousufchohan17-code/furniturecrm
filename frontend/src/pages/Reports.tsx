import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { EmptyState } from "../components/ui/EmptyState";
import { fieldClass } from "../components/ui/Field";
import { CardSkeleton } from "../components/ui/Skeleton";
import { dateLabel, money, statusClass } from "../lib/format";

type Report = {
  totals: { orders: number; cancelled: number; revenue: number; averageOrder: number };
  currencySymbol: string;
  bestProducts: { name: string; quantity: number; revenue: number }[];
  bestCategories: { name: string; quantity: number; revenue: number }[];
  orders: { id: string; orderNumber: string; customer: string; status: string; total: number; createdAt: string }[];
};

export function Reports() {
  const { settings } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const symbol = data?.currencySymbol || settings?.currencySymbol || "$";

  async function load() {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (from) query.set("from", from);
      if (to) query.set("to", to);
      setData(await api<Report>(`/api/reports/sales?${query.toString()}`));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <form
        className="grid gap-2 rounded-3xl bg-white p-4 card-shadow sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input className={fieldClass} type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <input className={fieldClass} type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        <button className="btn-primary">Apply dates</button>
      </form>

      {loading && !data ? (
        <CardSkeleton rows={6} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Mini label="Orders" value={String(data?.totals.orders ?? 0)} />
            <Mini label="Revenue" value={money(data?.totals.revenue || 0, symbol)} />
            <Mini label="Average order" value={money(data?.totals.averageOrder || 0, symbol)} />
            <Mini label="Cancelled" value={String(data?.totals.cancelled ?? 0)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <RankCard title="Best-selling products" rows={data?.bestProducts || []} symbol={symbol} empty="No product sales in this range." />
            <RankCard title="Best-selling categories" rows={data?.bestCategories || []} symbol={symbol} empty="No category sales in this range." />
          </div>

          <div className="rounded-3xl bg-white p-5 card-shadow">
            <h3 className="font-display text-xl text-wood">Orders in range</h3>
            {data?.orders.length ? (
              <div className="table-wrap mt-4">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.orderNumber}</td>
                        <td>{order.customer}</td>
                        <td><span className={`rounded-full px-2.5 py-1 text-xs capitalize ${statusClass(order.status)}`}>{order.status}</span></td>
                        <td>{money(order.total, symbol)}</td>
                        <td>{dateLabel(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4"><EmptyState title="No sales data available" text="There are no orders in the selected date range." /></div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 card-shadow">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl text-wood">{value}</p>
    </div>
  );
}

function RankCard({
  title,
  rows,
  symbol,
  empty,
}: {
  title: string;
  rows: { name: string; quantity: number; revenue: number }[];
  symbol: string;
  empty: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 card-shadow">
      <h3 className="font-display text-xl text-wood">{title}</h3>
      {rows.length ? (
        <div className="mt-4 space-y-2">
          {rows.map((row) => (
            <div key={row.name} className="flex items-center justify-between rounded-xl bg-cream px-3 py-3">
              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="text-xs text-muted">{row.quantity} sold</p>
              </div>
              <p className="text-sm">{money(row.revenue, symbol)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}

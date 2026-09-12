import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Armchair,
  Plus,
  RefreshCw,
  ShoppingBag,
  Users,
  Wallet,
  Package,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import type {
  Activity,
  CategoryShare,
  Customer,
  DashboardStats,
  Order,
  SalesPoint,
} from "../api/types";
import { useAuth } from "../context/AuthContext";
import { dateLabel, money, statusClass } from "../lib/format";
import { CardSkeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";

const pieColors = ["#3c2415", "#c9a227", "#8b5e3c", "#5c3a24", "#d4b96a", "#2a1810"];

export function Dashboard() {
  const { settings } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sales, setSales] = useState<SalesPoint[]>([]);
  const [categories, setCategories] = useState<CategoryShare[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [s, so, tc, act, ro, rc] = await Promise.all([
        api<DashboardStats>("/api/dashboard/stats"),
        api<{ items: SalesPoint[] }>("/api/dashboard/sales-overview?days=30"),
        api<{ items: CategoryShare[] }>("/api/dashboard/top-categories"),
        api<{ items: Activity[] }>("/api/dashboard/recent-activity"),
        api<{ items: Order[] }>("/api/dashboard/recent-orders"),
        api<{ items: Customer[] }>("/api/dashboard/recent-customers"),
      ]);
      setStats(s);
      setSales(so.items);
      setCategories(tc.items);
      setActivity(act.items);
      setOrders(ro.items);
      setCustomers(rc.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const symbol = stats?.currencySymbol || settings?.currencySymbol || "$";
  const hasSales = sales.some((p) => p.revenue > 0 || p.orders > 0);

  if (loading && !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} rows={2} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section
        className="relative overflow-hidden rounded-3xl bg-wood text-cream min-h-[200px] sm:min-h-[240px]"
        style={{ backgroundImage: "url(/hero-showroom.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-wood-deep/85 via-wood/70 to-wood/20" />
        <div className="relative flex flex-col justify-between gap-6 p-6 sm:p-8 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-gold-soft">Showroom overview</p>
            <h2 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
              Welcome back to {stats?.shopName || "your furniture house"}
            </h2>
            <p className="mt-3 max-w-lg text-sm text-cream/80">
              Track orders, clients, and inventory from one warm studio dashboard. Every number here is live from your database.
            </p>
          </div>
          <button className="btn-gold w-fit" onClick={load}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<ShoppingBag size={18} />} label="Total Orders" value={String(stats?.totalOrders ?? 0)} hint="Active, non-cancelled" />
        <Kpi icon={<Users size={18} />} label="Total Customers" value={String(stats?.totalCustomers ?? 0)} hint="Saved client records" />
        <Kpi icon={<Wallet size={18} />} label="Total Revenue" value={money(stats?.totalRevenue || 0, symbol)} hint="From completed sales" />
        <Kpi icon={<Armchair size={18} />} label="Total Products" value={String(stats?.totalProducts ?? 0)} hint="Showroom inventory" />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 card-shadow xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl text-wood">Sales Overview</h3>
              <p className="text-xs text-muted">Last 30 days from real orders</p>
            </div>
          </div>
          {hasSales ? (
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sales}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c9a227" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#c9a227" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#efe6d6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => money(Number(value), symbol)} />
                  <Area type="monotone" dataKey="revenue" stroke="#8b5e3c" fill="url(#rev)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No sales data available" text="Place an order to see your sales trend appear here." />
          )}
        </div>

        <div className="rounded-3xl bg-white p-5 card-shadow">
          <h3 className="font-display text-xl text-wood">Top Selling Categories</h3>
          <p className="mb-4 text-xs text-muted">Based on actual order items</p>
          {categories.length ? (
            <div>
              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80}>
                      {categories.map((entry, i) => (
                        <Cell key={entry.name} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => money(Number(value), symbol)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1">
                {categories.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                      {c.name}
                    </span>
                    <span className="text-muted">{money(c.value, symbol)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No category sales yet" text="Top-selling categories will appear after products are ordered." />
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 card-shadow xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl text-wood">Recent Orders</h3>
            <Link to="/orders" className="text-sm font-semibold text-walnut">View all</Link>
          </div>
          {orders.length ? (
            <div className="table-wrap">
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
                  {orders.map((order) => (
                    <tr key={order.id} className="cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                      <td className="font-semibold">{order.orderNumber}</td>
                      <td>{order.customer.name}</td>
                      <td>
                        <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${statusClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{money(order.total, symbol)}</td>
                      <td>{dateLabel(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No orders yet" text="Create your first order to start tracking sales." action={<Link className="btn-primary" to="/orders?new=1">Add order</Link>} />
          )}
        </div>

        <div className="rounded-3xl bg-white p-5 card-shadow">
          <h3 className="font-display text-xl text-wood">Recent Activity</h3>
          <div className="mt-4 space-y-3">
            {activity.length ? (
              activity.map((item) => (
                <div key={item.id} className="rounded-xl bg-cream px-3 py-3">
                  <p className="text-sm text-ink">{item.message}</p>
                  <p className="mt-1 text-xs text-muted">{dateLabel(item.createdAt)}</p>
                </div>
              ))
            ) : (
              <EmptyState title="No activity yet" text="Customer, order, and inventory actions will appear here." />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-5 card-shadow">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl text-wood">Recent Customers</h3>
            <Link to="/customers" className="text-sm font-semibold text-walnut">View all</Link>
          </div>
          {customers.length ? (
            <div className="space-y-3">
              {customers.map((c) => (
                <Link key={c.id} to={`/customers/${c.id}`} className="flex items-center justify-between rounded-xl bg-cream px-3 py-3">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted">{c.email}</p>
                  </div>
                  <span className="text-xs text-muted">{c._count?.orders || 0} orders</span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No customers yet" text="Add a client to begin building your showroom book." action={<Link className="btn-primary" to="/customers?new=1">Add customer</Link>} />
          )}
        </div>

        <div className="rounded-3xl bg-white p-5 card-shadow">
          <h3 className="font-display text-xl text-wood">Quick Actions</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link to="/orders?new=1" className="btn-primary"><Plus size={16} /> New Order</Link>
            <Link to="/customers?new=1" className="btn-gold"><Plus size={16} /> New Customer</Link>
            <Link to="/products?new=1" className="btn-secondary"><Plus size={16} /> New Product</Link>
            <Link to="/inventory" className="btn-secondary"><Package size={16} /> Update Stock</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 card-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-2 font-display text-3xl text-wood">{value}</p>
          <p className="mt-1 text-xs text-muted">{hint}</p>
        </div>
        <div className="rounded-2xl bg-gold/15 p-3 text-walnut">{icon}</div>
      </div>
    </div>
  );
}

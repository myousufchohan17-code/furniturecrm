import { useEffect, useRef, useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, qs } from "../../api/client";
import type { Activity, Customer, Order, Product } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { dateLabel } from "../../lib/format";

type SearchResult = {
  customers: Customer[];
  products: Product[];
  orders: Order[];
};

export function TopBar({
  title,
  onMenu,
}: {
  title: string;
  onMenu: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [results, setResults] = useState<SearchResult>({ customers: [], products: [], orders: [] });
  const boxRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults({ customers: [], products: [], orders: [] });
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const data = await api<SearchResult>(`/api/search${qs({ q })}`);
        setResults(data);
        setOpen(true);
      } catch {
        setResults({ customers: [], products: [], orders: [] });
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
      if (!notesRef.current?.contains(e.target as Node)) setNotesOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  async function toggleNotes() {
    const next = !notesOpen;
    setNotesOpen(next);
    if (next) {
      const data = await api<{ items: Activity[] }>("/api/dashboard/recent-activity");
      setActivity(data.items);
    }
  }

  const hasResults =
    results.customers.length + results.products.length + results.orders.length > 0;

  return (
    <header className="sticky top-0 z-30 border-b border-cream-deep/80 bg-cream/90 backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-xl bg-white p-2 text-wood shadow-sm lg:hidden"
            onClick={onMenu}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">FurniHouse CRM</p>
            <h1 className="font-display text-2xl text-wood">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative min-w-0 flex-1 lg:w-80 lg:flex-none" ref={boxRef}>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => q && setOpen(true)}
              placeholder="Search orders, customers, products"
              className="w-full rounded-full border border-cream-deep bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
            {open && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-2xl bg-white shadow-xl">
                {!hasResults ? (
                  <p className="px-4 py-3 text-sm text-muted">No matching records</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto py-2">
                    {results.orders.map((item) => (
                      <button
                        key={item.id}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-cream"
                        onClick={() => {
                          navigate(`/orders/${item.id}`);
                          setOpen(false);
                          setQ("");
                        }}
                      >
                        <span className="text-muted">Order</span> {item.orderNumber}
                      </button>
                    ))}
                    {results.customers.map((item) => (
                      <button
                        key={item.id}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-cream"
                        onClick={() => {
                          navigate(`/customers/${item.id}`);
                          setOpen(false);
                          setQ("");
                        }}
                      >
                        <span className="text-muted">Customer</span> {item.name}
                      </button>
                    ))}
                    {results.products.map((item) => (
                      <button
                        key={item.id}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-cream"
                        onClick={() => {
                          navigate("/products");
                          setOpen(false);
                          setQ("");
                        }}
                      >
                        <span className="text-muted">Product</span> {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={notesRef}>
            <button
              type="button"
              className="relative rounded-full bg-white p-2.5 text-wood shadow-sm"
              aria-label="Notifications"
              onClick={toggleNotes}
            >
              <Bell size={18} />
            </button>
            {notesOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(92vw,320px)] overflow-hidden rounded-2xl bg-white shadow-xl">
                <p className="border-b border-cream-deep px-4 py-3 text-sm font-semibold">Recent activity</p>
                {activity.length ? (
                  <div className="max-h-80 overflow-y-auto">
                    {activity.map((item) => (
                      <div key={item.id} className="border-b border-cream px-4 py-3 last:border-0">
                        <p className="text-sm">{item.message}</p>
                        <p className="mt-1 text-xs text-muted">{dateLabel(item.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-6 text-sm text-muted">No activity yet</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-wood text-xs font-semibold text-gold">
              {(user?.name || "A").slice(0, 1).toUpperCase()}
            </div>
            <p className="hidden text-xs font-semibold sm:block">{user?.name || "Admin"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

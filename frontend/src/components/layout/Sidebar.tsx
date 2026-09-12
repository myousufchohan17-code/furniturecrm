import { NavLink } from "react-router-dom";
import {
  Armchair,
  Boxes,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Tags,
  Users,
  ChartColumn,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/orders", label: "Orders", icon: ShoppingBag },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/products", label: "Products", icon: Armchair },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/reports", label: "Sales Reports", icon: ChartColumn },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { settings, user } = useAuth();

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-wood-deep/50 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-wood text-cream transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold text-wood-deep">
              <Boxes size={22} />
            </div>
            <div>
              <p className="font-display text-xl leading-none">{settings?.shopName || "FurniHouse"}</p>
              <p className="mt-1 text-xs text-gold-soft">Furniture CRM</p>
            </div>
          </div>
          <button className="rounded-lg p-2 text-cream lg:hidden" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition ${
                    isActive
                      ? "bg-gold text-wood-deep font-semibold"
                      : "text-cream/85 hover:bg-wood-mid"
                  }`
                }
              >
                <Icon size={18} />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="m-4 rounded-2xl bg-wood-deep p-4">
          <p className="text-sm font-semibold">{user?.name || "Admin"}</p>
          <p className="mt-1 truncate text-xs text-gold-soft">{user?.email || "Workspace"}</p>
        </div>
      </aside>
    </>
  );
}

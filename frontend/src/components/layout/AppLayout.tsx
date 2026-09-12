import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/orders": "Orders",
  "/customers": "Customers",
  "/products": "Products",
  "/categories": "Categories",
  "/inventory": "Inventory",
  "/reports": "Sales Reports",
  "/settings": "Settings",
};

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const title =
    titles[location.pathname] ||
    (location.pathname.startsWith("/orders/")
      ? "Order Details"
      : location.pathname.startsWith("/customers/")
        ? "Customer Details"
        : "FurniHouse");

  return (
    <div className="min-h-screen bg-cream lg:flex">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="min-w-0 flex-1">
        <TopBar title={title} onMenu={() => setOpen(true)} />
        <main className="px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

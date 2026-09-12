import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/error.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [orders, customers, products, revenue, settings] = await Promise.all([
      prisma.order.count({ where: { status: { not: "cancelled" } } }),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: "cancelled" } },
      }),
      prisma.setting.findUnique({ where: { id: "default" } }),
    ]);

    res.json({
      totalOrders: orders,
      totalCustomers: customers,
      totalProducts: products,
      totalRevenue: revenue._sum.total || 0,
      currencySymbol: settings?.currencySymbol || "$",
      shopName: settings?.shopName || "FurniHouse",
    });
  })
);

dashboardRouter.get(
  "/sales-overview",
  asyncHandler(async (req, res) => {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { not: "cancelled" } },
      select: { createdAt: true, total: true },
    });

    const map = new Map<string, { date: string; revenue: number; orders: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: key, revenue: 0, orders: 0 });
    }
    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      const row = map.get(key);
      if (row) {
        row.revenue += order.total;
        row.orders += 1;
      }
    }

    res.json({ items: [...map.values()] });
  })
);

dashboardRouter.get(
  "/top-categories",
  asyncHandler(async (_req, res) => {
    const items = await prisma.orderItem.findMany({
      where: { order: { status: { not: "cancelled" } } },
      include: { product: { include: { category: true } } },
    });

    const map = new Map<string, { name: string; value: number; quantity: number }>();
    for (const item of items) {
      const name = item.product.category.name;
      const current = map.get(name) || { name, value: 0, quantity: 0 };
      current.value += item.price * item.quantity;
      current.quantity += item.quantity;
      map.set(name, current);
    }

    const ranked = [...map.values()].sort((a, b) => b.value - a.value).slice(0, 6);
    res.json({ items: ranked });
  })
);

dashboardRouter.get(
  "/recent-activity",
  asyncHandler(async (_req, res) => {
    const items = await prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    res.json({ items });
  })
);

dashboardRouter.get(
  "/recent-orders",
  asyncHandler(async (_req, res) => {
    const items = await prisma.order.findMany({
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    res.json({ items });
  })
);

dashboardRouter.get(
  "/recent-customers",
  asyncHandler(async (_req, res) => {
    const items = await prisma.customer.findMany({
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    res.json({ items });
  })
);

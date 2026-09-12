import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/error.js";

export const reportsRouter = Router();

function range(from?: string, to?: string) {
  const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999Z`);
  }
  return where;
}

reportsRouter.get(
  "/sales",
  asyncHandler(async (req, res) => {
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");
    const createdAt = range(from || undefined, to || undefined).createdAt;
    const where = {
      ...(createdAt ? { createdAt } : {}),
      status: { not: "cancelled" as const },
    };

    const [orders, cancelled, settings] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          items: { include: { product: { include: { category: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({
        where: {
          ...(createdAt ? { createdAt } : {}),
          status: "cancelled",
        },
      }),
      prisma.setting.findUnique({ where: { id: "default" } }),
    ]);

    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    const categoryMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    for (const order of orders) {
      for (const item of order.items) {
        const product = productMap.get(item.productId) || {
          name: item.product.name,
          quantity: 0,
          revenue: 0,
        };
        product.quantity += item.quantity;
        product.revenue += item.price * item.quantity;
        productMap.set(item.productId, product);

        const catName = item.product.category.name;
        const category = categoryMap.get(catName) || { name: catName, quantity: 0, revenue: 0 };
        category.quantity += item.quantity;
        category.revenue += item.price * item.quantity;
        categoryMap.set(catName, category);
      }
    }

    res.json({
      totals: {
        orders: orders.length,
        cancelled,
        revenue,
        averageOrder: orders.length ? revenue / orders.length : 0,
      },
      currencySymbol: settings?.currencySymbol || "$",
      bestProducts: [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
      bestCategories: [...categoryMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customer: o.customer.name,
        status: o.status,
        total: o.total,
        createdAt: o.createdAt,
      })),
    });
  })
);

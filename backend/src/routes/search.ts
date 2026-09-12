import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/error.js";

export const searchRouter = Router();

searchRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (q.length < 1) {
      res.json({ customers: [], products: [], orders: [] });
      return;
    }

    const [customers, products, orders] = await Promise.all([
      prisma.customer.findMany({
        where: {
          OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }],
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.findMany({
        where: {
          OR: [{ name: { contains: q } }, { sku: { contains: q } }],
        },
        include: { category: true },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.findMany({
        where: {
          OR: [{ orderNumber: { contains: q } }, { customer: { name: { contains: q } } }],
        },
        include: { customer: true },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({ customers, products, orders });
  })
);

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "../lib/activity.js";
import { asyncHandler } from "../middleware/error.js";
import { routeParam } from "../lib/params.js";

export const inventoryRouter = Router();

inventoryRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const stock = String(req.query.stock || "").trim();
    const settings = await prisma.setting.findUnique({ where: { id: "default" } });
    const threshold = settings?.lowStockThreshold ?? 5;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { category: { name: { contains: search } } },
      ];
    }
    if (stock === "out") where.stock = 0;
    if (stock === "low") where.stock = { gt: 0, lte: threshold };

    const items = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { stock: "asc" },
    });

    res.json({
      items: items.map((p) => ({
        ...p,
        stockStatus: p.stock === 0 ? "out" : p.stock <= threshold ? "low" : "ok",
      })),
      threshold,
      totals: {
        all: items.length,
        low: items.filter((p) => p.stock > 0 && p.stock <= threshold).length,
        out: items.filter((p) => p.stock === 0).length,
      },
    });
  })
);

const adjustSchema = z.object({
  change: z.coerce.number().int().refine((n) => n !== 0, "Change cannot be zero"),
  reason: z.string().min(1, "Reason is required").max(160),
});

inventoryRouter.post(
  "/:productId/adjust",
  asyncHandler(async (req, res) => {
    const parsed = adjustSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: routeParam(req, "productId") } });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const nextStock = product.stock + parsed.data.change;
    if (nextStock < 0) {
      res.status(400).json({ error: "Stock cannot go below zero" });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.product.update({
        where: { id: product.id },
        data: { stock: nextStock },
        include: { category: true },
      });
      await tx.stockLog.create({
        data: {
          productId: product.id,
          change: parsed.data.change,
          reason: parsed.data.reason,
        },
      });
      return item;
    });

    await logActivity(
      "inventory",
      `Stock ${parsed.data.change > 0 ? "added" : "reduced"} for ${product.name} (${parsed.data.change > 0 ? "+" : ""}${parsed.data.change})`,
      "product",
      product.id
    );
    res.json(updated);
  })
);

inventoryRouter.get(
  "/logs",
  asyncHandler(async (req, res) => {
    const productId = String(req.query.productId || "").trim();
    const logs = await prisma.stockLog.findMany({
      where: productId ? { productId } : {},
      include: { product: { select: { id: true, name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    });
    res.json({ items: logs });
  })
);

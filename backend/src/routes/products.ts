import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "../lib/activity.js";
import { asyncHandler } from "../middleware/error.js";

export const productsRouter = Router();

const schema = z.object({
  name: z.string().min(1, "Name is required").max(160),
  description: z.string().max(2000).optional().default(""),
  sku: z.string().min(1, "SKU is required").max(60),
  price: z.coerce.number().positive("Price must be greater than 0"),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative").optional().default(0),
  categoryId: z.string().min(1, "Category is required"),
  image: z.string().optional().nullable(),
});

productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const categoryId = String(req.query.categoryId || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  })
);

productsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, stockLogs: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
  })
);

productsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      return;
    }
    const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
    if (!category) {
      res.status(400).json({ error: "Selected category does not exist" });
      return;
    }
    const product = await prisma.product.create({
      data: parsed.data,
      include: { category: true },
    });
    if (product.stock > 0) {
      await prisma.stockLog.create({
        data: { productId: product.id, change: product.stock, reason: "Initial stock" },
      });
    }
    await logActivity("product", `Product added: ${product.name}`, "product", product.id);
    res.status(201).json(product);
  })
);

productsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = schema.omit({ stock: true }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      return;
    }
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: parsed.data,
      include: { category: true },
    });
    await logActivity("product", `Product updated: ${product.name}`, "product", product.id);
    res.json(product);
  })
);

productsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (existing._count.orderItems > 0) {
      res.status(409).json({
        error: "This product is used in orders and cannot be deleted.",
      });
      return;
    }
    await prisma.product.delete({ where: { id: existing.id } });
    await logActivity("product", `Product deleted: ${existing.name}`, "product", existing.id);
    res.json({ ok: true });
  })
);

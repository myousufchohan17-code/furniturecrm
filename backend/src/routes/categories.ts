import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "../lib/activity.js";
import { asyncHandler } from "../middleware/error.js";
import { routeParam } from "../lib/params.js";

export const categoriesRouter = Router();

const schema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  description: z.string().max(300).optional().default(""),
});

categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const where = search
      ? { OR: [{ name: { contains: search } }, { description: { contains: search } }] }
      : {};
    const items = await prisma.category.findMany({
      where,
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ items, total: items.length });
  })
);

categoriesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      return;
    }
    const category = await prisma.category.create({ data: parsed.data });
    await logActivity("category", `Category created: ${category.name}`, "category", category.id);
    res.status(201).json(category);
  })
);

categoriesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      return;
    }
    const category = await prisma.category.update({
      where: { id: routeParam(req, "id") },
      data: parsed.data,
    });
    await logActivity("category", `Category updated: ${category.name}`, "category", category.id);
    res.json(category);
  })
);

categoriesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.category.findUnique({
      where: { id: routeParam(req, "id") },
      include: { _count: { select: { products: true } } },
    });
    if (!existing) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    if (existing._count.products > 0) {
      res.status(409).json({
        error: "This category is still used by products and cannot be deleted.",
      });
      return;
    }
    await prisma.category.delete({ where: { id: existing.id } });
    await logActivity("category", `Category deleted: ${existing.name}`, "category", existing.id);
    res.json({ ok: true });
  })
);

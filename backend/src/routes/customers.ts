import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "../lib/activity.js";
import { asyncHandler } from "../middleware/error.js";
import { routeParam } from "../lib/params.js";

export const customersRouter = Router();

const schema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email is required"),
  phone: z.string().max(40).optional().default(""),
  address: z.string().max(240).optional().default(""),
  city: z.string().max(80).optional().default(""),
  notes: z.string().max(500).optional().default(""),
});

customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { city: { contains: search } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { _count: { select: { orders: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  })
);

customersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: routeParam(req, "id") },
      include: {
        orders: {
          include: { items: { include: { product: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json(customer);
  })
);

customersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      return;
    }
    const customer = await prisma.customer.create({ data: parsed.data });
    await logActivity("customer", `New customer added: ${customer.name}`, "customer", customer.id);
    res.status(201).json(customer);
  })
);

customersRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      return;
    }
    const customer = await prisma.customer.update({
      where: { id: routeParam(req, "id") },
      data: parsed.data,
    });
    await logActivity("customer", `Customer updated: ${customer.name}`, "customer", customer.id);
    res.json(customer);
  })
);

customersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.customer.findUnique({
      where: { id: routeParam(req, "id") },
      include: { _count: { select: { orders: true } } },
    });
    if (!existing) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    if (existing._count.orders > 0) {
      res.status(409).json({
        error: "This customer has orders and cannot be deleted. Remove their orders first.",
      });
      return;
    }
    await prisma.customer.delete({ where: { id: existing.id } });
    await logActivity("customer", `Customer deleted: ${existing.name}`, "customer", existing.id);
    res.json({ ok: true });
  })
);

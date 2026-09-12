import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "../lib/activity.js";
import { asyncHandler } from "../middleware/error.js";

export const ordersRouter = Router();

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
});

const schema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  notes: z.string().max(500).optional().default(""),
  tax: z.coerce.number().min(0).optional().default(0),
  items: z.array(itemSchema).min(1, "Add at least one product"),
});

async function nextOrderNumber() {
  return `FH-${Date.now().toString().slice(-8)}`;
}

ordersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const where: Record<string, unknown> = {};
    if (status && STATUSES.includes(status as (typeof STATUSES)[number])) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { email: { contains: search } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          items: { include: { product: { include: { category: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  })
);

ordersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        items: { include: { product: { include: { category: true } } } },
      },
    });
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(order);
  })
);

ordersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id: parsed.data.customerId } });
    if (!customer) {
      res.status(400).json({ error: "Customer not found" });
      return;
    }

    const products = await prisma.product.findMany({
      where: { id: { in: parsed.data.items.map((i) => i.productId) } },
    });
    if (products.length !== parsed.data.items.length) {
      res.status(400).json({ error: "One or more products were not found" });
      return;
    }

    for (const item of parsed.data.items) {
      const product = products.find((p) => p.id === item.productId)!;
      if (product.stock < item.quantity) {
        res.status(400).json({
          error: `Not enough stock for ${product.name}. Available: ${product.stock}`,
        });
        return;
      }
    }

    const lineItems = parsed.data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return { product, quantity: item.quantity, price: product.price };
    });
    const subtotal = lineItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const tax = parsed.data.tax;
    const total = subtotal + tax;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: await nextOrderNumber(),
          customerId: customer.id,
          notes: parsed.data.notes,
          tax,
          subtotal,
          total,
          items: {
            create: lineItems.map((i) => ({
              productId: i.product.id,
              quantity: i.quantity,
              price: i.price,
            })),
          },
        },
        include: {
          customer: true,
          items: { include: { product: { include: { category: true } } } },
        },
      });

      for (const item of lineItems) {
        await tx.product.update({
          where: { id: item.product.id },
          data: { stock: { decrement: item.quantity } },
        });
        await tx.stockLog.create({
          data: {
            productId: item.product.id,
            change: -item.quantity,
            reason: `Order ${created.orderNumber}`,
          },
        });
      }

      return created;
    });

    await logActivity("order", `Order ${order.orderNumber} created for ${customer.name}`, "order", order.id);
    res.status(201).json(order);
  })
);

ordersRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = schema.extend({
      status: z.enum(STATUSES).optional(),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      return;
    }

    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (existing.status === "cancelled") {
      res.status(400).json({ error: "Cancelled orders cannot be edited" });
      return;
    }

    const products = await prisma.product.findMany({
      where: { id: { in: parsed.data.items.map((i) => i.productId) } },
    });
    if (products.length !== parsed.data.items.length) {
      res.status(400).json({ error: "One or more products were not found" });
      return;
    }

    const previousQty = new Map(existing.items.map((i) => [i.productId, i.quantity]));

    for (const item of parsed.data.items) {
      const product = products.find((p) => p.id === item.productId)!;
      const alreadyReserved = existing.status === "cancelled" ? 0 : previousQty.get(product.id) || 0;
      const available = product.stock + alreadyReserved;
      if (available < item.quantity) {
        res.status(400).json({
          error: `Not enough stock for ${product.name}. Available: ${available}`,
        });
        return;
      }
    }

    const lineItems = parsed.data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return { product, quantity: item.quantity, price: product.price };
    });
    const subtotal = lineItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const tax = parsed.data.tax;
    const total = subtotal + tax;

    const order = await prisma.$transaction(async (tx) => {
      if (existing.status !== "cancelled") {
        for (const old of existing.items) {
          await tx.product.update({
            where: { id: old.productId },
            data: { stock: { increment: old.quantity } },
          });
          await tx.stockLog.create({
            data: {
              productId: old.productId,
              change: old.quantity,
              reason: `Order ${existing.orderNumber} restocked for edit`,
            },
          });
        }
      }

      await tx.orderItem.deleteMany({ where: { orderId: existing.id } });

      const updated = await tx.order.update({
        where: { id: existing.id },
        data: {
          customerId: parsed.data.customerId,
          notes: parsed.data.notes,
          tax,
          subtotal,
          total,
          status: parsed.data.status || existing.status,
          items: {
            create: lineItems.map((i) => ({
              productId: i.product.id,
              quantity: i.quantity,
              price: i.price,
            })),
          },
        },
        include: {
          customer: true,
          items: { include: { product: { include: { category: true } } } },
        },
      });

      if (updated.status !== "cancelled") {
        for (const item of lineItems) {
          await tx.product.update({
            where: { id: item.product.id },
            data: { stock: { decrement: item.quantity } },
          });
          await tx.stockLog.create({
            data: {
              productId: item.product.id,
              change: -item.quantity,
              reason: `Order ${updated.orderNumber} updated`,
            },
          });
        }
      }

      return updated;
    });

    await logActivity("order", `Order ${order.orderNumber} updated`, "order", order.id);
    res.json(order);
  })
);

ordersRouter.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const status = String(req.body.status || "");
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
      res.status(400).json({ error: "Invalid order status" });
      return;
    }

    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = await prisma.$transaction(async (tx) => {
      if (status === "cancelled" && existing.status !== "cancelled") {
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.stockLog.create({
            data: {
              productId: item.productId,
              change: item.quantity,
              reason: `Order ${existing.orderNumber} cancelled`,
            },
          });
        }
      }
      if (existing.status === "cancelled" && status !== "cancelled") {
        for (const item of existing.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product || product.stock < item.quantity) {
            throw new Error(`Not enough stock to reopen ${existing.orderNumber}`);
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
          await tx.stockLog.create({
            data: {
              productId: item.productId,
              change: -item.quantity,
              reason: `Order ${existing.orderNumber} reopened`,
            },
          });
        }
      }
      return tx.order.update({
        where: { id: existing.id },
        data: { status },
        include: {
          customer: true,
          items: { include: { product: { include: { category: true } } } },
        },
      });
    });

    await logActivity("order", `Order ${order.orderNumber} marked ${status}`, "order", order.id);
    res.json(order);
  })
);

ordersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      if (existing.status !== "cancelled") {
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.stockLog.create({
            data: {
              productId: item.productId,
              change: item.quantity,
              reason: `Order ${existing.orderNumber} deleted`,
            },
          });
        }
      }
      await tx.order.delete({ where: { id: existing.id } });
    });

    await logActivity("order", `Order ${existing.orderNumber} deleted`, "order", existing.id);
    res.json({ ok: true });
  })
);

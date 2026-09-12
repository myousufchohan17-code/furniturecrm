import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "../lib/activity.js";
import { asyncHandler } from "../middleware/error.js";

export const settingsRouter = Router();

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.setting.findUnique({ where: { id: "default" } });
    res.json(settings);
  })
);

const schema = z.object({
  shopName: z.string().min(1).max(80),
  shopEmail: z.string().email().or(z.literal("")).optional().default(""),
  shopPhone: z.string().max(40).optional().default(""),
  shopAddress: z.string().max(240).optional().default(""),
  currency: z.string().min(1).max(8),
  currencySymbol: z.string().min(1).max(4),
  lowStockThreshold: z.coerce.number().int().min(0).max(9999),
});

settingsRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      return;
    }
    const settings = await prisma.setting.upsert({
      where: { id: "default" },
      update: parsed.data,
      create: { id: "default", ...parsed.data },
    });
    await logActivity("settings", "Shop settings were updated", "settings", "default");
    res.json(settings);
  })
);

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/error.js";

export const authRouter = Router();

async function workspaceUser() {
  return prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, avatar: true },
  });
}

authRouter.get(
  "/me",
  asyncHandler(async (_req, res) => {
    const user = await workspaceUser();
    if (!user) {
      res.status(404).json({ error: "Workspace profile not found" });
      return;
    }
    res.json(user);
  })
);

const profileSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
});

authRouter.put(
  "/profile",
  asyncHandler(async (req, res) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      return;
    }

    const existing = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!existing) {
      res.status(404).json({ error: "Workspace profile not found" });
      return;
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: parsed.data,
      select: { id: true, name: true, email: true, role: true, avatar: true },
    });
    res.json(user);
  })
);

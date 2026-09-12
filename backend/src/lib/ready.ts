import bcrypt from "bcryptjs";
import { prisma } from "./prisma.js";

let ready: Promise<void> | null = null;

export function ensureReady() {
  if (!ready) {
    ready = bootstrapWorkspace();
  }
  return ready;
}

async function bootstrapWorkspace() {
  const users = await prisma.user.count();
  if (users === 0) {
    const password = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@123", 10);
    await prisma.user.create({
      data: {
        name: process.env.ADMIN_NAME || "Admin",
        email: process.env.ADMIN_EMAIL || "admin@furnicrm.local",
        password,
        role: "admin",
      },
    });
  }

  await prisma.setting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      shopName: "FurniHouse",
      shopEmail: "",
      shopPhone: "",
      shopAddress: "",
      currency: "USD",
      currencySymbol: "$",
      lowStockThreshold: 5,
    },
  });
}

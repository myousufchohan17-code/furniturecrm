import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { errorHandler } from "./middleware/error.js";
import { ensureReady } from "./lib/ready.js";
import { authRouter } from "./routes/auth.js";
import { customersRouter } from "./routes/customers.js";
import { categoriesRouter } from "./routes/categories.js";
import { productsRouter } from "./routes/products.js";
import { ordersRouter } from "./routes/orders.js";
import { inventoryRouter } from "./routes/inventory.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { reportsRouter } from "./routes/reports.js";
import { settingsRouter } from "./routes/settings.js";
import { searchRouter } from "./routes/search.js";

export const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "6mb" }));

app.use(async (_req, _res, next) => {
  try {
    await ensureReady();
    next();
  } catch (err) {
    next(err);
  }
});

const api = express.Router();

api.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});
api.use("/auth", authRouter);
api.use("/customers", customersRouter);
api.use("/categories", categoriesRouter);
api.use("/products", productsRouter);
api.use("/orders", ordersRouter);
api.use("/inventory", inventoryRouter);
api.use("/dashboard", dashboardRouter);
api.use("/reports", reportsRouter);
api.use("/settings", settingsRouter);
api.use("/search", searchRouter);
api.post("/uploads", upload.single("image"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "Image file is required" });
    return;
  }
  const url = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  res.status(201).json({ url });
});

app.use(api);
app.use("/api", api);
app.use(errorHandler);

export default app;

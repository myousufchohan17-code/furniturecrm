import express from "express";
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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/customers", customersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/search", searchRouter);

app.post("/api/uploads", upload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Image file is required" });
    return;
  }
  const url = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  res.status(201).json({ url });
});

app.use(errorHandler);

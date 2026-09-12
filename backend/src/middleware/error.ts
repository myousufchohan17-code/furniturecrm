import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "P2002") {
      res.status(409).json({ error: "A record with this unique value already exists" });
      return;
    }
    if (code === "P2025") {
      res.status(404).json({ error: "Record not found" });
      return;
    }
  }
  const message = err instanceof Error ? err.message : "Unexpected server error";
  res.status(500).json({ error: message });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

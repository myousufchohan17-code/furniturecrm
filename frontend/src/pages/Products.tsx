import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { api, getToken, qs, ApiError } from "../api/client";
import type { Category, Paginated, Product } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Field, fieldClass } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { CardSkeleton } from "../components/ui/Skeleton";
import { money } from "../lib/format";
import { Pagination } from "./Orders";

const empty = { name: "", description: "", sku: "", price: "", stock: "0", categoryId: "", image: "" };

export function Products() {
  const { settings } = useAuth();
  const { push } = useToast();
  const [params] = useSearchParams();
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(params.get("new") === "1");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const symbol = settings?.currencySymbol || "$";

  async function load() {
    setLoading(true);
    try {
      const [products, cats] = await Promise.all([
        api<Paginated<Product>>(`/api/products${qs({ search, categoryId, page, limit: 12 })}`),
        api<{ items: Category[] }>("/api/categories"),
      ]);
      setData(products);
      setCategories(cats.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [search, categoryId, page]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description,
      sku: product.sku,
      price: String(product.price),
      stock: String(product.stock),
      categoryId: product.categoryId,
      image: product.image || "",
    });
    setFormOpen(true);
  }

  async function upload(file: File) {
    const body = new FormData();
    body.append("image", file);
    const res = await fetch("/api/uploads", {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body,
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data.error || "Upload failed", res.status);
    setForm((current) => ({ ...current, image: data.url }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        sku: form.sku,
        price: Number(form.price),
        stock: Number(form.stock),
        categoryId: form.categoryId,
        image: form.image || null,
      };
      if (editing) await api(`/api/products/${editing.id}`, { method: "PUT", json: payload });
      else await api("/api/products", { method: "POST", json: payload });
      push(editing ? "Product updated" : "Product added");
      setFormOpen(false);
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Could not save product", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/products/${deleting.id}`, { method: "DELETE" });
      push("Product deleted");
      setDeleting(null);
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Could not delete product", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:max-w-xl">
          <input className={fieldClass} placeholder="Search products" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          <select className={fieldClass} value={categoryId} onChange={(e) => { setPage(1); setCategoryId(e.target.value); }}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add product</button>
      </div>

      {loading && !data ? <CardSkeleton rows={6} /> : !data?.items.length ? (
        <EmptyState
          title="No products yet"
          text={categories.length ? "Add furniture pieces to start selling." : "Create a category first, then add products."}
          action={categories.length ? <button className="btn-primary" onClick={openCreate}>Add product</button> : undefined}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-3xl bg-white card-shadow">
                <div className="h-40 bg-cream-deep">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted">No image</div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-gold">{product.category?.name}</p>
                  <h3 className="mt-1 font-display text-xl text-wood">{product.name}</h3>
                  <p className="mt-1 text-sm text-muted">SKU {product.sku}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-semibold">{money(product.price, symbol)}</p>
                    <p className={`text-sm ${product.stock === 0 ? "text-red-700" : product.stock <= (settings?.lowStockThreshold || 5) ? "text-amber-700" : "text-muted"}`}>
                      {product.stock} in stock
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="btn-secondary flex-1" onClick={() => openEdit(product)}>Edit</button>
                    <button className="btn-danger" onClick={() => setDeleting(product)} aria-label="Delete"><Trash2 size={16} /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
        </>
      )}

      <Modal open={formOpen} title={editing ? "Edit product" : "Add product"} onClose={() => setFormOpen(false)} wide>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><input className={fieldClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="SKU"><input className={fieldClass} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required /></Field>
          <Field label="Category">
            <select className={fieldClass} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Price"><input className={fieldClass} type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></Field>
          {!editing ? (
            <Field label="Initial stock"><input className={fieldClass} type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></Field>
          ) : (
            <p className="self-end text-sm text-muted">Stock is managed from Inventory.</p>
          )}
          <Field label="Image">
            <input className={fieldClass} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0]).catch((err) => push(err.message, "error"))} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description"><textarea className={fieldClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          </div>
          {form.image ? <img src={form.image} alt="" className="h-24 rounded-xl object-cover sm:col-span-2" /> : null}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy ? "Saving..." : "Save product"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleting} title="Delete product?" message="Products used in orders cannot be deleted." loading={busy} onClose={() => setDeleting(null)} onConfirm={remove} />
    </div>
  );
}

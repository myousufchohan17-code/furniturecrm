import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { Category } from "../api/types";
import { useToast } from "../context/ToastContext";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Field, fieldClass } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { CardSkeleton } from "../components/ui/Skeleton";

export function Categories() {
  const { push } = useToast();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ items: Category[] }>(`/api/categories?search=${encodeURIComponent(search)}`);
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [search]);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setName(category.name);
    setDescription(category.description);
    setFormOpen(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) await api(`/api/categories/${editing.id}`, { method: "PUT", json: { name, description } });
      else await api("/api/categories", { method: "POST", json: { name, description } });
      push(editing ? "Category updated" : "Category added");
      setFormOpen(false);
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Could not save category", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/categories/${deleting.id}`, { method: "DELETE" });
      push("Category deleted");
      setDeleting(null);
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Could not delete category", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input className={`${fieldClass} sm:max-w-sm`} placeholder="Search categories" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add category</button>
      </div>

      {loading ? <CardSkeleton rows={5} /> : !items.length ? (
        <EmptyState title="No categories yet" text="Create categories such as sofas, tables, or lighting before adding products." action={<button className="btn-primary" onClick={openCreate}>Add category</button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((category) => (
            <article key={category.id} className="rounded-3xl bg-white p-5 card-shadow">
              <h3 className="font-display text-2xl text-wood">{category.name}</h3>
              <p className="mt-2 min-h-10 text-sm text-muted">{category.description || "No description"}</p>
              <p className="mt-3 text-sm text-walnut">{category._count?.products || 0} products</p>
              <div className="mt-4 flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => openEdit(category)}>Edit</button>
                <button className="btn-danger" onClick={() => setDeleting(category)} aria-label="Delete"><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={formOpen} title={editing ? "Edit category" : "Add category"} onClose={() => setFormOpen(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Name"><input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
          <Field label="Description"><textarea className={fieldClass} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy ? "Saving..." : "Save category"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleting} title="Delete category?" message="Categories still assigned to products cannot be deleted." loading={busy} onClose={() => setDeleting(null)} onConfirm={remove} />
    </div>
  );
}

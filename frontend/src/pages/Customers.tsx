import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { api, qs, ApiError } from "../api/client";
import type { Customer, Paginated } from "../api/types";
import { useToast } from "../context/ToastContext";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { Field, fieldClass } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { CardSkeleton } from "../components/ui/Skeleton";
import { dateLabel } from "../lib/format";
import { Pagination } from "./Orders";

const empty = { name: "", email: "", phone: "", address: "", city: "", notes: "" };

export function Customers() {
  const { push } = useToast();
  const [params] = useSearchParams();
  const [data, setData] = useState<Paginated<Customer> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(params.get("new") === "1");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setData(await api<Paginated<Customer>>(`/api/customers${qs({ search, page, limit: 10 })}`));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [search, page]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setFormOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      notes: customer.notes,
    });
    setFormOpen(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) await api(`/api/customers/${editing.id}`, { method: "PUT", json: form });
      else await api("/api/customers", { method: "POST", json: form });
      push(editing ? "Customer updated" : "Customer added");
      setFormOpen(false);
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Could not save customer", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/customers/${deleting.id}`, { method: "DELETE" });
      push("Customer deleted");
      setDeleting(null);
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Could not delete customer", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input className={`${fieldClass} sm:max-w-sm`} placeholder="Search customers" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Add customer</button>
      </div>

      {loading && !data ? <CardSkeleton rows={6} /> : !data?.items.length ? (
        <EmptyState title="No customers yet" text="Add a client before creating orders." action={<button className="btn-primary" onClick={openCreate}>Add customer</button>} />
      ) : (
        <div className="rounded-3xl bg-white p-4 card-shadow sm:p-5">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Orders</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((customer) => (
                  <tr key={customer.id}>
                    <td className="font-semibold"><Link to={`/customers/${customer.id}`}>{customer.name}</Link></td>
                    <td>{customer.email}</td>
                    <td>{customer.phone || "—"}</td>
                    <td>{customer.city || "—"}</td>
                    <td>{customer._count?.orders || 0}</td>
                    <td>{dateLabel(customer.createdAt)}</td>
                    <td className="text-right">
                      <button className="mr-2 text-sm font-semibold text-wood" onClick={() => openEdit(customer)}>Edit</button>
                      <button className="text-red-700" onClick={() => setDeleting(customer)} aria-label="Delete"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onPage={setPage} />
        </div>
      )}

      <Modal open={formOpen} title={editing ? "Edit customer" : "Add customer"} onClose={() => setFormOpen(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Name"><input className={fieldClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Email"><input className={fieldClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          <Field label="Phone"><input className={fieldClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="City"><input className={fieldClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="Address"><input className={fieldClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Notes"><textarea className={fieldClass} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy ? "Saving..." : "Save customer"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleting} title="Delete customer?" message="Customers with existing orders cannot be deleted." loading={busy} onClose={() => setDeleting(null)} onConfirm={remove} />
    </div>
  );
}

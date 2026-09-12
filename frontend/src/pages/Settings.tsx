import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { Settings as SettingsType } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Field, fieldClass } from "../components/ui/Field";
import { CardSkeleton } from "../components/ui/Skeleton";

export function Settings() {
  const { user, refreshSettings, refreshUser } = useAuth();
  const { push } = useToast();
  const [shop, setShop] = useState<SettingsType | null>(null);
  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "" });
  const [busy, setBusy] = useState<"shop" | "profile" | null>(null);

  useEffect(() => {
    api<SettingsType>("/api/settings").then(setShop);
  }, []);

  useEffect(() => {
    if (user) setProfile({ name: user.name, email: user.email });
  }, [user]);

  async function saveShop(e: FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setBusy("shop");
    try {
      const updated = await api<SettingsType>("/api/settings", { method: "PUT", json: shop });
      setShop(updated);
      await refreshSettings();
      push("Shop settings saved");
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Could not save settings", "error");
    } finally {
      setBusy(null);
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setBusy("profile");
    try {
      await api("/api/auth/profile", { method: "PUT", json: profile });
      await refreshUser();
      push("Profile updated");
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Could not update profile", "error");
    } finally {
      setBusy(null);
    }
  }

  if (!shop) return <CardSkeleton rows={6} />;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <form onSubmit={saveShop} className="space-y-3 rounded-3xl bg-white p-5 card-shadow">
        <h3 className="font-display text-2xl text-wood">Shop details</h3>
        <Field label="Shop name"><input className={fieldClass} value={shop.shopName} onChange={(e) => setShop({ ...shop, shopName: e.target.value })} required /></Field>
        <Field label="Email"><input className={fieldClass} type="email" value={shop.shopEmail} onChange={(e) => setShop({ ...shop, shopEmail: e.target.value })} /></Field>
        <Field label="Phone"><input className={fieldClass} value={shop.shopPhone} onChange={(e) => setShop({ ...shop, shopPhone: e.target.value })} /></Field>
        <Field label="Address"><input className={fieldClass} value={shop.shopAddress} onChange={(e) => setShop({ ...shop, shopAddress: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Currency"><input className={fieldClass} value={shop.currency} onChange={(e) => setShop({ ...shop, currency: e.target.value })} required /></Field>
          <Field label="Currency symbol"><input className={fieldClass} value={shop.currencySymbol} onChange={(e) => setShop({ ...shop, currencySymbol: e.target.value })} required /></Field>
        </div>
        <Field label="Low-stock threshold">
          <input className={fieldClass} type="number" min={0} value={shop.lowStockThreshold} onChange={(e) => setShop({ ...shop, lowStockThreshold: Number(e.target.value) })} required />
        </Field>
        <button className="btn-primary" disabled={busy === "shop"}>{busy === "shop" ? "Saving..." : "Save shop settings"}</button>
      </form>

      <form onSubmit={saveProfile} className="space-y-3 rounded-3xl bg-white p-5 card-shadow">
        <h3 className="font-display text-2xl text-wood">Workspace profile</h3>
        <Field label="Name"><input className={fieldClass} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required /></Field>
        <Field label="Email"><input className={fieldClass} type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required /></Field>
        <button className="btn-primary" disabled={busy === "profile"}>{busy === "profile" ? "Saving..." : "Save profile"}</button>
      </form>
    </div>
  );
}

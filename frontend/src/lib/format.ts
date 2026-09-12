export function money(value: number, symbol = "$") {
  return `${symbol}${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function dateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function dateTimeLabel(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function statusClass(status: string) {
  switch (status) {
    case "delivered":
      return "bg-emerald-50 text-emerald-800";
    case "shipped":
      return "bg-sky-50 text-sky-800";
    case "processing":
      return "bg-amber-50 text-amber-800";
    case "cancelled":
      return "bg-red-50 text-red-800";
    default:
      return "bg-cream-deep text-wood";
  }
}

export function imageSrc(path?: string | null) {
  if (!path) return "";
  return path;
}

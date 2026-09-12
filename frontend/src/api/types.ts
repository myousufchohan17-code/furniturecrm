export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
};

export type Settings = {
  id: string;
  shopName: string;
  shopEmail: string;
  shopPhone: string;
  shopAddress: string;
  currency: string;
  currencySymbol: string;
  lowStockThreshold: number;
};

export type Category = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  _count?: { products: number };
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
  createdAt: string;
  _count?: { orders: number };
  orders?: Order[];
};

export type Product = {
  id: string;
  name: string;
  description: string;
  sku: string;
  price: number;
  stock: number;
  image?: string | null;
  categoryId: string;
  category?: Category;
  stockStatus?: "ok" | "low" | "out";
  createdAt: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: Product;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: Customer;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  items: OrderItem[];
  createdAt: string;
};

export type Activity = {
  id: string;
  type: string;
  message: string;
  entity?: string | null;
  entityId?: string | null;
  createdAt: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type DashboardStats = {
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalRevenue: number;
  currencySymbol: string;
  shopName: string;
};

export type SalesPoint = { date: string; revenue: number; orders: number };
export type CategoryShare = { name: string; value: number; quantity: number };
export type StockLog = {
  id: string;
  change: number;
  reason: string;
  createdAt: string;
  product: { id: string; name: string; sku: string };
};

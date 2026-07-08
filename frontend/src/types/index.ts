export type Role = 'OWNER' | 'CASHIER';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  suspended?: boolean;
  businessProfileId?: string | null;
}

export interface BusinessProfile {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  currency: string;
  taxRate: string;
  logoUrl?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  price: string;
  costPrice: string;
  stock: number;
  lowStockThreshold: number;
  categoryId: string;
  category?: { id: string; name: string };
  imageUrl?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  cashierId: string;
  cashier?: { id: string; name: string; email: string };
  subtotal: string;
  taxAmount: string;
  total: string;
  paymentMethod: 'CASH' | 'CARD';
  status: 'COMPLETED' | 'REFUNDED';
  refundedAt?: string | null;
  refundReason?: string | null;
  createdAt: string;
  items: SaleItem[];
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  productPrice: string;
  quantity: number;
  lineTotal: string;
  product?: { id: string; name: string; imageUrl?: string | null };
}

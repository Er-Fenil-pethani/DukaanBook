import { create } from 'zustand';

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  price: number; // selling price snapshot, in major units
  stock: number; // current known stock at the time of adding
  imageUrl?: string | null;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addOrIncrement: (p: Omit<CartItem, 'quantity'>) => 'added' | 'incremented' | 'capped';
  setQty: (productId: string, quantity: number) => void;
  inc: (productId: string) => void;
  dec: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>((set, get) => ({
  items: [],
  addOrIncrement: (p) => {
    const existing = get().items.find((i) => i.productId === p.productId);
    if (existing) {
      if (existing.quantity + 1 > p.stock) return 'capped';
      set({
        items: get().items.map((i) =>
          i.productId === p.productId ? { ...i, quantity: i.quantity + 1, stock: p.stock } : i
        ),
      });
      return 'incremented';
    }
    if (p.stock <= 0) return 'capped';
    set({ items: [...get().items, { ...p, quantity: 1 }] });
    return 'added';
  },
  setQty: (productId, quantity) => {
    set({
      items: get()
        .items.map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.max(0, Math.min(i.stock, Math.floor(quantity || 0))) }
            : i
        )
        .filter((i) => i.quantity > 0),
    });
  },
  inc: (productId) => {
    set({
      items: get().items.map((i) =>
        i.productId === productId && i.quantity < i.stock
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ),
    });
  },
  dec: (productId) => {
    set({
      items: get()
        .items.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0),
    });
  },
  remove: (productId) => set({ items: get().items.filter((i) => i.productId !== productId) }),
  clear: () => set({ items: [] }),
}));

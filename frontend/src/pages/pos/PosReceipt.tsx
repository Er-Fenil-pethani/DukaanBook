import { forwardRef } from 'react';
import { formatCurrency, formatDate } from '@/lib/format';
import { useBusiness } from '@/stores/businessStore';
import type { Sale } from '@/types';

interface PosReceiptProps {
  sale: Sale;
  currency: string;
}

export const PosReceipt = forwardRef<HTMLDivElement, PosReceiptProps>(({ sale, currency }, ref) => {
  const business = useBusiness((s) => s.business);
  return (
    <div ref={ref} className="receipt bg-white text-black p-4 text-[12px] font-mono">
      <div className="text-center space-y-1 pb-3 border-b border-dashed">
        <h2 className="text-base font-bold uppercase">{business?.name ?? 'DukaanBook'}</h2>
        {business?.address && <p className="text-[11px]">{business.address}</p>}
        {business?.phone && <p className="text-[11px]">Tel: {business.phone}</p>}
      </div>

      <div className="flex justify-between py-3 text-[11px]">
        <div>
          <p>Sale #</p>
          <p className="font-bold">{sale.saleNumber}</p>
        </div>
        <div className="text-right">
          <p>{formatDate(sale.createdAt, 'short')}</p>
          <p>{formatDate(sale.createdAt, 'time')}</p>
        </div>
      </div>
      <p className="text-[11px] pb-2">Cashier: {sale.cashier?.name ?? '—'}</p>

      <table className="w-full border-t border-dashed pt-2">
        <thead>
          <tr className="text-left text-[11px]">
            <th className="font-normal">Item</th>
            <th className="text-right font-normal">Qty</th>
            <th className="text-right font-normal">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((it) => (
            <tr key={it.id} className="align-top">
              <td className="py-1">
                <div className="font-medium">{it.productName}</div>
                <div className="text-[10px] text-gray-600">
                  {formatCurrency(it.productPrice, currency)} × {it.quantity}
                </div>
              </td>
              <td className="text-right py-1">{it.quantity}</td>
              <td className="text-right py-1">{formatCurrency(it.lineTotal, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed mt-2 pt-2 space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(sale.subtotal, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatCurrency(sale.taxAmount, currency)}</span>
        </div>
        <div className="flex justify-between text-[14px] font-bold border-t border-dashed pt-1">
          <span>TOTAL</span>
          <span>{formatCurrency(sale.total, currency)}</span>
        </div>
        <p className="text-center text-[11px] pt-1">Paid by {sale.paymentMethod}</p>
      </div>

      <div className="text-center text-[11px] pt-3 border-t border-dashed mt-3">
        <p>Thank you!</p>
        <p className="text-[10px] text-gray-600">Items: {sale.items.length}</p>
      </div>
    </div>
  );
});
PosReceipt.displayName = 'PosReceipt';

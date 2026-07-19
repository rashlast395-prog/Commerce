/* ============================================================
   ORDER CARD COMPONENT
   Reusable order card for customer, admin, and rider dashboards
   ============================================================ */

export interface OrderCardData {
  id: string;
  customer?: string;
  email?: string;
  total: number;
  method?: string;
  status?: string;
  deliveryStatus?: string;
  riderName?: string;
  date?: string;
  itemLines?: string[];
  items?: Array<{ title?: string; qty?: number; price?: number }>;
}

export function createOrderCard(order: OrderCardData): string {
  const id = order.id || '—';
  const customer = order.customer || 'Guest';
  const email = order.email ? `<br/><small>${order.email}</small>` : '';
  const total = '$' + (parseFloat(order.total) || 0).toFixed(2);
  const method = order.method || '-';
  
  let itemsStr = '';
  if (order.itemLines && Array.isArray(order.itemLines)) {
    itemsStr = order.itemLines.slice(0, 2).join(', ') + (order.itemLines.length > 2 ? ' +' + (order.itemLines.length - 2) : '');
  } else if (order.items && Array.isArray(order.items)) {
    itemsStr = order.items.map(i => i.title || i).slice(0, 2).join(', ');
  }
  
  const riderInfo = order.riderName || 'Unassigned';

  return `
    <tr>
      <td><strong>#${id}</strong></td>
      <td>${customer}${email}</td>
      <td>${itemsStr}</td>
      <td><strong>${total}</strong></td>
      <td>${method}</td>
      <td>${order.status || 'Pending'}</td>
      <td>${riderInfo}</td>
      <td>${order.date ? new Date(order.date).toLocaleDateString() : '-'}</td>
    </tr>
  `;
}

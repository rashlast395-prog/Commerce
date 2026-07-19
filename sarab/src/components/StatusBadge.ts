/* ============================================================
   STATUS BADGE COMPONENT
   Reusable status badge for orders and reservations
   ============================================================ */

export const ORDER_STATUS_COLORS: Record<string, string> = {
  'Pending': '#f39c12',
  'Approved': '#27ae60',
  'Assigned': '#3498db',
  'Rider Accepted': '#2e86de',
  'Preparing': '#f39c12',
  'Picked Up': '#2e86de',
  'On The Way': '#e74c3c',
  'Near Customer': '#e74c3c',
  'Delivered': '#27ae60',
  'Completed': '#27ae60',
  'Rejected': '#e74c3c',
  'Paused': '#888',
  'Cancelled': '#e74c3c',
  'Returned': '#e74c3c',
  'Refunded': '#9b59b6'
};

export const DELIVERY_STATUS_COLORS: Record<string, string> = {
  'pending': '#f39c12',
  'assigned': '#3498db',
  'picked_up': '#f39c12',
  'on_the_way': '#e74c3c',
  'delivered': '#27ae60'
};

export function getStatusBadge(status: string): string {
  const s = status || 'Pending';
  const color = ORDER_STATUS_COLORS[s] || '#888';
  return `<span style="background:${color};color:#fff;padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${s}</span>`;
}

export function getDeliveryBadge(status: string): string {
  const color = DELIVERY_STATUS_COLORS[status] || '#888';
  return `<span style="background:${color};color:#fff;padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${status || 'Pending'}</span>`;
}

export function getReservationStatusColor(status: string): string {
  const s = (status || 'pending').toLowerCase();
  if (s === 'approved') return '#27ae60';
  if (s === 'declined') return '#e74c3c';
  return '#f39c12';
}

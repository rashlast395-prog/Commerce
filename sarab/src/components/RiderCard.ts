/* ============================================================
   RIDER CARD COMPONENT
   Reusable rider card for admin and rider dashboards
   ============================================================ */

export interface RiderCardData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  vehicle?: string;
  license?: string;
  available?: boolean;
  currentOrderId?: string;
  rating?: number;
  completedDeliveries?: number;
}

export function createRiderCard(rider: RiderCardData): string {
  const statusColor = rider.available ? '#27ae60' : '#e74c3c';
  const statusText = rider.available ? 'Available' : 'Offline';
  const currentOrder = rider.currentOrderId ? '#' + rider.currentOrderId : '-';

  return `
    <tr>
      <td><strong>${rider.name || ''}</strong></td>
      <td>${rider.email || ''}</td>
      <td>${rider.phone || '-'}</td>
      <td>${rider.vehicle || '-'} ${rider.license || ''}</td>
      <td><span style="background:${statusColor};color:#fff;padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${statusText}</span></td>
      <td>${currentOrder}</td>
      <td>${rider.rating ? rider.rating.toFixed(1) + '/5' : '-'}</td>
      <td>${rider.completedDeliveries || 0}</td>
    </tr>
  `;
}

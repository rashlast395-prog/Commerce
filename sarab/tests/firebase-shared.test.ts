import { describe, it, expect } from '@jest/globals';

describe('Firebase Shared Module', () => {
  it('should export required functions', async () => {
    const module = await import('../sarab/js/firebase-shared.js');
    
    expect(typeof module.saveOrder).toBe('function');
    expect(typeof module.updateOrder).toBe('function');
    expect(typeof module.pushStatusHistory).toBe('function');
    expect(typeof module.assignRider).toBe('function');
    expect(typeof module.notify).toBe('function');
    expect(typeof module.logActivity).toBe('function');
  });

  it('should have correct order status constants', async () => {
    const { ORDER_STATUS, ORDER_STATUS_ALT, ALL_STATUSES } = await import('../sarab/js/firebase-shared.js');
    
    expect(ORDER_STATUS.PENDING).toBe('Pending');
    expect(ORDER_STATUS.APPROVED).toBe('Approved');
    expect(ORDER_STATUS_ALT.CANCELLED).toBe('Cancelled');
    expect(Object.keys(ALL_STATUSES).length).toBeGreaterThan(0);
  });
});

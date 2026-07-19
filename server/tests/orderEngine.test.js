import { describe, it, expect } from '@jest/globals';

describe('OrderEngine', () => {
  it('should normalize status correctly', async () => {
    const { normalizeStatus, canTransition } = await import('../server/shared/orderEngine.js');
    
    expect(normalizeStatus('Order Received')).toBe('Pending');
    expect(normalizeStatus('Out for Delivery')).toBe('On The Way');
    expect(normalizeStatus('Delivered')).toBe('Delivered');
  });

  it('should validate state transitions', async () => {
    const { canTransition } = await import('../server/shared/orderEngine.js');
    
    expect(canTransition('Pending', 'Approved')).toBe(true);
    expect(canTransition('Pending', 'Delivered')).toBe(false);
    expect(canTransition('Delivered', 'Completed')).toBe(true);
  });
});

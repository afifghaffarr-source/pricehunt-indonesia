/* eslint-disable @typescript-eslint/no-explicit-any */
// Pre-existing `any` usages; tracked under Phase 5 type-safety backlog.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkPersistentRateLimit, getRequestIdentifier } from '@/lib/rate-limit';

// Mock Supabase admin client
// Pre-existing test mock typing (Phase 5). replace `any` usages with proper types.

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    rpc: vi.fn()
  }))
}));

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRequestIdentifier', () => {
    it('should return user ID when authenticated', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });
      
      const result = getRequestIdentifier('user-123', request);
      expect(result).toBe('user:user-123');
    });

    it('should return IP when not authenticated', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });
      
      const result = getRequestIdentifier(null, request);
      expect(result).toBe('ip:192.168.1.1');
    });

    it('should handle missing x-forwarded-for', () => {
      const request = new Request('http://localhost');
      
      const result = getRequestIdentifier(null, request);
      expect(result).toBe('ip:unknown');
    });

    it('should use x-real-ip as fallback', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '10.0.0.1' }
      });
      
      const result = getRequestIdentifier(null, request);
      expect(result).toBe('ip:10.0.0.1');
    });
  });

  describe('checkPersistentRateLimit', () => {
    it('should allow request when under limit', async () => {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ current_count: 5, allowed: true, remaining: 15 }],
        error: null
      });
      
      (createAdminClient as any).mockReturnValue({ rpc: mockRpc });
      
      const result = await checkPersistentRateLimit({
        identifier: 'user:123',
        endpoint: 'test',
        limit: 20,
        windowMs: 60000
      });
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(15);
    });

    it('should deny request when over limit', async () => {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const mockRpc = vi.fn().mockResolvedValue({
        data: [{ current_count: 20, allowed: false, remaining: 0 }],
        error: null
      });
      
      (createAdminClient as any).mockReturnValue({ rpc: mockRpc });
      
      const result = await checkPersistentRateLimit({
        identifier: 'user:123',
        endpoint: 'test',
        limit: 20,
        windowMs: 60000
      });
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should fail CLOSED on database error (security fix)', async () => {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Connection failed' }
      });
      
      (createAdminClient as any).mockReturnValue({ rpc: mockRpc });
      
      const result = await checkPersistentRateLimit({
        identifier: 'user:123',
        endpoint: 'test',
        limit: 20,
        windowMs: 60000
      });
      
      // SECURITY: Should deny on error (fail-closed)
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBe(60000);
    });

    it('should fail CLOSED on exception', async () => {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const mockRpc = vi.fn().mockRejectedValue(new Error('Network error'));
      
      (createAdminClient as any).mockReturnValue({ rpc: mockRpc });
      
      const result = await checkPersistentRateLimit({
        identifier: 'user:123',
        endpoint: 'test',
        limit: 20,
        windowMs: 60000
      });
      
      // SECURITY: Should deny on exception (fail-closed)
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBe(60000);
    });
  });
});

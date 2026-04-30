import { describe, expect, it } from 'vitest';
import { getPaginationQuery, paginate } from '../src/utils/pagination.js';

describe('Pagination Utility', () => {

  describe('getPaginationQuery', () => {
    it('returns default values when query is empty', () => {
      expect(getPaginationQuery({})).toEqual({ page: 1, pageSize: 10 });
    });

    it('parses valid string numbers', () => {
      expect(getPaginationQuery({ page: '2', pageSize: '20' })).toEqual({ page: 2, pageSize: 20 });
    });

    it('falls back to defaults when provided invalid strings', () => {
      expect(getPaginationQuery({ page: 'abc', pageSize: 'xyz' })).toEqual({ page: 1, pageSize: 10 });
    });

    it('clamps values to minimums and maximums', () => {
      expect(getPaginationQuery({ page: '-5', pageSize: '-10' })).toEqual({ page: 1, pageSize: 10 });
      expect(getPaginationQuery({ page: '1', pageSize: '500' })).toEqual({ page: 1, pageSize: 100 });
    });
  });

  describe('paginate', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // 10 items total

    it('paginates data correctly for the first page', () => {
      const result = paginate(items, 1, 4);
      expect(result.data).toEqual([1, 2, 3, 4]);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 4,
        totalItems: 10,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('paginates data correctly for a middle page', () => {
      const result = paginate(items, 2, 4);
      expect(result.data).toEqual([5, 6, 7, 8]);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });

    it('paginates data correctly for the last page', () => {
      const result = paginate(items, 3, 4);
      expect(result.data).toEqual([9, 10]); // Only 2 items left for the last page
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });

    it('clamps page input to the maximum available pages', () => {
      const result = paginate(items, 999, 4);
      // It should intelligently clamp down to page 3
      expect(result.data).toEqual([9, 10]);
      expect(result.pagination.page).toBe(3);
    });

    it('handles empty arrays gracefully', () => {
      const result = paginate([], 1, 10);
      expect(result.data).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1, // Minimum of 1 page even if empty
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });
  });
});
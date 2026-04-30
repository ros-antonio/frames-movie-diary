import type { PaginatedResult } from '../types.js';

export function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const clampedPage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (clampedPage - 1) * pageSize;

  return {
    data: items.slice(startIndex, startIndex + pageSize),
    pagination: {
      page: clampedPage,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: clampedPage < totalPages,
      hasPreviousPage: clampedPage > 1,
    },
  };
}

export function getPaginationQuery(query: Record<string, any>) {
  let page = parseInt(String(query.page), 10);
  let pageSize = parseInt(String(query.pageSize), 10);

  if (isNaN(page) || page < 1) {
    page = 1;
  }

  if (isNaN(pageSize) || pageSize < 1) {
    pageSize = 10;
  } else if (pageSize > 100) {
    pageSize = 100;
  }

  return { page, pageSize };
}

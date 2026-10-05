export function parsePaginationParams(
  pageNumberRaw: unknown,
  pageSizeRaw: unknown,
  maxPageSize = 100,
  defaultPageNumber = 1,
  defaultPageSize = 10
): { pageNumber: number; pageSize: number } {
  const pageNumber = Math.max(
    1,
    parseInt(String(pageNumberRaw ?? defaultPageNumber), 10) || defaultPageNumber
  );
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, parseInt(String(pageSizeRaw ?? defaultPageSize), 10) || defaultPageSize)
  );
  return { pageNumber, pageSize };
}

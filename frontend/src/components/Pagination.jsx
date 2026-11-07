function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  return (
    <div className="pagination">
      <span>Page {pagination.page} of {pagination.totalPages}</span>
      <div>
        <button className="button secondary small" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>Previous</button>
        <button className="button secondary small" disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>Next</button>
      </div>
    </div>
  );
}

export default Pagination;

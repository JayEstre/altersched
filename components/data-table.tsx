import type { ReactNode } from 'react';

type DataTableProps = {
  children: ReactNode;
  className?: string;
  minWidth?: number;
};

export function DataTable({
  children,
  className = '',
  minWidth,
}: DataTableProps) {
  return (
    <div className={['table-wrap', className].filter(Boolean).join(' ')}>
      <table className="data-table" style={minWidth ? { minWidth: `${minWidth}px` } : undefined}>
        {children}
      </table>
    </div>
  );
}

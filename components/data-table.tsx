<<<<<<< HEAD
import type { ReactNode } from 'react'

type DataTableProps = {
  children: ReactNode
  className?: string
  minWidth?: number
}

export function DataTable({ children, className = '', minWidth }: DataTableProps) {
=======
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
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
  return (
    <div className={['table-wrap', className].filter(Boolean).join(' ')}>
      <table className="data-table" style={minWidth ? { minWidth: `${minWidth}px` } : undefined}>
        {children}
      </table>
    </div>
<<<<<<< HEAD
  )
=======
  );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

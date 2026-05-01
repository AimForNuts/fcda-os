'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SortDirection = 'asc' | 'desc'

export type DataTableCellContext = {
  /** Zero-based index in the currently sorted (or original) row order */
  rowIndex: number
}

type DataTableColumn<Row> = {
  id: string
  header: ReactNode
  cell: (row: Row, context: DataTableCellContext) => ReactNode
  sortable?: boolean
  sortValue?: (row: Row) => number | string | null | undefined
  sortComparator?: (a: Row, b: Row) => number
  align?: 'left' | 'right' | 'center'
  headerClassName?: string
  cellClassName?: string
}

type DataTableProps<Row> = {
  data: Row[]
  columns: Array<DataTableColumn<Row>>
  getRowKey: (row: Row, index: number) => string
  emptyState: ReactNode
  banner?: ReactNode
  defaultSort?: {
    columnId: string
    direction?: SortDirection
  }
  rowClassName?: (row: Row, index: number) => string | undefined
  className?: string
  tableClassName?: string
}

type SortState = {
  columnId: string
  direction: SortDirection
}

const collator = new Intl.Collator('pt-PT', {
  numeric: true,
  sensitivity: 'base',
})

function compareSortValues(a: number | string | null | undefined, b: number | string | null | undefined) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }

  return collator.compare(String(a), String(b))
}

function getAlignClasses(align: DataTableColumn<unknown>['align']) {
  switch (align) {
    case 'center':
      return {
        header: 'text-center',
        button: 'justify-center',
        cell: 'text-center',
      }
    case 'right':
      return {
        header: 'text-right',
        button: 'justify-end',
        cell: 'text-right',
      }
    default:
      return {
        header: 'text-left',
        button: 'justify-start',
        cell: 'text-left',
      }
  }
}

export type { DataTableColumn, SortDirection }

export function DataTable<Row>({
  data,
  columns,
  getRowKey,
  emptyState,
  banner,
  defaultSort,
  rowClassName,
  className,
  tableClassName,
}: DataTableProps<Row>) {
  const [sort, setSort] = useState<SortState | null>(() => {
    if (!defaultSort) return null

    const column = columns.find((entry) => entry.id === defaultSort.columnId)
    if (!column?.sortable) return null

    return {
      columnId: defaultSort.columnId,
      direction: defaultSort.direction ?? 'asc',
    }
  })

  const rows = useMemo(() => {
    const indexedRows = data.map((row, index) => ({ row, index }))

    if (!sort) {
      return indexedRows.map((entry) => entry.row)
    }

    const column = columns.find((entry) => entry.id === sort.columnId)
    if (!column?.sortable) {
      return indexedRows.map((entry) => entry.row)
    }

    return [...indexedRows]
      .sort((a, b) => {
        const diff = column.sortComparator
          ? column.sortComparator(a.row, b.row)
          : compareSortValues(
              column.sortValue ? column.sortValue(a.row) : null,
              column.sortValue ? column.sortValue(b.row) : null
            )

        if (diff !== 0) {
          return sort.direction === 'desc' ? -diff : diff
        }

        return a.index - b.index
      })
      .map((entry) => entry.row)
  }, [columns, data, sort])

  if (data.length === 0) {
    return <>{emptyState}</>
  }

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
      {banner ? (
        <div className="bg-fcda-ice px-4 py-2 text-xs text-fcda-navy/70 border-b border-border">
          {banner}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className={cn('w-full text-sm', tableClassName)}>
          <thead>
            <tr className="bg-fcda-navy text-white text-xs uppercase tracking-wide">
              {columns.map((column) => {
                const active = sort?.columnId === column.id
                const align = getAlignClasses(column.align)

                return (
                  <th
                    key={column.id}
                    aria-sort={
                      column.sortable
                        ? active
                          ? sort?.direction === 'desc'
                            ? 'descending'
                            : 'ascending'
                          : 'none'
                        : undefined
                    }
                    className={cn(
                      'px-4 py-2.5 font-semibold whitespace-nowrap',
                      align.header,
                      column.headerClassName
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSort((current) => {
                            if (current?.columnId === column.id) {
                              return {
                                columnId: column.id,
                                direction: current.direction === 'desc' ? 'asc' : 'desc',
                              }
                            }

                            return {
                              columnId: column.id,
                              direction: defaultSort?.columnId === column.id
                                ? (defaultSort.direction ?? 'asc')
                                : 'asc',
                            }
                          })
                        }
                        className={cn(
                          'inline-flex w-full items-center gap-1 select-none',
                          align.button
                        )}
                      >
                        <span>{column.header}</span>
                        {active ? (
                          <span aria-hidden="true">{sort.direction === 'desc' ? '↓' : '↑'}</span>
                        ) : null}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className={
                  rowClassName?.(row, index)
                  ?? (index % 2 === 0 ? 'bg-background' : 'bg-muted/30')
                }
              >
                {columns.map((column) => {
                  const align = getAlignClasses(column.align)

                  return (
                    <td
                      key={column.id}
                      className={cn(
                        'px-4 py-2.5',
                        align.cell,
                        column.cellClassName
                      )}
                    >
                      {column.cell(row, { rowIndex: index })}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

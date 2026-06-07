'use client';

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type FeatureShellProps = {
  title: string;
  description: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function FeatureShell({ title, description, eyebrow, actions, children }: FeatureShellProps) {
  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            {eyebrow ? <div className="flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{title}</h2>
              <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      </section>
      {children}
    </div>
  );
}

type WorkspaceCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function WorkspaceCard({ title, description, action, children, className, contentClassName }: WorkspaceCardProps) {
  return (
    <Card className={cn('border-border bg-card shadow-sm', className)}>
      <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn('space-y-3', contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function FormPanel({ children, className, ...props }: React.ComponentProps<'form'>) {
  return (
    <form
      className={cn('rounded-xl border border-border bg-background/70 p-4 shadow-sm', className)}
      {...props}
    >
      {children}
    </form>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-10 text-center">
      <div className="font-medium text-foreground">{title}</div>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function MetricStrip({
  label,
  value,
  tone = 'text-primary',
}: {
  label: string;
  value: ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-background/70 p-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn('text-lg font-semibold tracking-tight', tone)}>{value}</span>
    </div>
  );
}

export function ProgressBar({ value, tone = 'bg-primary' }: { value: number; tone?: string }) {
  return (
    <div className="h-2.5 rounded-full bg-muted">
      <div className={cn('h-2.5 rounded-full transition-all', tone)} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  );
}

export function ActionIconButton({
  label,
  tone = 'default',
  children,
  className,
  ...props
}: React.ComponentProps<'button'> & {
  label: string;
  tone?: 'default' | 'primary' | 'danger' | 'success';
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-destructive hover:bg-destructive/10'
      : tone === 'primary'
        ? 'text-primary hover:bg-primary/10'
        : tone === 'success'
          ? 'text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300'
          : 'text-foreground hover:bg-muted';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors', toneClass, className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function PrimaryAction({ children, className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button className={cn('border border-green-700 bg-green-600 font-semibold text-white shadow-sm hover:bg-green-700', className)} {...props}>
      {children}
    </Button>
  );
}

type TableFilterOption = {
  label: string;
  value: string;
};

export function TableControls({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters = [],
  onReset,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filters?: Array<{
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    options: TableFilterOption[];
  }>;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="relative min-w-[200px] lg:w-[260px]">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-8 border-border bg-background pl-8 shadow-sm text-xs"
        />
      </div>
      {filters.map((filter) => (
        <Select key={filter.placeholder} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className="h-8 w-full border-border bg-background shadow-sm lg:w-[160px] text-xs">
            <SelectValue placeholder={filter.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      <Button variant="outline" className="h-8 border-border bg-background shadow-sm text-xs px-2" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}

export function TablePagination({
  page,
  totalPages,
  rowsPerPage,
  totalRows,
  onPageChange,
  onRowsPerPageChange,
}: {
  page: number;
  totalPages: number;
  rowsPerPage: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border px-2 py-2 text-xs text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
      <div>{totalRows} row{totalRows === 1 ? '' : 's'}</div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <span>Rows / page</span>
          <Select value={String(rowsPerPage)} onValueChange={(value) => onRowsPerPageChange(Number(value))}>
            <SelectTrigger className="h-7 w-[90px] border-border bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 15, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span>
          Page {page} / {totalPages}
        </span>
        <div className="flex items-center gap-0.5">
          <Button variant="outline" size="icon-sm" disabled={page === 1} onClick={() => onPageChange(1)} className="h-6 w-6">
            <ChevronsLeft className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="icon-sm" disabled={page === 1} onClick={() => onPageChange(Math.max(1, page - 1))} className="h-6 w-6">
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="icon-sm" disabled={page === totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} className="h-6 w-6">
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="icon-sm" disabled={page === totalPages} onClick={() => onPageChange(totalPages)} className="h-6 w-6">
            <ChevronsRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

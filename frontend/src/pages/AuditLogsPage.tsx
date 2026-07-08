import { useState } from 'react';
import { ClipboardList, ChevronDown, ChevronRight, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { RetryError } from '@/components/common/RetryError';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { Pagination } from '@/components/common/Pagination';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useAuditLogs, type AuditLogEntry } from '@/hooks/useAuditLogs';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDate } from '@/lib/format';

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const debActionFilter = useDebouncedValue(actionFilter, 300);
  const debEntityFilter = useDebouncedValue(entityFilter, 300);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [expanded, setExpanded] = useState<string | null>(null);

  const params = {
    action: debActionFilter || undefined,
    entityType: debEntityFilter || undefined,
    page,
    pageSize,
  };
  const { data, isLoading, isError, error, refetch, isFetching } = useAuditLogs(params);
  const logs: AuditLogEntry[] = data?.logs ?? [];
  const hasFilters = !!debActionFilter || !!debEntityFilter;

  const reset = () => {
    setActionFilter('');
    setEntityFilter('');
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Every mutation is recorded with the user, action, and metadata."
      />

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <Input
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by action (e.g. SALE_CREATE)"
          className="max-w-xs"
        />
        <Input
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by entity (e.g. Product)"
          className="max-w-xs"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} columns={5} />
      ) : isError ? (
        <RetryError error={error} onRetry={() => refetch()} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={hasFilters ? 'No matching log entries' : 'No audit entries yet'}
          description={hasFilters ? 'Try widening or clearing your filters.' : 'Activity will appear here.'}
        />
      ) : (
        <>
          <div
            className={`rounded-xl border border-border bg-card overflow-hidden transition-opacity ${
              isFetching ? 'opacity-90' : ''
            }`}
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => {
                  const open = expanded === l.id;
                  const hasMeta = l.metadata && Object.keys(l.metadata as object).length > 0;
                  return (
                    <>
                      <TableRow
                        key={l.id}
                        className={hasMeta ? 'cursor-pointer' : ''}
                        onClick={() => hasMeta && setExpanded(open ? null : l.id)}
                      >
                        <TableCell>
                          {hasMeta ? (
                            open ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )
                          ) : null}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(l.createdAt, 'long')}
                        </TableCell>
                        <TableCell>
                          {l.user ? (
                            <>
                              <div className="font-medium text-sm">{l.user.name}</div>
                              <div className="text-xs text-muted-foreground">{l.user.email}</div>
                            </>
                          ) : (
                            <span className="text-muted-foreground italic">system</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {l.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-sm">{l.entityType}</span>
                          {l.entityId && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {l.entityId.slice(0, 8)}…
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {l.ipAddress ?? '—'}
                        </TableCell>
                      </TableRow>
                      {open && hasMeta && (
                        <TableRow key={`${l.id}-meta`} className="bg-muted/30">
                          <TableCell colSpan={6}>
                            <pre className="text-xs font-mono whitespace-pre-wrap break-words p-2">
                              {JSON.stringify(l.metadata, null, 2)}
                            </pre>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={data?.page ?? 1}
            pageSize={data?.pageSize ?? pageSize}
            total={data?.total ?? 0}
            onChange={setPage}
          />
        </>
      )}
    </>
  );
}

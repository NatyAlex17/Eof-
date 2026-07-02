// Realtime subscription helper — one channel per table, cleaned up on unmount.
// Usage (in a client component):
//   useEffect(() => subscribeToTable('box_contents', () => refetch()), [refetch]);
import { createClient } from '../supabase/client';

type WatchedTable =
  | 'box_contents'
  | 'order_lines'
  | 'orders'
  | 'invoices'
  | 'notifications'
  | 'board_locks';

/**
 * Subscribe to all changes on a table. Returns the cleanup function —
 * return it directly from useEffect.
 */
export function subscribeToTable(table: WatchedTable, onChange: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`realtime:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

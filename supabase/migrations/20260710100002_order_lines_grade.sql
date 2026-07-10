-- =============================================================================
-- MANA — Order lines: allow the same species at multiple grades (fix C2)
--
-- The v2 schema created order_lines with `unique (order_id, species)`, which
-- blocks a customer from ordering, e.g., Ahi #A+ AND Ahi #A on one order — even
-- though the catalog carries them as separate SKUs and box_contents already
-- track grade. The audit docs call for a unique index on
-- (order_id, species, grade) instead.
--
-- Run AFTER the v2 migration. Safe to re-run.
-- =============================================================================

-- Drop the old species-only unique constraint, whatever it was auto-named.
do $$
declare
  v_name text;
begin
  select conname into v_name
  from pg_constraint
  where conrelid = 'public.order_lines'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) = 'UNIQUE (order_id, species)';
  if v_name is not null then
    execute format('alter table public.order_lines drop constraint %I', v_name);
  end if;
end $$;

-- New rule: one line per (order, species, grade). NULL grade is treated as ''
-- so "no grade" is still deduplicated consistently.
create unique index if not exists order_lines_order_species_grade_ux
  on public.order_lines (order_id, species, coalesce(grade, ''));

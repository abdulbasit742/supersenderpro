create type public.audit_severity as enum ('info', 'success', 'warning', 'destructive', 'muted');

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  action text not null,
  target text,
  target_type text,
  severity audit_severity not null default 'info',
  metadata jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;

alter table public.audit_events enable row level security;

create policy "Users can view their own audit events"
  on public.audit_events for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own audit events"
  on public.audit_events for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Admins can view all audit events"
  on public.audit_events for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create index idx_audit_events_user_id on public.audit_events(user_id);
create index idx_audit_events_created_at on public.audit_events(created_at desc);
create index idx_audit_events_severity on public.audit_events(severity);
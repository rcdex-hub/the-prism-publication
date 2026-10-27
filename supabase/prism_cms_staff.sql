-- The Prism CMS role table. Run this in a dedicated Supabase project SQL Editor.
-- Supabase Auth stores email/password securely; this table holds ONLY username, role and status.
create table if not exists public.prism_cms_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique
    check (username = lower(username) and username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  role text not null check (role in ('admin', 'editor')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.prism_cms_staff enable row level security;
revoke all on public.prism_cms_staff from anon, authenticated;
grant select on public.prism_cms_staff to service_role;
-- No policies are created, so browser and user JWTs cannot list staff records.

-- Create users in Authentication > Users, then map them privately:
-- insert into public.prism_cms_staff (user_id, username, role, active)
-- select id, 'schooladmin', 'admin', true
-- from auth.users where email = 'admin@example.edu.ph';
-- For editors use role 'editor'; to revoke access set active=false.

-- ann.di.studio — схема бази даних (Supabase)
-- Supabase → SQL Editor → New query → вставити весь файл → Run.
-- Скрипт можна запускати повторно: він нічого не ламає.

create extension if not exists pgcrypto;

-- ───────── Допоміжна функція: чи поточний користувач — адміністратор ─────────
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

-- ───────── Замовлення ─────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_number text not null unique,
  customer text not null,
  email text not null,
  phone text not null,
  city text, region text, branch text, address text,
  delivery text, payment text, comment text,
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0 check (total >= 0),
  status text not null default 'Нове',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id, created_at desc);

-- ───────── Товари ─────────
create table if not exists public.products (
  id bigint primary key,
  position int not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- ───────── Налаштування сайту (тексти, фото, контакти) ─────────
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ───────── Запити з контактної форми ─────────
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  message text not null check (char_length(message) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- ───────── Тригери ─────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Ціни та суму замовлення рахує БАЗА за таблицею products,
-- тому підмінити ціну в браузері неможливо.
create or replace function public.orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  it jsonb; p record; qty int; total numeric := 0; fixed jsonb := '[]'::jsonb;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'Невірний користувач';
  end if;
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'Порожнє замовлення';
  end if;
  for it in select value from jsonb_array_elements(new.items) loop
    qty := greatest(1, least(99, coalesce((it->>'qty')::int, 1)));
    select (data->>'price')::numeric as price,
           data->'name'->>'uk' as name,
           coalesce((data->>'stock')::boolean, true) as stock
      into p from public.products where id = (it->>'id')::bigint;
    if not found then
      raise exception 'Товар % не знайдено. Імпортуйте товари в адмінці.', it->>'id';
    end if;
    if not p.stock or coalesce(p.price, 0) <= 0 then
      raise exception 'Товар «%» недоступний для замовлення', p.name;
    end if;
    total := total + p.price * qty;
    fixed := fixed || jsonb_build_object('id', (it->>'id')::bigint, 'name', p.name, 'price', p.price, 'qty', qty);
  end loop;
  new.items := fixed;
  new.total := total;
  new.status := 'Нове';
  return new;
end $$;

drop trigger if exists orders_check on public.orders;
create trigger orders_check before insert on public.orders
  for each row execute function public.orders_before_insert();

-- ───────── Безпека (RLS) ─────────
alter table public.orders        enable row level security;
alter table public.products      enable row level security;
alter table public.site_settings enable row level security;
alter table public.requests      enable row level security;

-- orders
drop policy if exists "Customers create own orders" on public.orders;
create policy "Customers create own orders" on public.orders
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Customers read own orders" on public.orders;
create policy "Customers read own orders" on public.orders
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Admins manage all orders" on public.orders;
create policy "Admins manage all orders" on public.orders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- products: читають усі, змінює адмін
drop policy if exists "Anyone reads products" on public.products;
create policy "Anyone reads products" on public.products for select to anon, authenticated using (true);
drop policy if exists "Admins write products" on public.products;
create policy "Admins write products" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- site_settings: так само
drop policy if exists "Anyone reads settings" on public.site_settings;
create policy "Anyone reads settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "Admins write settings" on public.site_settings;
create policy "Admins write settings" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- requests: надіслати може будь-хто, читає/видаляє тільки адмін
drop policy if exists "Anyone sends request" on public.requests;
create policy "Anyone sends request" on public.requests for insert to anon, authenticated with check (true);
drop policy if exists "Admins read requests" on public.requests;
create policy "Admins read requests" on public.requests for select to authenticated using (public.is_admin());
drop policy if exists "Admins delete requests" on public.requests;
create policy "Admins delete requests" on public.requests for delete to authenticated using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.products, public.site_settings to anon, authenticated;
grant insert on public.requests to anon, authenticated;
grant select, insert, update, delete on public.orders, public.products, public.site_settings, public.requests to authenticated;

-- ───────── Сховище для фото ─────────
insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do update set public = true;

drop policy if exists "Public reads media" on storage.objects;
create policy "Public reads media" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "Admins upload media" on storage.objects;
create policy "Admins upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "Admins update media" on storage.objects;
create policy "Admins update media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin());
drop policy if exists "Admins delete media" on storage.objects;
create policy "Admins delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());

-- Library catalog schema for the Book, ShelfLocation, and AddBookFormData models.
-- Run this file in the Supabase SQL editor (or as your initial migration).

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  create type public.book_availability as enum ('available', 'issued');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  name citext not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  name citext not null unique,
  created_at timestamptz not null default now()
);

-- A catalog record has one current physical placement, matching Book.location.
create table if not exists public.shelf_locations (
  id uuid primary key default gen_random_uuid(),
  shelf_code text not null check (length(btrim(shelf_code)) > 0),
  row_label text not null check (length(btrim(row_label)) > 0),
  slot_label text not null check (length(btrim(slot_label)) > 0),
  created_at timestamptz not null default now(),
  unique (shelf_code, row_label, slot_label)
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  -- Retains the current mock-data identifiers during the migration to UUIDs.
  legacy_id text unique,
  title text not null check (length(btrim(title)) > 0),
  subtitle text,
  language text not null check (length(btrim(language)) > 0),
  is_translated boolean not null default false,
  original_language text,
  shelf_location_id uuid not null references public.shelf_locations(id) on delete restrict,
  copies integer not null check (copies between 1 and 9999),
  published_year integer not null check (published_year between 1000 and 9999),
  cover_url text,
  availability public.book_availability not null default 'available',
  isbn text unique check (isbn is null or isbn ~ '^[0-9Xx-]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (not is_translated and original_language is null)
    or (is_translated and original_language is not null and length(btrim(original_language)) > 0)
  )
);

create table if not exists public.book_authors (
  book_id uuid not null references public.books(id) on delete cascade,
  author_id uuid not null references public.authors(id) on delete restrict,
  author_order smallint not null check (author_order >= 0),
  primary key (book_id, author_id),
  unique (book_id, author_order)
);

create table if not exists public.book_genres (
  book_id uuid not null references public.books(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete restrict,
  genre_order smallint not null check (genre_order >= 0),
  primary key (book_id, genre_id),
  unique (book_id, genre_order)
);

create index if not exists books_availability_idx on public.books (availability);
create index if not exists books_language_idx on public.books (language);
create index if not exists books_published_year_idx on public.books (published_year);
create index if not exists book_authors_author_id_idx on public.book_authors (author_id);
create index if not exists book_genres_genre_id_idx on public.book_genres (genre_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
before update on public.books
for each row execute function public.set_updated_at();

-- Temporary development policies. Replace these with user-scoped policies before launch.
alter table public.authors enable row level security;
alter table public.genres enable row level security;
alter table public.shelf_locations enable row level security;
alter table public.books enable row level security;
alter table public.book_authors enable row level security;
alter table public.book_genres enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'authors', 'genres', 'shelf_locations', 'books', 'book_authors', 'book_genres'
  ]
  loop
    execute format('drop policy if exists "Public read access" on public.%I', table_name);
    execute format('drop policy if exists "Public insert access" on public.%I', table_name);
    execute format('drop policy if exists "Public update access" on public.%I', table_name);
    execute format('drop policy if exists "Public delete access" on public.%I', table_name);
    execute format('create policy "Public read access" on public.%I for select to anon, authenticated using (true)', table_name);
    execute format('create policy "Public insert access" on public.%I for insert to anon, authenticated with check (true)', table_name);
    execute format('create policy "Public update access" on public.%I for update to anon, authenticated using (true) with check (true)', table_name);
    execute format('create policy "Public delete access" on public.%I for delete to anon, authenticated using (true)', table_name);
  end loop;
end;
$$;

-- Seed data mirrors the ten current entries in app/page.tsx.
insert into public.authors (name) values
  ('Douglas Adams'),
  ('সৈয়দ মুজতবা আলী'),
  ('Yuval Noah Harari'),
  ('রবীন্দ্রনাথ ঠাকুর'),
  ('George Orwell'),
  ('বিভূতিভূষণ বন্দ্যোপাধ্যায়'),
  ('Paulo Coelho'),
  ('মেজর রফিকুল ইসলাম'),
  ('আবদুল করিম'),
  ('Daniel Kahneman')
on conflict (name) do nothing;

insert into public.genres (name) values
  ('Sci-Fi'), ('History'), ('Non-Fiction'), ('Poetry'), ('Fiction'),
  ('Biography'), ('Philosophy'), ('Drama'), ('Bengali Literature'),
  ('Psychology'), ('Travel'), ('Dystopia'), ('Adventure'), ('Comedy'), ('Anthropology')
on conflict (name) do nothing;

insert into public.shelf_locations (shelf_code, row_label, slot_label) values
  ('A1', '3', '12'), ('B2', '1', '5'), ('C3', '2', '8'), ('B4', '2', '15'),
  ('A2', '4', '7'), ('B3', '1', '3'), ('D1', '2', '10'), ('C1', '3', '2'),
  ('E2', '1', '18'), ('B1', '5', '1')
on conflict (shelf_code, row_label, slot_label) do nothing;

insert into public.books (
  legacy_id, title, subtitle, language, is_translated, original_language,
  shelf_location_id, copies, published_year, cover_url, availability, isbn
)
select
  seed.legacy_id, seed.title, nullif(seed.subtitle, ''), seed.language,
  seed.is_translated, seed.original_language, location.id, seed.copies,
  seed.published_year, nullif(seed.cover_url, ''), seed.availability::public.book_availability,
  seed.isbn
from (
  values
    ('1', 'The Hitchhiker''s Guide to the Galaxy', 'A Trilogy in Five Parts', 'English', false, null, 'A1', '3', '12', 3, 1979, 'https://covers.openlibrary.org/b/id/8739161-L.jpg', 'available', '9780330258647'),
    ('2', 'দেশে বিদেশে', '', 'Bengali', false, null, 'B2', '1', '5', 2, 1949, 'https://covers.openlibrary.org/b/id/12547704-L.jpg', 'available', null),
    ('3', 'Sapiens: A Brief History of Humankind', '', 'English', false, null, 'C3', '2', '8', 4, 2011, 'https://covers.openlibrary.org/b/id/8739166-L.jpg', 'issued', '9780062316097'),
    ('4', 'আমার ছেলেবেলা', '', 'Bengali', false, null, 'B4', '2', '15', 1, 1940, '', 'available', null),
    ('5', '1984', '', 'English', false, null, 'A2', '4', '7', 5, 1949, 'https://covers.openlibrary.org/b/id/8575708-L.jpg', 'available', '9780451524935'),
    ('6', 'পথের পাঁচালী', 'আম আঁটির ভেঁপু', 'Bengali', false, null, 'B3', '1', '3', 3, 1929, 'https://covers.openlibrary.org/b/id/12547706-L.jpg', 'issued', null),
    ('7', 'The Alchemist', '', 'English', true, 'Portuguese', 'D1', '2', '10', 6, 1988, 'https://covers.openlibrary.org/b/id/8739171-L.jpg', 'available', '9780061122415'),
    ('8', 'মুক্তিযুদ্ধের ইতিহাস', 'বাংলাদেশের স্বাধীনতা সংগ্রাম', 'Bengali', false, null, 'C1', '3', '2', 2, 1985, '', 'available', null),
    ('9', 'Thinking, Fast and Slow', '', 'English', false, null, 'E2', '1', '18', 3, 2011, 'https://covers.openlibrary.org/b/id/8739168-L.jpg', 'issued', '9780374533557'),
    ('10', 'গল্পগুচ্ছ', 'রবীন্দ্রনাথের ছোটগল্প সমগ্র', 'Bengali', false, null, 'B1', '5', '1', 4, 1900, '', 'available', null)
) as seed(
  legacy_id, title, subtitle, language, is_translated, original_language,
  shelf_code, row_label, slot_label, copies, published_year, cover_url, availability, isbn
)
join public.shelf_locations as location
  on (location.shelf_code, location.row_label, location.slot_label) =
     (seed.shelf_code, seed.row_label, seed.slot_label)
on conflict (legacy_id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  language = excluded.language,
  is_translated = excluded.is_translated,
  original_language = excluded.original_language,
  shelf_location_id = excluded.shelf_location_id,
  copies = excluded.copies,
  published_year = excluded.published_year,
  cover_url = excluded.cover_url,
  availability = excluded.availability,
  isbn = excluded.isbn;

insert into public.book_authors (book_id, author_id, author_order)
select book.id, author.id, seed.author_order
from (
  values
    ('1', 'Douglas Adams', 0), ('2', 'সৈয়দ মুজতবা আলী', 0),
    ('3', 'Yuval Noah Harari', 0), ('4', 'রবীন্দ্রনাথ ঠাকুর', 0),
    ('5', 'George Orwell', 0), ('6', 'বিভূতিভূষণ বন্দ্যোপাধ্যায়', 0),
    ('7', 'Paulo Coelho', 0), ('8', 'মেজর রফিকুল ইসলাম', 0),
    ('8', 'আবদুল করিম', 1), ('9', 'Daniel Kahneman', 0),
    ('10', 'রবীন্দ্রনাথ ঠাকুর', 0)
) as seed(legacy_id, author_name, author_order)
join public.books as book on book.legacy_id = seed.legacy_id
join public.authors as author on author.name = seed.author_name
on conflict (book_id, author_id) do update set author_order = excluded.author_order;

insert into public.book_genres (book_id, genre_id, genre_order)
select book.id, genre.id, seed.genre_order
from (
  values
    ('1', 'Sci-Fi', 0), ('1', 'Fiction', 1), ('1', 'Comedy', 2),
    ('2', 'Non-Fiction', 0), ('2', 'Travel', 1), ('2', 'Bengali Literature', 2),
    ('3', 'History', 0), ('3', 'Non-Fiction', 1), ('3', 'Anthropology', 2),
    ('4', 'Biography', 0), ('4', 'Bengali Literature', 1), ('4', 'Poetry', 2),
    ('5', 'Sci-Fi', 0), ('5', 'Dystopia', 1), ('5', 'Fiction', 2),
    ('6', 'Fiction', 0), ('6', 'Bengali Literature', 1), ('6', 'Drama', 2),
    ('7', 'Fiction', 0), ('7', 'Philosophy', 1), ('7', 'Adventure', 2),
    ('8', 'History', 0), ('8', 'Non-Fiction', 1), ('8', 'Bengali Literature', 2),
    ('9', 'Non-Fiction', 0), ('9', 'Psychology', 1), ('9', 'Philosophy', 2),
    ('10', 'Fiction', 0), ('10', 'Poetry', 1), ('10', 'Bengali Literature', 2)
) as seed(legacy_id, genre_name, genre_order)
join public.books as book on book.legacy_id = seed.legacy_id
join public.genres as genre on genre.name = seed.genre_name
on conflict (book_id, genre_id) do update set genre_order = excluded.genre_order;

-- ============================================================================
-- PHASE 2 EXTENSION: MEMBERS & CIRCULATION (BOOK ISSUES / LOANS)
-- ============================================================================

do $$
begin
  create type public.member_status as enum ('active', 'suspended');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.issue_status as enum ('active', 'returned', 'overdue');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  member_code text not null unique check (length(btrim(member_code)) > 0),
  full_name text not null check (length(btrim(full_name)) > 0),
  email text unique check (email is null or email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone text check (phone is null or length(btrim(phone)) > 0),
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_issues (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  issued_at timestamptz not null default now(),
  due_date timestamptz not null,
  returned_at timestamptz,
  status public.issue_status not null default 'active',
  return_requested boolean not null default false,
  return_requested_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_code_idx on public.members (member_code);
create index if not exists members_status_idx on public.members (status);
create index if not exists book_issues_book_id_idx on public.book_issues (book_id);
create index if not exists book_issues_member_id_idx on public.book_issues (member_id);
create index if not exists book_issues_status_idx on public.book_issues (status);
create index if not exists book_issues_due_date_idx on public.book_issues (due_date);
create index if not exists book_issues_active_inventory_idx on public.book_issues (book_id) where returned_at is null;

drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

drop trigger if exists book_issues_set_updated_at on public.book_issues;
create trigger book_issues_set_updated_at
before update on public.book_issues
for each row execute function public.set_updated_at();

alter table public.members enable row level security;
alter table public.book_issues enable row level security;

grant select, insert, update, delete on public.members to anon, authenticated;
grant select, insert, update, delete on public.book_issues to anon, authenticated;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['members', 'book_issues']
  loop
    execute format('drop policy if exists "Public read access" on public.%I', tbl);
    execute format('drop policy if exists "Public insert access" on public.%I', tbl);
    execute format('drop policy if exists "Public update access" on public.%I', tbl);
    execute format('drop policy if exists "Public delete access" on public.%I', tbl);
    execute format('create policy "Public read access" on public.%I for select to anon, authenticated using (true)', tbl);
    execute format('create policy "Public insert access" on public.%I for insert to anon, authenticated with check (true)', tbl);
    execute format('create policy "Public update access" on public.%I for update to anon, authenticated using (true) with check (true)', tbl);
    execute format('create policy "Public delete access" on public.%I for delete to anon, authenticated using (true)', tbl);
  end loop;
end;
$$;

-- Seed initial members
insert into public.members (member_code, full_name, email, phone, status) values
  ('MEM-001', 'Tahmid Rahman', 'tahmid.rahman@example.com', '+880 1711-000001', 'active'),
  ('MEM-002', 'Ayesha Siddiqua', 'ayesha.s@example.com', '+880 1812-000002', 'active'),
  ('MEM-003', 'Kazi Anisul Haq', 'anisul.haq@example.com', '+880 1913-000003', 'active'),
  ('MEM-004', 'Nusrat Jahan', 'nusrat.j@example.com', '+880 1614-000004', 'suspended'),
  ('MEM-005', 'Zubair Hossain', 'zubair.h@example.com', '+880 1515-000005', 'active')
on conflict (member_code) do nothing;

-- ============================================================================
-- PHASE 3 EXTENSION: BOOK REQUESTS (MEMBER BORROW REQUEST & LIBRARIAN APPROVAL)
-- ============================================================================

do $$
begin
  create type public.request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.book_requests (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status public.request_status not null default 'pending',
  request_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists book_requests_book_id_idx on public.book_requests (book_id);
create index if not exists book_requests_member_id_idx on public.book_requests (member_id);
create index if not exists book_requests_status_idx on public.book_requests (status);

drop trigger if exists book_requests_set_updated_at on public.book_requests;
create trigger book_requests_set_updated_at
before update on public.book_requests
for each row execute function public.set_updated_at();

alter table public.book_requests enable row level security;

grant select, insert, update, delete on public.book_requests to anon, authenticated;

do $$
declare
  tbl text := 'book_requests';
begin
  execute format('drop policy if exists "Public read access" on public.%I', tbl);
  execute format('drop policy if exists "Public insert access" on public.%I', tbl);
  execute format('drop policy if exists "Public update access" on public.%I', tbl);
  execute format('drop policy if exists "Public delete access" on public.%I', tbl);
  execute format('create policy "Public read access" on public.%I for select to anon, authenticated using (true)', tbl);
  execute format('create policy "Public insert access" on public.%I for insert to anon, authenticated with check (true)', tbl);
  execute format('create policy "Public update access" on public.%I for update to anon, authenticated using (true) with check (true)', tbl);
  execute format('create policy "Public delete access" on public.%I for delete to anon, authenticated using (true)', tbl);
end;
$$;

-- ============================================================================
-- PHASE 4 EXTENSION: 2-STEP BOOK RETURN FLOW (MEMBER REQUEST -> LIBRARIAN CONFIRM)
-- ============================================================================

-- Add return request tracking columns to book_issues
alter table public.book_issues 
add column if not exists return_requested boolean not null default false,
add column if not exists return_requested_at timestamptz;

create index if not exists book_issues_return_requested_idx on public.book_issues (return_requested);


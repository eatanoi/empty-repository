-- ==========================================================================
-- ตารางสำหรับระบบข้อมูล วPA (vpa/index.html)
-- รันไฟล์นี้ใน Supabase → SQL Editor → New query → Run เพียงครั้งเดียว
-- รันซ้ำได้อย่างปลอดภัย
-- ==========================================================================

create table if not exists public.vpa_docs (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fiscal_year text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  unique (owner, fiscal_year)
);

comment on table public.vpa_docs is 'ข้อมูล วPA หนึ่งแถวต่อหนึ่งปีงบประมาณของครูหนึ่งคน';

-- ── Row Level Security: ครูเห็นและแก้ได้เฉพาะข้อมูลของตัวเองเท่านั้น ──
alter table public.vpa_docs enable row level security;

drop policy if exists "vpa owner read"   on public.vpa_docs;
drop policy if exists "vpa owner insert" on public.vpa_docs;
drop policy if exists "vpa owner update" on public.vpa_docs;
drop policy if exists "vpa owner delete" on public.vpa_docs;

create policy "vpa owner read"   on public.vpa_docs for select using (auth.uid() = owner);
create policy "vpa owner insert" on public.vpa_docs for insert with check (auth.uid() = owner);
create policy "vpa owner update" on public.vpa_docs for update using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "vpa owner delete" on public.vpa_docs for delete using (auth.uid() = owner);

-- ── อัปเดตเวลาแก้ไขล่าสุดอัตโนมัติ ──
create or replace function public.vpa_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.owner = coalesce(new.owner, auth.uid());
  return new;
end $$;

drop trigger if exists vpa_touch_trg on public.vpa_docs;
create trigger vpa_touch_trg before insert or update on public.vpa_docs
  for each row execute function public.vpa_touch();

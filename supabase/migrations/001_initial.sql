begin;
create table public.ritms (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 number text not null check(number ~ '^RITM[0-9]{4,15}$'), title text not null check(length(title) between 3 and 240), description text not null default '', servicenow_url text not null default '' check(servicenow_url = '' or servicenow_url ~ '^https://'),
 received_at date, due_date date, completed_at timestamptz,
 status text not null default 'Pendente' check(status in ('Pendente','Em andamento','Aguardando resposta','Concluída','Cancelada')),
 priority text not null default 'Média' check(priority in ('Baixa','Média','Alta','Crítica')),
 category text not null default 'Outros' check(category in ('Business Rule','Client Script','UI Policy','Flow Designer','Script Include','Catalog Item','ACL','Integração','Correção de Bug','Melhoria','Outros')),
 environment text not null default 'DEV' check(environment in ('DEV','TEST','HOMOLOG','PROD')),
 origin text not null default 'ServiceNow' check(origin in ('Teams','ServiceNow','E-mail','Reunião','WhatsApp','Outro')),
 requester text not null default '', request_notes text not null default '', problem text not null default '', solution text not null default '', procedure text not null default '', code text not null default '', technical_notes text not null default '', difficulties text not null default '', validation text not null default '',
 tags text[] not null default '{}', favorite boolean not null default false, archived boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,number), unique(id,user_id)
);
create index ritms_user_updated on public.ritms(user_id,updated_at desc);
create index ritms_user_status on public.ritms(user_id,status);
create index ritms_due on public.ritms(user_id,due_date) where status not in ('Concluída','Cancelada');
create index ritms_search on public.ritms using gin(to_tsvector('portuguese',number||' '||title||' '||description||' '||problem||' '||solution));
create table public.ritm_attachments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), ritm_id uuid not null,
 path text not null unique, name text not null, caption text not null default '', evidence_type text not null default 'Adicional' check(evidence_type in ('Solicitação original','Registro ServiceNow','Antes da correção','Implementação','Resultado final','Adicional')),
 position integer not null default 0, size integer not null check(size between 1 and 10485760), mime_type text not null check(mime_type in ('image/png','image/jpeg','image/webp')), created_at timestamptz not null default now(),
 foreign key(ritm_id,user_id) references public.ritms(id,user_id) on delete cascade,
 check(split_part(path,'/',1)=user_id::text and split_part(path,'/',2)=ritm_id::text)
);
create table public.ritm_checklist_items (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), ritm_id uuid not null, title text not null check(length(title) between 1 and 500), completed boolean not null default false, position integer not null default 0, created_at timestamptz not null default now(),
 foreign key(ritm_id,user_id) references public.ritms(id,user_id) on delete cascade
);
create table public.ritm_activity_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, ritm_id uuid not null, action text not null, created_at timestamptz not null default now(), foreign key(ritm_id,user_id) references public.ritms(id,user_id) on delete cascade
);
create table public.tags (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade, name text not null check(length(name) between 1 and 40), created_at timestamptz not null default now(), unique(user_id,name), unique(id,user_id));
create table public.ritm_tags (ritm_id uuid not null, tag_id uuid not null, user_id uuid not null default auth.uid(), primary key(ritm_id,tag_id), foreign key(ritm_id,user_id) references public.ritms(id,user_id) on delete cascade, foreign key(tag_id,user_id) references public.tags(id,user_id) on delete cascade);
create index attachments_parent on public.ritm_attachments(ritm_id,position);
create index checklist_parent on public.ritm_checklist_items(ritm_id,position);
create index logs_parent on public.ritm_activity_logs(ritm_id,created_at desc);
create index tags_owner on public.ritm_tags(user_id);
do $$ declare t text; begin foreach t in array array['ritms','ritm_attachments','ritm_checklist_items','tags','ritm_tags'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy owner_access on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',t);
 execute format('grant select, insert, update, delete on public.%I to authenticated',t);
 execute format('revoke all on public.%I from anon',t);
 end loop; end $$;
alter table public.ritm_activity_logs enable row level security;
create policy owner_read on public.ritm_activity_logs for select to authenticated using((select auth.uid())=user_id);
revoke all on public.ritm_activity_logs from anon, authenticated;
grant select on public.ritm_activity_logs to authenticated;
create function public.ritm_before_write() returns trigger language plpgsql set search_path = '' as $$ begin
 new.updated_at=now();
 if tg_op='INSERT' then new.created_at=now(); new.completed_at=case when new.status='Concluída' then now() else null end;
 else new.created_at=old.created_at; if new.user_id<>old.user_id then raise exception 'Owner cannot change'; end if;
 if new.status='Concluída' and old.status<>'Concluída' then new.completed_at=now(); elsif new.status<>'Concluída' then new.completed_at=null; else new.completed_at=old.completed_at; end if; end if;
 return new; end $$;
create trigger ritm_before before insert or update on public.ritms for each row execute function public.ritm_before_write();
create function public.ritm_after_write() returns trigger language plpgsql security definer set search_path = '' as $$ declare label text; tag_name text; tag_uuid uuid; begin
 if tg_op='INSERT' then label='RITM criada'; elsif old.status<>new.status then label='Status: '||old.status||' → '||new.status; elsif old.archived<>new.archived then label=case when new.archived then 'RITM arquivada' else 'RITM restaurada' end; else label='RITM atualizada'; end if;
 insert into public.ritm_activity_logs(user_id,ritm_id,action) values(new.user_id,new.id,label);
 delete from public.ritm_tags where ritm_id=new.id;
 foreach tag_name in array new.tags loop
 insert into public.tags(user_id,name) values(new.user_id,tag_name) on conflict(user_id,name) do update set name=excluded.name returning id into tag_uuid;
 insert into public.ritm_tags(ritm_id,tag_id,user_id) values(new.id,tag_uuid,new.user_id) on conflict do nothing;
 end loop; return new; end $$;
create trigger ritm_after after insert or update on public.ritms for each row execute function public.ritm_after_write();
revoke all on function public.ritm_before_write(), public.ritm_after_write() from public;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ritm-evidence','ritm-evidence',false,10485760,array['image/png','image/jpeg','image/webp']);
create policy evidence_owner on storage.objects for all to authenticated using(bucket_id='ritm-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='ritm-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.ritms where id::text=(storage.foldername(name))[2] and user_id=(select auth.uid())));
commit;

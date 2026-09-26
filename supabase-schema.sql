-- ============================================================================
-- AnimeTier Maker — esquema SQL para Supabase (v2, corregido)
-- ============================================================================
-- Corrección sobre la v1: en tu base de datos "tierlists.id" es de tipo
-- TEXT (no uuid), así que las claves foráneas que apuntan a tierlists(id)
-- tienen que ser TEXT también — por eso falló el script anterior.
--
-- Este script es SEGURO DE RE-EJECUTAR las veces que haga falta: usa
-- "if not exists" en las tablas y "drop policy if exists" antes de cada
-- política, así que si algo ya existe (tus tablas de chat, por ejemplo)
-- simplemente no se toca / se reemplaza la política por la misma.
--
-- Pégalo entero en Supabase → SQL Editor → Run.
-- ============================================================================


-- ============================================================================
-- 0) Columna nueva en profiles para el marco de avatar equipado
--    (niveles y marcos son una función nueva — ver js/features/levels.js)
-- ============================================================================
alter table profiles add column if not exists avatar_frame text default 'none';


-- ============================================================================
-- 1) CHAT — chats / chat_members / messages
--    Estas tablas YA EXISTEN en tu proyecto (nos pasaste el esquema), así
--    que "create table if not exists" no las toca. Lo que casi seguro
--    faltaba son las POLÍTICAS RLS: si activaste "Row Level Security" en
--    estas tablas mostrando el escudo en Supabase pero nunca añadiste
--    políticas, Supabase deniega todo por defecto y en el cliente eso se
--    ve como "no pasa nada, el chat está vacío / no se puede enviar" sin
--    ningún error visible. Esto es lo más probable que estaba rompiendo
--    el chat.
-- ============================================================================

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  name text,
  is_group boolean default false,
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists chat_members (
  chat_id uuid references chats(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  last_read_at timestamptz default now(),
  primary key (chat_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references chats(id) on delete cascade not null,
  sender_id uuid references profiles(id) not null,
  content text not null,
  created_at timestamptz default now()
);

alter table chats enable row level security;
alter table chat_members enable row level security;
alter table messages enable row level security;

-- ----------------------------------------------------------------------------
-- LIMPIEZA TOTAL — si sigues viendo "infinite recursion detected in policy
-- for relation chat_members" después de la corrección anterior, es casi
-- seguro que queda alguna política vieja con OTRO nombre que no se borró
-- (drop policy if exists solo borra por nombre exacto). Esto borra
-- ABSOLUTAMENTE TODAS las políticas de estas 3 tablas, sea cual sea su
-- nombre u origen, antes de crear las correctas desde cero.
-- ----------------------------------------------------------------------------
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where tablename='chat_members' and schemaname='public' loop
    execute format('drop policy if exists %I on public.chat_members', pol.policyname);
  end loop;
  for pol in select policyname from pg_policies where tablename='chats' and schemaname='public' loop
    execute format('drop policy if exists %I on public.chats', pol.policyname);
  end loop;
  for pol in select policyname from pg_policies where tablename='messages' and schemaname='public' loop
    execute format('drop policy if exists %I on public.messages', pol.policyname);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- FUNCIÓN AUXILIAR — evita el bug de "recursión infinita" en las políticas.
-- Una política de SELECT en chat_members que vuelve a consultar chat_members
-- dentro de su propia condición hace que Postgres tenga que re-evaluar esa
-- misma política para poder evaluarla → recursión infinita → Supabase
-- rechaza la consulta con "infinite recursion detected in policy for
-- relation chat_members". Al marcar la función como SECURITY DEFINER, la
-- consulta interna se ejecuta sin pasar otra vez por RLS, rompiendo el bucle.
-- ----------------------------------------------------------------------------
create or replace function is_chat_member(p_chat_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists(select 1 from chat_members where chat_id = p_chat_id and user_id = p_user_id);
$$;

drop policy if exists "miembros ven sus chats" on chats;
create policy "miembros ven sus chats" on chats for select
  using (is_chat_member(id, auth.uid()));

drop policy if exists "cualquiera logueado crea chats" on chats;
create policy "cualquiera logueado crea chats" on chats for insert
  with check (auth.uid() is not null);

drop policy if exists "miembros actualizan sus chats" on chats;
create policy "miembros actualizan sus chats" on chats for update
  using (is_chat_member(id, auth.uid()));

drop policy if exists "ves las membresías de tus chats" on chat_members;
create policy "ves las membresías de tus chats" on chat_members for select
  using (is_chat_member(chat_id, auth.uid()));

drop policy if exists "te añades o añades a otros a un chat" on chat_members;
create policy "te añades o añades a otros a un chat" on chat_members for insert
  with check (auth.uid() is not null);

drop policy if exists "actualizas tu propia membresía" on chat_members;
create policy "actualizas tu propia membresía" on chat_members for update
  using (user_id = auth.uid());

drop policy if exists "miembros ven los mensajes de su chat" on messages;
create policy "miembros ven los mensajes de su chat" on messages for select
  using (is_chat_member(chat_id, auth.uid()));

drop policy if exists "miembros envían mensajes a su chat" on messages;
create policy "miembros envían mensajes a su chat" on messages for insert
  with check (sender_id = auth.uid() and is_chat_member(chat_id, auth.uid()));

create index if not exists idx_chat_members_user on chat_members(user_id);
create index if not exists idx_messages_chat on messages(chat_id, created_at);


-- ============================================================================
-- 2) NOTIFICACIONES genéricas (comentarios, etc.)
--    tierlist_id es TEXT porque tierlists.id lo es en tu base de datos.
-- ============================================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,   -- destinatario
  actor_id uuid references profiles(id) on delete set null,          -- quién la generó
  type text not null,                                                -- 'comment', 'friend_accept', ...
  tierlist_id text references tierlists(id) on delete cascade,
  message text,
  read boolean default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;

drop policy if exists "solo ves tus notificaciones" on notifications;
create policy "solo ves tus notificaciones" on notifications for select
  using (user_id = auth.uid());

drop policy if exists "cualquiera logueado puede crear una notificación" on notifications;
create policy "cualquiera logueado puede crear una notificación" on notifications for insert
  with check (auth.uid() is not null);

drop policy if exists "marcas tus notificaciones como leídas" on notifications;
create policy "marcas tus notificaciones como leídas" on notifications for update
  using (user_id = auth.uid());

create index if not exists idx_notifications_user on notifications(user_id, created_at desc);


-- ============================================================================
-- 3) COMENTARIOS en tierlists (solo visibles en el modo Visor de la app)
-- ----------------------------------------------------------------------------
-- IMPORTANTE — corregido: "tierlists" es la plantilla COMPARTIDA (p.ej. la
-- "Waifus" que usa todo el mundo por defecto), así que dos personas
-- distintas rankeando la MISMA plantilla tienen el MISMO tierlist_id. Si
-- los comentarios se guardaran por tierlist_id, tu comentario en la
-- tierlist de tu amigo aparecería también en la tuya (justo el bug que
-- viste). Lo correcto es guardarlos por ranking_id: el ID único de CADA
-- ranking personal (tabla user_rankings), que sí es distinto para cada
-- persona aunque compartan la misma plantilla.
-- ============================================================================

drop table if exists tierlist_comments cascade;

create table tierlist_comments (
  id uuid primary key default gen_random_uuid(),
  ranking_id uuid references user_rankings(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null check (char_length(content) <= 500),
  created_at timestamptz default now()
);

alter table tierlist_comments enable row level security;

create policy "cualquiera logueado puede leer comentarios" on tierlist_comments for select
  using (true);

create policy "cualquiera logueado puede comentar" on tierlist_comments for insert
  with check (auth.uid() = user_id);

create policy "solo borras tus propios comentarios" on tierlist_comments for delete
  using (auth.uid() = user_id);

create index idx_comments_ranking on tierlist_comments(ranking_id, created_at);


-- ============================================================================
-- 4) REACCIONES con emoji en tierlists (modo Visor)
--    Mismo arreglo que los comentarios: por ranking_id, no por tierlist_id.
-- ============================================================================

drop table if exists tierlist_reactions cascade;

create table tierlist_reactions (
  id uuid primary key default gen_random_uuid(),
  ranking_id uuid references user_rankings(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique(ranking_id, user_id) -- una reacción por usuario y ranking (se puede cambiar)
);

alter table tierlist_reactions enable row level security;

create policy "cualquiera logueado puede leer reacciones" on tierlist_reactions for select
  using (true);

create policy "cualquiera logueado puede reaccionar" on tierlist_reactions for insert
  with check (auth.uid() = user_id);

create policy "actualizas tu propia reacción" on tierlist_reactions for update
  using (auth.uid() = user_id);

create policy "borras tu propia reacción" on tierlist_reactions for delete
  using (auth.uid() = user_id);

create index idx_reactions_ranking on tierlist_reactions(ranking_id);


-- ============================================================================
-- 5) Realtime — para que el chat y las notificaciones lleguen al instante.
--    Puede fallar con "already member of publication" si ya estaba
--    activado; en ese caso ignora ese error concreto y sigue con el resto
--    a mano, línea por línea, si hace falta.
-- ============================================================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table friendships;

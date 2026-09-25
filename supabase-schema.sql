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

drop policy if exists "miembros ven sus chats" on chats;
create policy "miembros ven sus chats" on chats for select
  using (exists (select 1 from chat_members m where m.chat_id = id and m.user_id = auth.uid()));

drop policy if exists "cualquiera logueado crea chats" on chats;
create policy "cualquiera logueado crea chats" on chats for insert
  with check (auth.uid() is not null);

drop policy if exists "miembros actualizan sus chats" on chats;
create policy "miembros actualizan sus chats" on chats for update
  using (exists (select 1 from chat_members m where m.chat_id = id and m.user_id = auth.uid()));

drop policy if exists "ves las membresías de tus chats" on chat_members;
create policy "ves las membresías de tus chats" on chat_members for select
  using (exists (select 1 from chat_members m2 where m2.chat_id = chat_members.chat_id and m2.user_id = auth.uid()));

drop policy if exists "te añades o añades a otros a un chat" on chat_members;
create policy "te añades o añades a otros a un chat" on chat_members for insert
  with check (auth.uid() is not null);

drop policy if exists "actualizas tu propia membresía" on chat_members;
create policy "actualizas tu propia membresía" on chat_members for update
  using (user_id = auth.uid());

drop policy if exists "miembros ven los mensajes de su chat" on messages;
create policy "miembros ven los mensajes de su chat" on messages for select
  using (exists (select 1 from chat_members m where m.chat_id = messages.chat_id and m.user_id = auth.uid()));

drop policy if exists "miembros envían mensajes a su chat" on messages;
create policy "miembros envían mensajes a su chat" on messages for insert
  with check (
    sender_id = auth.uid() and
    exists (select 1 from chat_members m where m.chat_id = messages.chat_id and m.user_id = auth.uid())
  );

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
--    tierlist_id también es TEXT, igual que arriba.
-- ============================================================================

create table if not exists tierlist_comments (
  id uuid primary key default gen_random_uuid(),
  tierlist_id text references tierlists(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null check (char_length(content) <= 500),
  created_at timestamptz default now()
);

alter table tierlist_comments enable row level security;

drop policy if exists "cualquiera logueado puede leer comentarios" on tierlist_comments;
create policy "cualquiera logueado puede leer comentarios" on tierlist_comments for select
  using (true);

drop policy if exists "cualquiera logueado puede comentar" on tierlist_comments;
create policy "cualquiera logueado puede comentar" on tierlist_comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "solo borras tus propios comentarios" on tierlist_comments;
create policy "solo borras tus propios comentarios" on tierlist_comments for delete
  using (auth.uid() = user_id);

create index if not exists idx_comments_tierlist on tierlist_comments(tierlist_id, created_at);


-- ============================================================================
-- 4) Realtime — para que el chat y las notificaciones lleguen al instante.
--    Puede fallar con "already member of publication" si ya estaba
--    activado; en ese caso ignora ese error concreto y sigue con el resto
--    a mano, línea por línea, si hace falta.
-- ============================================================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table friendships;

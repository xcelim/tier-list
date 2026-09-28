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

-- Portada personalizada de una tierlist (rediseño de "Mis Tierlists" con
-- tarjetas horizontales — el creador puede subir una foto de portada).
alter table tierlists add column if not exists cover_url text;


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

-- ----------------------------------------------------------------------------
-- FIX (Ronda 11) — el error real de "new row violates row-level security
-- policy for table chats" al abrir un chat por primera vez.
--
-- La política de INSERT (with_check=true) SIEMPRE fue correcta — por eso el
-- diagnóstico con pg_policies no encontraba nada raro. El problema real es
-- otro, más sutil: el código del cliente hace
--   sbClient.from('chats').insert({...}).select().single()
-- y ese ".select()" le pide a Postgres el "RETURNING *" de la fila recién
-- creada. Cuando RLS está activo, Postgres también exige que esa fila
-- devuelta cumpla la política de SELECT — y la política de SELECT era
-- "is_chat_member(id, auth.uid())", que en ese preciso instante da FALSE,
-- porque la fila en chat_members que te convierte en miembro de ese chat
-- todavía no existe (se crea en el paso SIGUIENTE, justo después). Postgres
-- entonces rechaza la operación entera con el mismo mensaje genérico de
-- RLS, aunque la política de INSERT nunca falló.
--
-- La solución: guardar quién creó el chat (created_by) y dejar que el
-- creador también pueda "verse a sí mismo" antes de que exista su fila de
-- membresía.
-- ----------------------------------------------------------------------------
alter table chats add column if not exists created_by uuid references profiles(id);

drop policy if exists "miembros ven sus chats" on chats;
create policy "miembros ven sus chats" on chats for select
  using (is_chat_member(id, auth.uid()) or created_by = auth.uid());

drop policy if exists "cualquiera logueado crea chats" on chats;
create policy "cualquiera logueado crea chats" on chats for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "miembros actualizan sus chats" on chats;
create policy "miembros actualizan sus chats" on chats for update
  using (is_chat_member(id, auth.uid()) or created_by = auth.uid());

-- ----------------------------------------------------------------------------
-- NUEVO (Ronda 12) — borrar chats/grupos desde el menú de "..." del chat.
-- Un chat privado lo puede borrar cualquiera de los dos (created_by puede
-- ser NULL en chats muy antiguos, así que para privados no dependemos solo
-- de eso). Un GRUPO solo lo puede borrar entero quien lo creó — el resto de
-- miembros usan "Salir del grupo", que solo borra SU PROPIA fila de
-- chat_members (no afecta al grupo para los demás).
-- ----------------------------------------------------------------------------
drop policy if exists "borras el chat si eres el creador o es un privado tuyo" on chats;
create policy "borras el chat si eres el creador o es un privado tuyo" on chats for delete
  using (
    created_by = auth.uid()
    or (is_group = false and is_chat_member(id, auth.uid()))
  );

drop policy if exists "sales de un chat borrando tu propia membresía" on chat_members;
create policy "sales de un chat borrando tu propia membresía" on chat_members for delete
  using (user_id = auth.uid());

drop policy if exists "ves las membresías de tus chats" on chat_members;
create policy "ves las membresías de tus chats" on chat_members for select
  using (is_chat_member(chat_id, auth.uid()));

drop policy if exists "te añades o añades a otros a un chat" on chat_members;
create policy "te añades o añades a otros a un chat" on chat_members for insert
  to authenticated
  with check (true);

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
  to authenticated
  with check (true);

drop policy if exists "marcas tus notificaciones como leídas" on notifications;
create policy "marcas tus notificaciones como leídas" on notifications for update
  using (user_id = auth.uid());

-- FIX (Ronda 37 — "le doy a borrar leídas pero si cierro y vuelvo a abrir
-- notis vuelven a salir"): faltaba esta política de DELETE. Sin ella, RLS
-- bloquea CUALQUIER borrado por defecto (no hay política = no hay permiso),
-- así que el "delete" de la app fallaba en la nube en silencio — parecía
-- funcionar porque se quitaban de la pantalla al momento, pero seguían
-- existiendo en Supabase, y volvían a aparecer en el siguiente fetch (al
-- reabrir el panel, o al cerrar y abrir la app).
drop policy if exists "borras tus propias notificaciones" on notifications;
create policy "borras tus propias notificaciones" on notifications for delete
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
-- 5) TIERLISTS COLABORATIVAS
-- ----------------------------------------------------------------------------
-- Hasta ahora cada "user_rankings" es SOLO tuyo (fila única por
-- user_id+tierlist_id). Para que una tierlist pueda editarse en conjunto con
-- amigos, se añaden dos columnas: "is_collaborative" (marca esa fila como
-- compartida) y "collaborators" (la lista de user_id de tus amigos con
-- permiso para verla y editarla). La fila sigue siendo UNA sola — la tuya —
-- y tus amigos leen/escriben esa MISMA fila (no crean la suya propia para
-- esa tierlist), así que los cambios de cualquiera son "conjuntos" de
-- verdad y llegan a todos en tiempo real vía Realtime (sección 6).
-- ============================================================================
alter table user_rankings add column if not exists is_collaborative boolean default false;
alter table user_rankings add column if not exists collaborators uuid[] default '{}';

create index if not exists idx_user_rankings_collaborators on user_rankings using gin(collaborators);

alter table user_rankings enable row level security;

-- Limpieza total de políticas viejas de user_rankings, por si ya existían
-- unas más restrictivas de antes de que existiera este archivo (mismo
-- problema que tuvimos con chat_members: una política vieja con otro
-- nombre puede seguir bloqueando aunque creemos las nuevas).
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where tablename='user_rankings' and schemaname='public' loop
    execute format('drop policy if exists %I on public.user_rankings', pol.policyname);
  end loop;
end $$;

-- Cualquiera logueado puede LEER cualquier ranking (hace falta para ver el
-- perfil/tierlists de otros usuarios y para el modo Visor, que ya
-- funcionaban antes de este script).
create policy "cualquiera logueado lee rankings" on user_rankings for select
  to authenticated
  using (true);

-- Insertas o actualizas tu propia fila, O actualizas una fila ajena en la
-- que te han añadido como colaborador de una tierlist colaborativa.
create policy "creas tu propio ranking" on user_rankings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "actualizas tu ranking o uno colaborativo compartido contigo" on user_rankings for update
  to authenticated
  using (auth.uid() = user_id or (is_collaborative = true and auth.uid() = any(collaborators)))
  with check (auth.uid() = user_id or (is_collaborative = true and auth.uid() = any(collaborators)));

create policy "borras tu propio ranking" on user_rankings for delete
  to authenticated
  using (auth.uid() = user_id);


-- ============================================================================
-- 6) Realtime — para que el chat y las notificaciones lleguen al instante.
--    Envuelto en bloques DO con manejo de excepción porque si la tabla ya
--    estaba añadida a la publicación (como te pasó), Postgres da error en
--    vez de ignorarlo silenciosamente. Así es seguro re-ejecutar esto
--    las veces que haga falta.
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table friendships;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table user_rankings;
exception when duplicate_object then null;
end $$;

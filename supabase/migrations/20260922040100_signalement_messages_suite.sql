-- Suite de 20260922040000 : utilise la valeur d'énumération 'message' tout
-- juste ajoutée, donc dans une exécution séparée.

alter table reports add column message_id uuid references messages (id) on delete cascade;

alter table reports drop constraint reports_target_matches_type;
alter table reports add constraint reports_target_matches_type check (
  (target_type = 'deal' and deal_id is not null and comment_id is null and merchant_id is null and message_id is null)
  or (target_type = 'comment' and comment_id is not null and deal_id is null and merchant_id is null and message_id is null)
  or (target_type = 'merchant' and merchant_id is not null and deal_id is null and comment_id is null and message_id is null)
  or (target_type = 'message' and message_id is not null and deal_id is null and comment_id is null and merchant_id is null)
);

create unique index reports_unique_message_reporter
  on reports (reporter_id, message_id) where message_id is not null;

-- ---------------------------------------------------------------------------
-- Lecture admin des messages — strictement limitée à ceux signalés
-- ---------------------------------------------------------------------------
-- Une politique large (« is_admin() » seul) donnerait à l'administrateur une
-- lecture de TOUTE la messagerie privée, à tout moment. On la restreint à
-- l'existence d'un signalement : l'admin ne voit un message que si quelqu'un
-- l'a explicitement signalé, jamais en se promenant dans les conversations.

create policy "messages_admin_select_reported" on messages for select using (
  is_admin()
  and exists (select 1 from reports where reports.message_id = messages.id)
);

create policy "messages_admin_delete_reported" on messages for delete using (
  is_admin()
  and exists (select 1 from reports where reports.message_id = messages.id)
);

-- Let a signed-in user cancel their own pending email change.
--
-- Supabase/GoTrue exposes no public API to abort an in-flight email change.
-- With "Secure email change" on, a change stays pending in auth.users (surfaced
-- to the app as user.new_email) until BOTH the current- and new-address
-- confirmation links are clicked. If the user abandons it, nothing clears it,
-- so the Settings UI would show "pending" indefinitely. This DEFINER function
-- clears the GoTrue email-change columns for the caller (auth.uid()) ONLY,
-- giving the app a deterministic Cancel. It couples to GoTrue-internal columns
-- by necessity; the write is strictly scoped to the caller's own row.
create or replace function public.cancel_email_change()
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  update auth.users
  set email_change = '',
      email_change_token_new = '',
      email_change_token_current = '',
      email_change_confirm_status = 0,
      email_change_sent_at = null
  where id = auth.uid();
end;
$$;

revoke execute on function public.cancel_email_change() from public, anon;
grant execute on function public.cancel_email_change() to authenticated;

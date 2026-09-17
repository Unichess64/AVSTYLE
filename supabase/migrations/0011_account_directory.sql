-- Linking an operator to an account needs auth.users ids, which the
-- application role cannot read. Spec §9.9.
--
-- Returns ONLY id and email — never a password hash, never a token — and
-- returns nothing unless the caller is an active operator, because
-- security definer otherwise hands auth.users to anyone who can call it.

create function public.list_auth_accounts()
returns table (id uuid, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_active_operator() then
    return;
  end if;

  return query
    select u.id, u.email::text
    from auth.users u
    order by u.email;
end
$$;

revoke execute on function public.list_auth_accounts() from public, anon;
grant execute on function public.list_auth_accounts() to authenticated;

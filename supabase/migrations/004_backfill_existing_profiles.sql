-- RewardNova — Backfill profiles for users who already existed in auth.users

insert into public.user_profiles (id, display_name)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'display_name',
    split_part(coalesce(u.email, 'member'), '@', 1)
  )
from auth.users u
left join public.user_profiles p on p.id = u.id
where p.id is null;

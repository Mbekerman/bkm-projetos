-- INSERT ... RETURNING must read the owner's NEW row directly. The STABLE
-- membership helper queries a snapshot that cannot yet see that inserted row.
alter policy projects_read on public.projects to authenticated
 using(owner_id=(select auth.uid()) or bkm_private.can_access_project(id));

-- Additive: existing point annotations keep their data and behavior.
alter table public.document_annotations
 add column kind text not null default 'pin' check(kind in ('pin','freehand','arrow','line','rectangle','ellipse','callout','text')),
 add column geometry jsonb not null default '{}'::jsonb,
 add column stroke_color text not null default '#b3261e' check(stroke_color ~ '^#[0-9a-fA-F]{6}$'),
 add column stroke_width smallint not null default 3 check(stroke_width between 1 and 8),
 add column font_size smallint not null default 18 check(font_size in (14,18,24,32));

create function bkm_private.validate_annotation_geometry() returns trigger
language plpgsql set search_path='' as $$
declare p jsonb; total integer;
begin
 if new.kind='pin' then
  if new.geometry<>'{}'::jsonb then raise exception 'Geometria inválida.' using errcode='23514';end if;
  return new;
 end if;
 if jsonb_typeof(new.geometry)<>'object' or jsonb_typeof(new.geometry->'points') is distinct from 'array' or (new.geometry - 'points')<>'{}'::jsonb then raise exception 'Geometria inválida.' using errcode='23514';end if;
 total=jsonb_array_length(new.geometry->'points');
 if (new.kind='text' and total<>1) or (new.kind='freehand' and total not between 2 and 1000) or (new.kind not in ('text','freehand') and total<>2) then raise exception 'Quantidade de pontos inválida.' using errcode='23514';end if;
 for p in select value from jsonb_array_elements(new.geometry->'points') loop
  if jsonb_typeof(p)<>'object' or (p - 'x' - 'y')<>'{}'::jsonb or jsonb_typeof(p->'x') is distinct from 'number' or jsonb_typeof(p->'y') is distinct from 'number' then raise exception 'Ponto inválido.' using errcode='23514';end if;
  if (p->>'x')::numeric not between 0 and 1 or (p->>'y')::numeric not between 0 and 1 then raise exception 'Ponto fora da prancha.' using errcode='23514';end if;
 end loop;
 if (new.geometry->'points'->0->>'x')::double precision<>new.x or (new.geometry->'points'->0->>'y')::double precision<>new.y then raise exception 'Origem divergente.' using errcode='23514';end if;
 return new;
end $$;
revoke all on function bkm_private.validate_annotation_geometry() from public,anon,authenticated;
create trigger annotations_geometry before insert on public.document_annotations for each row execute function bkm_private.validate_annotation_geometry();
grant insert(kind,geometry,stroke_color,stroke_width,font_size) on public.document_annotations to authenticated;

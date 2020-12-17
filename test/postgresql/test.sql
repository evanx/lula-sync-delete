drop table lula_sync_stream
;

create table lula_sync_stream (
  lula_sync_stream_id serial primary key,
  redis_stream_key varchar(64) unique not null,
  redis_host_key varchar(128) unique not null,
  last_id varchar(32),
  _enabled boolean default false,
  _updated timestamp not null default now()
)
;

insert into lula_sync_stream (
  redis_host_key,
  redis_stream_key
) values (
  'localhost',
  'lula-sync:test:x'
)
;

update lula_sync_stream
set redis_host_key = 'localhost',
_enabled = true
;

select * from lula_sync_stream
;

select * from lula_sync_stream
where redis_host_key = 'localhost'
and _enabled = true
;

;

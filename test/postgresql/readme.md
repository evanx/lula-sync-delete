# test postgresql instance 

## bootstrap

### postgresql

```
docker-compose up
```

See https://github.com/evanx/lula-sync/blob/main/test/postgresql/test.sql

### redis

```
xgroup create lula-sync:test:x lula-sync-group $
```

```
xgroup setid lula-sync:test:x lula-sync-group $
```

```
xadd lula-sync:test:x '*' payload '{}'
```

```
xpending lula-sync:test:x lula-sync-group
```

```
xpending lula-sync:test:x lula-sync-group - + 1
```

```
xclaim lula-sync:test:x lula-sync-group client-2 8000 0
```

```
xreadgroup group lula-sync-group client-1 streams lula-sync:test:x >
```


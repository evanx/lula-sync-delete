const assert = require('assert')

module.exports = async (app) => {
  const { config, logger, redis, blockingRedis, pg } = app
  const mutables = {}
  const redisTimeRes = await redis.time()
  const redisTime = parseInt(redisTimeRes[0])
  const streamsRes = await pg.query(
    'select * from lula_sync_stream where _enabled = true and redis_host_key = $1',
    [config.redis.hostKey],
  )
  const streamRows = streamsRes.rows
  assert.strictEqual(streamRows.length, 1, 'streamRows.length')
  const { redis_stream_key: streamKey } = streamRows[0]
  const { consumerGroup } = config.redis
  const xreadgroupArgs = [
    'group',
    consumerGroup,
    app.instanceId,
    'count',
    config.redis.readCount,
    'block',
    config.redis.readBlock,
    'streams',
    streamKey,
    '>',
  ]
  logger.info({ redisTime, streamKey, consumerGroup, xreadgroupArgs }, 'sync')

  const claimItem = async () => {
    const pendingRes = await redis.xpending(streamKey, consumerGroup)
    if (pendingRes[0]) {
      const timestamp = parseInt(pendingRes[1])
      if (app.clock() - timestamp > config.claim.minIdleTime) {
        const claimRes = await redis.xclaim(
          streamKey,
          consumerGroup,
          app.instanceId,
          config.claim.minIdleTime,
          pendingRes[1],
        )
        if (claimRes.length) {
          assert.strictEqual(claimRes.length, 1, 'claimRes.length')
          return claimRes[0]
        }
      }
    }
  }

  const syncItem = async (item) => {
    assert.strictEqual(item.length, 2, 'syncItem')
    const [itemId, data] = item
    logger.info({ itemId }, 'syncItem')
    await redis.xack(streamKey, consumerGroup, itemId)
  }

  return {
    async start() {
      mutables.timeout = setTimeout(async () => {
        if (process.env.NODE_ENV === 'development') {
          redis.xadd('lula-sync:test:x', '*', 'payload', '{}')
        }
      }, 2000)
      mutables.interval = setInterval(async () => {
        if (mutables.claimed) {
          return
        }
        try {
          const claimedItem = await claimItem()
          logger.debug({ claimedItem }, 'claimed')
          if (claimedItem) {
            const claimedId = claimedItem[0]
            if (mutables.claimedItem) {
              logger.warn({ claimedId }, 'claimed')
            } else {
              logger.info({ claimedId }, 'claimed')
              mutables.claimedItem = claimedItem
            }
          }
        } catch (err) {
          app.exit('sync interval', err)
        }
      }, config.claim.interval)
    },
    async end() {
      logger.info('end')
    },
    async loop() {
      if (mutables.claimed) {
        await syncItem(mutables.claimed)
      }
      const readRes = await blockingRedis.xreadgroup(...xreadgroupArgs)
      if (readRes) {
        const item = readRes[0][1][0]
        logger.info({ item }, 'xreadgroup')
        await syncItem(item)
      }
    },
  }
}

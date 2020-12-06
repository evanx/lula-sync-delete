const config = require('config')
const httpServer = require('http').createServer()
const pino = require('pino')
const Redis = require('ioredis')
const { Client } = require('pg')
const { logger } = require('../config/default')

module.exports = async (start) => {

  if (config.logger.prettifierInspector) {
    config.logger.prettifier = require('pino-inspector')
  }
  
  if (process.env.TEST_ERROR === 'connect-redis') {
    throw new Error(`TEST_ERROR: ${process.env.TEST_ERROR}`)
  }  

  const app = {
    config,
    redis: new Redis(config.redis),
    pg: new Client(config.postgresql),
    httpServer,
    logger: pino(config.logger),
    clock: () => Date.now(),
  }

  Object.assign(app, require('./utils')(config))

  await app.multiAsync(app.redis, [
    ['hincrby', 'meter:upDownCounter:h', 'restart', 1],
  ])

  app.exit = async (source, err) => {
    app.logger.error({ err, source }, 'Exit app')
    app.redis.end()
  }

  if (config.http && config.http.disabled != 'true') {
    httpServer.listen(parseInt(config.http.port), () => {
      app.logger.info(`HTTP server listening on port ${config.http.port}`)
    })
  }

  try {
    if (process.env.TEST_ERROR === 'connect-postgresql') {
      throw new Error(`TEST_ERROR: ${process.env.TEST_ERROR}`)
    }  
    await app.pg.connect()
    const res = await app.pg.query('SELECT $1::text as message', ['Test PostgreSQL connection'])
    app.logger.info(res.rows[0].message)
    if (process.env.TEST_ERROR === 'start') {
      throw new Error(`TEST_ERROR: ${process.env.TEST_ERROR}`)
    }  
    await start(app)
  } catch (err) {
    app.exit('setup', err)
  }
}

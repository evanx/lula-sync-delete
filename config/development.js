module.exports = {
  logger: {
    level: 'debug',
    prettyPrint: true,
    base: {
      hostname: null,
    },
  },
  redis: {
    url: 'redis://localhost:6379',
  },
  postgresql: {
    connectionString: 'postgresql://app:password@localhost:5432/lula',
  },
}

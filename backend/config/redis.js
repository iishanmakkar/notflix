const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.connecting = null;
    this.isDisconnecting = false;
  }

  createClient() {
    const client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 10_000,
        keepAlive: true,
        reconnectStrategy: (retries) => Math.min(100 * 2 ** Math.min(retries, 5), 3_000),
      },
    });

    client.on('error', (error) => {
      // node-redis reconnects automatically after transient socket closures.
      // Keep those recoverable events visible without presenting them as a fatal outage.
      const level = error?.name === 'SocketClosedUnexpectedlyError' ? 'warn' : 'error';
      console[level](`Redis client ${level}:`, error.message);
    });

    client.on('connect', () => console.log('✅ Redis connected successfully'));
    client.on('ready', () => console.log('🚀 Redis client ready'));
    client.on('reconnecting', () => console.warn('Redis reconnecting...'));
    client.on('end', () => {
      if (!this.isDisconnecting) console.warn('Redis connection ended');
    });

    return client;
  }

  async connect() {
    if (this.client?.isReady) return this.client;
    if (this.connecting) return this.connecting;

    if (!this.client || !this.client.isOpen) this.client = this.createClient();
    this.isDisconnecting = false;

    this.connecting = this.client.connect()
      .then(() => this.client)
      .catch((error) => {
        console.error('❌ Redis connection failed:', error.message);
        throw error;
      })
      .finally(() => {
        this.connecting = null;
      });

    return this.connecting;
  }

  async disconnect() {
    if (!this.client?.isOpen) return;

    this.isDisconnecting = true;
    try {
      await this.client.quit();
    } catch (error) {
      // A socket can close between the readiness check and QUIT during shutdown.
      this.client.destroy();
      if (error?.name !== 'SocketClosedUnexpectedlyError') throw error;
    }
  }

  getClient() {
    return this.client;
  }

  isReady() {
    return Boolean(this.client?.isReady);
  }
}

module.exports = new RedisClient();

const redisClient = require("../config/redis");

async function getClient() {
  if (!redisClient.isReady()) {
    return null;
  }
  return redisClient.getClient();
}

module.exports = {
  async setEx(key, ttl, value) {
    const client = await getClient();
    if (!client) return null;
    return client.set(key, value, { EX: Math.max(1, Math.ceil(ttl)) });
  },
  async get(key) {
    const client = await getClient();
    if (!client) return null;
    return client.get(key);
  },
};

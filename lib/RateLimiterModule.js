import { AbstractModule } from 'adapt-authoring-core';
import { RateLimiterMongo } from 'rate-limiter-flexible';

export default class RateLimiterModule extends AbstractModule {
  /** @override */
  async init() {
    const mongodb = await this.app.waitForModule('mongodb');
    const { db } = await mongodb.getStats();
    this.rateLimiter = new RateLimiterMongo({
      storeClient: mongodb.client,
      dbName: db,
      keyPrefix: 'ratelimiter',
      points: this.getConfig('apiRequestLimit'),
      duration: this.getConfig('apiRequestLimitDuration'),
    });
    const server = await this.app.waitForModule('server');
    server.api.addMiddleware(this.middleware());
  }
  /**
   * Limits the number of requests that can be made to the API
   * @return {Function} An Express.js request handler
   */
  middleware() {
    return async (req, res, next) => {
      try {
        const data = await this.rateLimiter.consume(req.ip);
        res.set({
          "Retry-After": data.msBeforeNext/1000,
          "X-RateLimit-Limit": this.getConfig('apiRequestLimit'),
          "X-RateLimit-Remaining": data.remainingPoints,
          "X-RateLimit-Reset": new Date(Date.now()+data.msBeforeNext)
        });
        next();
      } catch(e) {
        res.sendError(this.app.errors.RATE_LIMIT_EXCEEDED);
      }
    };
  }
}
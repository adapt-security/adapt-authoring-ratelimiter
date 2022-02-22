import { AbstractModule } from 'adapt-authoring-core';
import { RateLimiterRedis } from 'rate-limiter-flexible';

export default class RateLimiterModule extends AbstractModule {
  /** @override */
  async init() {
    this.rateLimiter = new RateLimiterRedis({
      points: getConfig('apiRequestLimit'),
      duration: 1,
    });
    const server = await this.app.waitForModule('server');
    server.api.addMiddleware(this.middleware());
  }
  /**
   * Limits the number of requests that can be made to the API
   * @return {Function} An Express.js request handler
   */
  middleware() {
    return (req, res, next) => {
      await this.rateLimiter.consume(req.ip)
        .then(next)
        .catch(e => res.status(429).sendError());
    };
  }
}

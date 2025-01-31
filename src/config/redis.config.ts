import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { ConfigService } from '@nestjs/config';
import type { RedisClientOptions } from 'redis';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync<RedisClientOptions>({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get('REDIS_HOST') || 'localhost';
        const port = parseInt(configService.get('REDIS_PORT') || '6379');

        console.log(`Attempting to connect to Redis at ${host}:${port}`);

        return {
          store: redisStore,
          socket: {
            host,
            port,
            reconnectStrategy: (retries: number) => {
              if (retries > 5) {
                console.error('Failed to connect to Redis after 5 attempts');
                return false;
              }
              const delay = Math.min(retries * 100, 3000);
              console.log(`Retrying Redis connection in ${delay}ms...`);
              return delay;
            },
          },
          ttl: 60 * 60,
          max: 100,
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}

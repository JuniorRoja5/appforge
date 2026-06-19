import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';

/**
 * Provides TelegramService to consumers that import this module.
 *
 * NOT @Global by design: explicit imports keep dependencies visible in the
 * module graph and make mocking trivial in tests (a TestingModule that
 * overrides TelegramService only needs the override in the modules that
 * import this one).
 *
 * Does NOT import ConfigModule — ConfigModule.forRoot({ isGlobal: true })
 * in AppModule makes ConfigService injectable everywhere without re-import.
 */
@Module({
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RuntimeConfigService } from './runtime-config.service';
import { RuntimeConfigController } from './runtime-config.controller';

@Module({
  imports: [PrismaModule],
  providers: [RuntimeConfigService],
  controllers: [RuntimeConfigController],
})
export class RuntimeConfigModule {}

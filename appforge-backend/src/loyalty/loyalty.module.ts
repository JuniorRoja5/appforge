import { Module } from '@nestjs/common';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { AppUsersModule } from '../app-users/app-users.module';

@Module({
  imports: [AppUsersModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
})
export class LoyaltyModule {}

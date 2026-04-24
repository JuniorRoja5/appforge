import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { AppUsersModule } from '../app-users/app-users.module';

@Module({
  imports: [AppUsersModule],
  controllers: [UploadController],
})
export class UploadModule {}

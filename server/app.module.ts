
import { Module } from '@nestjs/common';
import { SocialModule } from './services/social/social.module';

@Module({
  imports: [SocialModule],
})
export class AppModule {}

import { Global, Module } from '@nestjs/common';
import { MAILER_SERVICE } from './mailer/mailer.tokens';
import { SmtpMailerService } from './mailer/smtp-mailer.service';
import { STORAGE_SERVICE } from './storage/storage.tokens';
import { LocalDiskStorageService } from './storage/local-disk-storage.service';

@Global()
@Module({
  providers: [
    {
      provide: MAILER_SERVICE,
      useClass: SmtpMailerService,
    },
    {
      provide: STORAGE_SERVICE,
      useClass: LocalDiskStorageService,
    },
  ],
  exports: [MAILER_SERVICE, STORAGE_SERVICE],
})
export class ProvidersModule {}

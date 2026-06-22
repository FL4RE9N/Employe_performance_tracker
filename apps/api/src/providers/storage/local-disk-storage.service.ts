/**
 * LocalDiskStorageService — writes files to the local filesystem.
 *
 * AWS swap point: replace this with an S3 adapter that uses
 * `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`;
 * the IStorageService interface remains unchanged, so no feature
 * code needs to change.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import type { IStorageService, PutResult } from './storage.interface';

@Injectable()
export class LocalDiskStorageService implements IStorageService {
  private readonly storageDir: string;

  constructor(private readonly config: ConfigService) {
    this.storageDir =
      this.config.get<string>('STORAGE_DIR') ||
      path.join(process.cwd(), '.storage');

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async put(key: string, body: Buffer | string, _contentType?: string): Promise<PutResult> {
    const filePath = path.join(this.storageDir, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, body);
    return { url: this.url(key) };
  }

  url(key: string): string {
    return path.join(this.storageDir, key);
  }
}

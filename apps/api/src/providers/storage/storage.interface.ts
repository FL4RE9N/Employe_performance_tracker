export interface PutResult {
  url: string;
}

export interface IStorageService {
  /**
   * Store a file and return its accessible URL (or local path in dev).
   */
  put(key: string, body: Buffer | string, contentType?: string): Promise<PutResult>;

  /**
   * Resolve a key to its URL (or local path) without uploading.
   */
  url(key: string): string;
}

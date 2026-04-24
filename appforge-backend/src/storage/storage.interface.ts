export interface StorageProvider {
  /** Upload a local file to storage. Returns the storage key. */
  upload(key: string, filePath: string, contentType?: string): Promise<string>;

  /** Get a readable stream for the stored object. */
  getStream(key: string): Promise<NodeJS.ReadableStream>;

  /** Download stored object to a local file path. */
  download(key: string, destPath: string): Promise<void>;

  /** Delete an object from storage. */
  delete(key: string): Promise<void>;

  /** Check if an object exists. */
  exists(key: string): Promise<boolean>;

  /** Get the size of a stored object in bytes. */
  getSize(key: string): Promise<number>;
}

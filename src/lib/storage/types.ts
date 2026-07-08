export interface StoredFile {
  buffer: Buffer
  contentType: string
}

export interface StorageProvider {
  upload(key: string, file: Buffer, contentType: string): Promise<void>
  download(key: string): Promise<StoredFile | null>
  delete(key: string): Promise<void>
}

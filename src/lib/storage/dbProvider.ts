import { prisma } from '@/lib/prisma'
import type { StorageProvider, StoredFile } from './types'

// Provider interino: guarda os bytes no Postgres (model DbStorageObject).
// Funciona local e em produção sem configuração externa — ao contrário de
// disco local, que não persiste entre invocações serverless na Vercel.
export class DbStorageProvider implements StorageProvider {
  async upload(key: string, file: Buffer, contentType: string): Promise<void> {
    await prisma.dbStorageObject.upsert({
      where: { key },
      create: { key, data: file, contentType },
      update: { data: file, contentType },
    })
  }

  async download(key: string): Promise<StoredFile | null> {
    const obj = await prisma.dbStorageObject.findUnique({ where: { key } })
    if (!obj) return null
    return { buffer: Buffer.from(obj.data), contentType: obj.contentType }
  }

  async delete(key: string): Promise<void> {
    await prisma.dbStorageObject.deleteMany({ where: { key } })
  }
}

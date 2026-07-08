import { DbStorageProvider } from './dbProvider'
import type { StorageProvider } from './types'

export type { StorageProvider, StoredFile } from './types'

// Provider ativo. Troca futura (ex.: Supabase Storage) muda só esta linha —
// nenhum caller de storage.upload/download/delete precisa mudar.
export const storage: StorageProvider = new DbStorageProvider()

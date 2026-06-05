import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Surface a clear message instead of a cryptic runtime crash.
  console.error(
    'Missing Supabase env vars. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

export const isSupabaseConfigured = Boolean(url && anonKey)

export async function uploadFile(
  bucket: string,
  filePath: string,
  file: File
): Promise<string> {
  try {
    // Attempt to upload to Supabase Storage bucket
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert: true
      })
    if (error) throw error
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
    return urlData.publicUrl
  } catch (err) {
    console.warn(`Storage upload to bucket "${bucket}" failed, falling back to base64 encoding:`, err)
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to read file as base64 Data URL'))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }
}

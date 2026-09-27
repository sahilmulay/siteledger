import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
  const { data: p } = await supabase.from('projects').select('*').limit(1)
  console.log('Projects keys:', p ? Object.keys(p[0] || {}) : 'none')
  
  const { data: e } = await supabase.from('expenses').select('*').limit(1)
  console.log('Expenses keys:', e ? Object.keys(e[0] || {}) : 'none')
  
  const { data: i } = await supabase.from('income').select('*').limit(1)
  console.log('Income keys:', i ? Object.keys(i[0] || {}) : 'none')
}
check()

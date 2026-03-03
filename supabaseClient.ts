import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nzahxiurqeqfwimbilbz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_5jVPcCAxVtBAJsd-NRFWPQ_zJhJ_HZZ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

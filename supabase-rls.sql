-- ═══════════════════════════════════════════════════════════
-- SUBLIME SST — Row Level Security (RLS)
-- Execute no SQL Editor do Supabase (painel > SQL Editor > New query)
-- ═══════════════════════════════════════════════════════════

-- ── Habilitar RLS em todas as tabelas ───────────────────────
ALTER TABLE public.leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligibility_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnae_catalog        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_referrals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_data     ENABLE ROW LEVEL SECURITY;

-- ── Bloquear acesso direto a todas as tabelas ────────────────
-- O acesso acontece exclusivamente via service_role (API Routes do Next.js)
-- Nenhum cliente anônimo ou autenticado acessa diretamente.

CREATE POLICY "deny_all_leads" ON public.leads
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_assessments" ON public.eligibility_assessments
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_companies" ON public.companies
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_plans" ON public.plans
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_cnae" ON public.cnae_catalog
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_partners" ON public.partners
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_referrals" ON public.partner_referrals
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_payments" ON public.payments
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_contact_requests" ON public.contact_requests
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_client_sessions" ON public.client_sessions
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

CREATE POLICY "deny_all_onboarding_data" ON public.onboarding_data
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- ── Verificar resultado ──────────────────────────────────────
-- Rode esta query após o script para confirmar que RLS está ativo:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

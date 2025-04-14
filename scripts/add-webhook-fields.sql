-- Script para adicionar campos webhook às tabelas
ALTER TABLE IF EXISTS public.clients 
ADD COLUMN IF NOT EXISTS webhook_url TEXT;

ALTER TABLE IF EXISTS public.proposals 
ADD COLUMN IF NOT EXISTS webhook_url TEXT;

ALTER TABLE IF EXISTS public.form_templates 
ADD COLUMN IF NOT EXISTS webhook_url TEXT;

ALTER TABLE IF EXISTS public.form_submissions 
ADD COLUMN IF NOT EXISTS webhook_url TEXT;
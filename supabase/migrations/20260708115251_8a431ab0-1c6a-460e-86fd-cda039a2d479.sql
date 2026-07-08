ALTER TABLE public.dashboards
  ADD COLUMN IF NOT EXISTS workspace_id uuid,
  ADD COLUMN IF NOT EXISTS report_id uuid;

INSERT INTO public.dashboards (name, description, embed_url, filter_table, filter_mode, workspace_id, report_id)
VALUES (
  'GESTÃO DE RESULTADOS - rev13',
  'Dashboard de gestão de resultados',
  '',
  'dObrasCadastradas',
  'page',
  'e56275ae-0ef0-4cd8-a15e-c1f467200d3c',
  '2771df6b-36aa-4225-a55c-3fbd5b41440e'
);
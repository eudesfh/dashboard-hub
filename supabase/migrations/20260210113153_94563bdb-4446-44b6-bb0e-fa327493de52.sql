
-- Add filter_table column to dashboards (the Power BI table name for URL filtering)
ALTER TABLE public.dashboards ADD COLUMN filter_table text;

-- Add a comment for clarity
COMMENT ON COLUMN public.dashboards.filter_table IS 'Nome da tabela do Power BI usada nos filtros de URL (ex: fMedicao, Obras)';

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const TENANT_ID = Deno.env.get('POWERBI_TENANT_ID')!;
const CLIENT_ID = Deno.env.get('POWERBI_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('POWERBI_CLIENT_SECRET')!;

async function getAadToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AAD token failed [${res.status}]: ${t}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { dashboardId } = await req.json();
    if (!dashboardId || typeof dashboardId !== 'string') {
      return new Response(JSON.stringify({ error: 'dashboardId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up dashboard (RLS ensures user only reads permitted rows)
    const { data: dash, error: dashErr } = await supabase
      .from('dashboards')
      .select('id, workspace_id, report_id')
      .eq('id', dashboardId)
      .maybeSingle();

    if (dashErr || !dash) {
      return new Response(JSON.stringify({ error: 'Dashboard not found or no access' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!dash.workspace_id || !dash.report_id) {
      return new Response(JSON.stringify({ error: 'Dashboard missing workspace_id/report_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aadToken = await getAadToken();

    // Get report metadata (embedUrl + datasetId)
    const reportRes = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${dash.workspace_id}/reports/${dash.report_id}`,
      { headers: { Authorization: `Bearer ${aadToken}` } },
    );
    if (!reportRes.ok) {
      const t = await reportRes.text();
      console.error(`Report fetch failed [${reportRes.status}]: ${t}`);
      return new Response(
        JSON.stringify({ error: 'Power BI report fetch failed', status: reportRes.status, details: t }),
        { status: reportRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const report = await reportRes.json();

    // Generate embed token
    const tokenRes = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${dash.workspace_id}/reports/${dash.report_id}/GenerateToken`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${aadToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessLevel: 'View' }),
      },
    );
    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      console.error(`Embed token failed [${tokenRes.status}]: ${t}`);
      return new Response(
        JSON.stringify({ error: 'Power BI embed token failed', status: tokenRes.status, details: t }),
        { status: tokenRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const tokenData = await tokenRes.json();

    return new Response(
      JSON.stringify({
        embedUrl: report.embedUrl,
        embedToken: tokenData.token,
        reportId: dash.report_id,
        expiration: tokenData.expiration,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('powerbi-embed-token error:', e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Edge function: admin-only user management
// Operations: create, update, delete, set_password
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  action: "create" | "update" | "delete" | "set_password" | "confirm_email";
  user_id?: string;
  email?: string;
  password?: string;
  full_name?: string;
  estado?: string | null;
  cidade?: string | null;
  obras?: string[];
  role?: "admin" | "user";
  is_active?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Apenas administradores" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Payload = await req.json();

    if (body.action === "create") {
      if (!body.email || !body.password || !body.full_name) {
        return new Response(JSON.stringify({ error: "Dados incompletos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: created, error } = await admin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { full_name: body.full_name },
      });
      if (error) throw error;
      const newId = created.user!.id;

      // Update profile with location/obras
      await admin.from("profiles").update({
        full_name: body.full_name,
        estado: body.estado ?? null,
        cidade: body.cidade ?? null,
        obras: body.obras ?? [],
        is_active: body.is_active ?? true,
      }).eq("user_id", newId);

      // Role (handle_new_user already inserts 'user'; upgrade if requested)
      if (body.role === "admin") {
        await admin.from("user_roles").delete().eq("user_id", newId);
        await admin.from("user_roles").insert({ user_id: newId, role: "admin" });
      }

      return new Response(JSON.stringify({ ok: true, user_id: newId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.user_id) {
      return new Response(JSON.stringify({ error: "user_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "update") {
      const profileUpdate: Record<string, unknown> = {};
      if (body.full_name !== undefined) profileUpdate.full_name = body.full_name;
      if (body.estado !== undefined) profileUpdate.estado = body.estado;
      if (body.cidade !== undefined) profileUpdate.cidade = body.cidade;
      if (body.obras !== undefined) profileUpdate.obras = body.obras;
      if (body.is_active !== undefined) profileUpdate.is_active = body.is_active;
      if (body.email !== undefined) profileUpdate.email = body.email;

      if (Object.keys(profileUpdate).length) {
        const { error } = await admin.from("profiles").update(profileUpdate).eq("user_id", body.user_id);
        if (error) throw error;
      }
      if (body.email) {
        await admin.auth.admin.updateUserById(body.user_id, { email: body.email });
      }
      if (body.role) {
        await admin.from("user_roles").delete().eq("user_id", body.user_id);
        await admin.from("user_roles").insert({ user_id: body.user_id, role: body.role });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "set_password") {
      if (!body.password) {
        return new Response(JSON.stringify({ error: "password obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await admin.auth.admin.updateUserById(body.user_id, { password: body.password });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "delete") {
      if (body.user_id === userData.user.id) {
        return new Response(JSON.stringify({ error: "Você não pode excluir sua própria conta" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await admin.auth.admin.deleteUser(body.user_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-users error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

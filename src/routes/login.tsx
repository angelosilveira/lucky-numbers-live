import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { cpfToEmail, formatCpf, onlyDigits } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login Admin — BichoLive" }] }),
  component: LoginPage,
});

const schema = z.object({
  cpf: z
    .string()
    .transform((v) => onlyDigits(v))
    .refine((v) => v.length === 11, "CPF deve ter 11 dígitos"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const form = useForm<{ cpf: string; password: string }>({
    resolver: zodResolver(schema),
    defaultValues: { cpf: "", password: "" },
  });

  async function onSubmit(values: { cpf: string; password: string }) {
    setLoading(true);
    const email = cpfToEmail(values.cpf);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: values.password,
    });
    if (error || !data.user) {
      setLoading(false);
      toast.error("CPF ou senha inválidos");
      return;
    }
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Acesso restrito ao administrador.");
      return;
    }
    toast.success("Bem-vindo!");
    navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen bg-hero flex flex-col items-center justify-center p-4">
      <Link
        to="/"
        className="absolute top-4 left-4 text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="size-4" /> Voltar
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-card/70 backdrop-blur p-6 shadow-card">
        <div className="flex items-center gap-2 mb-6">
          <div className="size-10 rounded-lg bg-gold flex items-center justify-center shadow-glow-gold">
            <Lock className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-xl">Painel Admin</div>
            <div className="text-xs text-muted-foreground">Acesso restrito</div>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              inputMode="numeric"
              autoComplete="username"
              placeholder="000.000.000-00"
              value={formatCpf(form.watch("cpf"))}
              onChange={(e) => form.setValue("cpf", onlyDigits(e.target.value))}
            />
            {form.formState.errors.cpf && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.cpf.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full bg-gold text-primary-foreground hover:opacity-90" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          O administrador é cadastrado pela equipe.
        </p>
      </div>
    </div>
  );
}

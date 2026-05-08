export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);

export const formatCpf = (v: string) => {
  const d = (v ?? "").replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

export const onlyDigits = (v: string) => (v ?? "").replace(/\D/g, "");

export const cpfToEmail = (cpf: string) => `cpf+${onlyDigits(cpf)}@bicho.local`;

export const fmt2 = (n: number) => String(n).padStart(2, "0");

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

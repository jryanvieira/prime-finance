export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Lado esquerdo - Branding */}
      <div className="hidden flex-col justify-between bg-primary p-12 lg:flex lg:w-1/2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary-foreground">
            Prime Finance
          </h1>
        </div>
        <div className="space-y-6">
          <blockquote className="space-y-2">
            <p className="text-lg text-primary-foreground/90">
              &ldquo;Controlar suas finanças nunca foi tão simples. O Prime Finance me ajudou a
              economizar mais de R$ 500 por mês identificando gastos desnecessários.&rdquo;
            </p>
            <footer className="text-sm text-primary-foreground/70">Maria Silva, Designer</footer>
          </blockquote>
        </div>
        <p className="text-xs text-primary-foreground/50">
          Seus dados estão seguros e protegidos.
        </p>
      </div>

      {/* Lado direito - Formulário */}
      <div className="flex w-full items-center justify-center bg-background px-6 lg:w-1/2">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  )
}

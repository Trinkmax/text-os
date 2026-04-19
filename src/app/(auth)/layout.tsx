import { TexSays } from "@/components/tex";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-0 text-fg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <TexSays
            variant="support"
            size="xl"
            layout="stack"
            position="left"
            tone="info"
            maxBubbleWidth={260}
            message={
              <span className="text-[13px] leading-snug">
                Hola, soy <b>Tex</b> 👋
                <br />
                Entrá y activo tu IA.
              </span>
            }
            mascotProps={{ priority: true }}
            className="mb-4"
          />
          <span className="text-xl font-semibold tracking-tight mt-1">TextOS</span>
          <p className="text-xs text-fg-3 mt-0.5">CRM conversacional con IA</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-0 text-fg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500" />
            <span className="text-xl font-semibold tracking-tight">TextOS</span>
          </div>
          <p className="text-sm text-fg-3">CRM conversacional con IA</p>
        </div>
        {children}
      </div>
    </div>
  );
}

import { APP_CONFIG } from "@/app.config";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-active">
        {APP_CONFIG.metadata.title}
      </h1>
      <p className="max-w-md text-center text-slate-300">
        Seed topic: {APP_CONFIG.metadata.seedTopic}
      </p>
    </main>
  );
}

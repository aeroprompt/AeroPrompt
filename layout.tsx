import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "AeroPrompt Lite",
  description: "A friendly go/no-go flight coach (MVP). Advisory only.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900">
        <div className="mx-auto max-w-md px-4 py-6">
          <header className="mb-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-semibold">AeroPrompt</div>
                <div className="text-xs text-zinc-600">Friendly go/no-go coach (Lite)</div>
              </div>
              <a
                className="text-xs font-medium text-zinc-800 underline underline-offset-4"
                href="#disclaimer"
              >
                Disclaimer
              </a>
            </div>
          </header>
          {children}
          <footer id="disclaimer" className="mt-10 rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold">Advisory only</div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-700">
              AeroPrompt Lite provides decision support only. It is not flight planning software and not a
              substitute for official weather briefings, training, judgment, or regulatory requirements.
              You are responsible for all go/no-go decisions.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}

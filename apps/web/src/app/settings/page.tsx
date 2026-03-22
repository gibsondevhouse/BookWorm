import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — BookWorm",
  description: "Workspace preferences and configuration"
};

const upcomingFeatures = [
  "AI connector keys and priorities",
  "Writing mode defaults and persona controls",
  "Export and portability preferences",
  "Keyboard shortcut customisation",
] as const;

export default function SettingsPage() {
  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-3xl">
          <section
            className="shell-panel stagger-fade-up relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10"
            aria-labelledby="settings-title"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent" />

            <div className="relative">
              <div className="hero-badge inline-flex rounded-full px-4 py-1.5 text-[0.7rem] uppercase tracking-[0.34em] text-[rgba(237,245,255,0.82)]">
                Configuration
              </div>

              <h1
                id="settings-title"
                className="font-display mt-6 text-4xl leading-none text-text sm:text-5xl"
              >
                Settings
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-text-muted">
                Workspace preferences, connector configuration, and persona
                controls will surface here in an upcoming release. The shell
                stays uncluttered until the controls are ready.
              </p>

              <div className="surface-panel mt-8 rounded-2xl p-5">
                <div className="text-[0.68rem] uppercase tracking-[0.3em] text-text-muted">
                  Coming in a future release
                </div>
                <ul className="mt-4 space-y-3" aria-label="Planned settings features">
                  {upcomingFeatures.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-3 text-sm leading-6 text-text-muted"
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary opacity-50"
                        aria-hidden
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

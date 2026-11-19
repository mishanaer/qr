"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { Button } from "./components/ui/button";
import "../../../public/ui/geist-rounded/vendor/deslop/layout.css";
import styles from "./playground.module.css";

const subscribe = () => () => undefined;

export function ShowcasePlayground({
  name,
  preview,
  previewActions,
  sourceUrl,
  children,
}: {
  name: string;
  preview: ReactNode;
  previewActions?: ReactNode;
  sourceUrl: string;
  children: ReactNode;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  const nextTheme = dark ? "light" : "dark";

  return (
    <main className={styles.showcase}>
      <h1 className="sr-only">{name}</h1>
      <section className={styles.workspace} aria-label={`${name} playground`}>
        <div className={styles.preview}>
          <div className={styles.stage}>{preview}</div>
          {previewActions}
        </div>
        <aside aria-label={`${name} settings`}>
          <div className="grid gap-5">
            {children}
            <Button
              variant="tertiary"
              aria-label={`Switch to ${nextTheme} theme`}
              onClick={() => setTheme(nextTheme)}
            >
              {dark ? "Dark theme" : "Light theme"}
            </Button>
            <Button variant="primary" asChild>
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer">GitHub</a>
            </Button>
          </div>
        </aside>
      </section>
    </main>
  );
}

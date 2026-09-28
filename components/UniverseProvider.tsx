import type { ReactNode } from "react";

export default function UniverseProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}

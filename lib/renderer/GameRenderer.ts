// Owner: A2. Frozen at end of M1.
// All template renderers (platformer/shooter/runner) MUST conform.

import type { GameSpec } from "@/lib/spec/types";

export interface GameRenderer<TSpec extends GameSpec = GameSpec> {
  mount(container: HTMLElement, spec: TSpec): void;
  update(spec: TSpec): void;
  destroy(): void;
  snapshot(): Promise<Blob>;
}

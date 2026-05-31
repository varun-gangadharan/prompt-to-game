import { GameCanvas } from "@/components/renderer/GameCanvas";
import { platformerExample } from "@/lib/spec/examples";

export default function PlayDemoPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#111111",
        color: "#ffffff",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <h1
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 24,
            margin: "0 0 16px",
          }}
        >
          {platformerExample.title}
        </h1>
        <GameCanvas spec={platformerExample} />
      </div>
    </main>
  );
}

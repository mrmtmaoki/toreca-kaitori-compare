import { ImageResponse } from "next/og";

export const alt = "買取レーダー｜そのカード、どこで売るのが一番高い？";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "radial-gradient(1200px 600px at 30% -10%, #1a2036 0%, #0b0d14 60%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 14,
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", fontSize: 40, color: "#e8b84b", fontWeight: 900 }}>
            買取レーダー
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              letterSpacing: 4,
              color: "#9aa1b5",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            KAITORI RADAR
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 900,
            color: "#eef0f6",
            lineHeight: 1.25,
            marginBottom: 32,
          }}
        >
          そのカード、どこで売るのが一番高い？
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#9aa1b5", maxWidth: 960 }}>
          遊戯王・ワンピースカード・ポケモンカードの買取価格を一括比較
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 56 }}>
          <div
            style={{
              display: "flex",
              padding: "10px 24px",
              borderRadius: 999,
              background: "#123329",
              color: "#4fd1a5",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            最高買取価格を一発比較
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Well Botany — Suplementy i produkty bio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        background: "#07674A",
      }}
    >
      <svg
        width="130"
        height="100"
        viewBox="90 40 146 112"
        fill="none"
        role="img"
        aria-label="Well Botany"
      >
        <path
          d="M111.601 121.875C100.327 104.438 97.9619 93.204 101.547 70.125C116.127 70.8019 123.181 73.6059 133.944 82.5C143.029 90.678 145.63 96.7296 148.839 109.5C148.678 109.679 149.657 110.373 149.956 132C150.076 136.894 150.717 139.498 152.562 144C133.986 142.008 125.191 136.713 111.601 121.875Z"
          fill="#EAF6EF"
        />
        <path
          d="M156.286 133.875C156.729 138.244 157.395 140.453 159.265 144C184.179 142.482 195.637 135.952 212.887 117C221.494 104.355 224.604 96.1644 227.41 79.875C228.156 71.5631 228.237 66.8156 227.41 58.125C203.894 60.3861 193.172 64.9677 177.884 78.75C165.982 90.4609 160.957 98.1041 157.031 115.125C155.824 119.999 155.441 123.658 156.286 133.875Z"
          fill="#EAF6EF"
        />
        <ellipse cx="160.01" cy="63.375" rx="14.8949" ry="15.375" fill="#EAF6EF" />
      </svg>
      <div
        style={{
          fontSize: 76,
          fontWeight: 700,
          color: "#EAF6EF",
          letterSpacing: -1,
        }}
      >
        WellBotany
      </div>
      <div style={{ fontSize: 30, color: "rgba(234,246,239,0.75)" }}>Suplementy i produkty bio</div>
    </div>,
    { ...size },
  );
}

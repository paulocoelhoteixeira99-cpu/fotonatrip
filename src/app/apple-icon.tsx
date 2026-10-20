import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          borderRadius: 36,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="140"
          height="140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Circle (sun) */}
          <circle cx="62" cy="26" r="16" stroke="#2dd4a0" strokeWidth="4" fill="none" />
          {/* Mountain peaks */}
          <path
            d="M 5 82 L 25 45 L 35 58 L 50 32 L 65 58 L 75 48 L 95 82 Z"
            fill="#0d9668"
          />
          {/* Base swoosh */}
          <path
            d="M 2 88 Q 50 74 98 88"
            stroke="#0d9668"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}

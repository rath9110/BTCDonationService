// src/app/page.tsx
import { DonateForm } from "@/components/DonateForm";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: 800,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <header>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>
            USDT Donation dApp
          </h1>
          <p style={{ color: "#555" }}>
            Local demo connected to your Hardhat node (localhost, chainId 31337).
          </p>
        </header>

        <DonateForm />
      </div>
    </main>
  );
}

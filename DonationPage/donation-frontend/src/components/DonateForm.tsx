import React, { useState } from "react";
import {
  BrowserProvider,
  Contract,
  formatUnits,
  parseUnits,
} from "ethers";
import {
  DONATION_ROUTER_ADDRESS,
  USDT_ADDRESS,
  ERC20_ABI,
  DONATION_ROUTER_ABI,
} from "../ethConfig";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const DEFAULT_CAMPAIGN_ID = 1;

export const DonateForm: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<string>("-");
  const [amount, setAmount] = useState<string>("10");
  const [campaignId, setCampaignId] = useState<number>(DEFAULT_CAMPAIGN_ID);
  const [status, setStatus] = useState<string>("Not connected");

  async function getProviderAndSigner() {
    if (!window.ethereum) {
      throw new Error("No wallet found. Install MetaMask.");
    }
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return { provider, signer };
  }

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        alert("Install MetaMask to use this app.");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const addr = accounts[0] as string;
      setAccount(addr);

      setStatus("Wallet connected: " + addr);

      await loadUsdtBalance(addr);
    } catch (err: any) {
      console.error(err);
      setStatus("Failed to connect wallet: " + (err.message || err));
    }
  }

  async function loadUsdtBalance(address?: string) {
    try {
      const { provider } = await getProviderAndSigner();
      const signerAddress = address ?? (await provider.getSigner()).address;

      const usdt = new Contract(USDT_ADDRESS, ERC20_ABI, provider);
      const decimals: number = await usdt.decimals();
      const rawBalance = await usdt.balanceOf(signerAddress);
      const pretty = formatUnits(rawBalance, decimals);

      setUsdtBalance(pretty);
    } catch (err: any) {
      console.error(err);
      setStatus("Failed to load balance: " + (err.message || err));
    }
  }

  async function handleDonate(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (!amount || Number(amount) <= 0) {
        alert("Enter a valid amount > 0");
        return;
      }

      setStatus("Preparing donation…");

      const { provider, signer } = await getProviderAndSigner();

      // Check that campaign is active
      const routerRead = new Contract(
        DONATION_ROUTER_ADDRESS,
        DONATION_ROUTER_ABI,
        provider
      );
      const campaign = await routerRead.getCampaign(campaignId);
      if (!campaign[1]) {
        setStatus("Campaign is not active.");
        return;
      }

      const usdt = new Contract(USDT_ADDRESS, ERC20_ABI, signer);
      const router = new Contract(
        DONATION_ROUTER_ADDRESS,
        DONATION_ROUTER_ABI,
        signer
      );

      const decimals: number = await usdt.decimals();
      const amountWei = parseUnits(amount, decimals);

      // Check allowance
      const signerAddress = await signer.getAddress();
      const currentAllowance = await usdt.allowance(
        signerAddress,
        DONATION_ROUTER_ADDRESS
      );

      // If allowance < amount -> approve first
      if (currentAllowance < amountWei) {
        setStatus("Approving USDT spend…");
        const approveTx = await usdt.approve(
          DONATION_ROUTER_ADDRESS,
          amountWei
        );
        await approveTx.wait();
      }

      setStatus("Sending donation transaction…");
      const donateTx = await router.donate(campaignId, amountWei);
      await donateTx.wait();

      setStatus("Donation successful! Tx hash: " + donateTx.hash);

      // Refresh balance
      await loadUsdtBalance();
    } catch (err: any) {
      console.error(err);
      setStatus("Donation failed: " + (err.message || err));
    }
  }

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "2rem auto",
        padding: "1.5rem",
        border: "1px solid #ccc",
        borderRadius: 12,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h2>Donate USDT</h2>

      <button onClick={connectWallet} style={{ marginBottom: "1rem" }}>
        {account ? "Reconnect Wallet" : "Connect Wallet"}
      </button>

      <div style={{ marginBottom: "0.5rem" }}>
        <strong>Wallet:</strong>{" "}
        {account ? account : "Not connected"}
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <strong>USDT Balance:</strong> {usdtBalance}
      </div>

      <form onSubmit={handleDonate}>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>
            Campaign ID:&nbsp;
            <input
              type="number"
              value={campaignId}
              onChange={(e) => setCampaignId(Number(e.target.value))}
              min={1}
            />
          </label>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label>
            Amount (USDT):&nbsp;
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        </div>

        <button type="submit">Donate</button>
      </form>

      <div style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
        <strong>Status:</strong> {status}
      </div>
    </div>
  );
};

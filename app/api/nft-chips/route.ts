import { NextResponse } from "next/server"

// Mock NFT chip creation endpoint
export async function POST(req: Request) {
  const { value, owner } = await req.json()

  // Simulate blockchain transaction
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const newChip = {
    id: Date.now().toString(),
    value,
    owner,
    rarity: value > 1 ? "Epic" : value > 0.5 ? "Rare" : "Common",
    tokenId: Math.floor(Math.random() * 10000),
    contractAddress: "0x742d35Cc6634C0532925a3b8D4C9db96DfB3f681", // Base testnet
    tradeable: true,
    createdAt: new Date().toISOString(),
  }

  return NextResponse.json({ success: true, chip: newChip })
}

export async function GET() {
  // Mock getting user's NFT chips
  const mockChips = [
    {
      id: "1",
      value: 0.5,
      rarity: "Rare",
      owner: "0x1234...5678",
      tokenId: 1001,
      contractAddress: "0x742d35Cc6634C0532925a3b8D4C9db96DfB3f681",
      tradeable: true,
    },
    {
      id: "2",
      value: 1.0,
      rarity: "Epic",
      owner: "0x1234...5678",
      tokenId: 1002,
      contractAddress: "0x742d35Cc6634C0532925a3b8D4C9db96DfB3f681",
      tradeable: true,
    },
  ]

  return NextResponse.json({ chips: mockChips })
}

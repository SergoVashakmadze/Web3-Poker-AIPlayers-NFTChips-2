import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(req: Request) {
  const { gameState, playerHand } = await req.json()

  const result = await streamText({
    model: openai("gpt-4o"),
    system: `You are an AI poker player. Analyze the game state and make the best decision.
    
    Game Rules:
    - You can fold, check, call, raise, or go all-in
    - Consider pot odds, hand strength, and opponent behavior
    - Be strategic but not overly aggressive
    - Respond with only the action: fold, check, call, raise, or all-in`,
    prompt: `Current game state:
    - Your hand: ${JSON.stringify(playerHand)}
    - Community cards: ${JSON.stringify(gameState.communityCards)}
    - Pot: ${gameState.pot} ETH
    - Current bet: ${gameState.currentBet} ETH
    - Your chips: ${gameState.players.find((p) => !p.isHuman)?.chips} ETH
    
    What is your action?`,
  })

  return result.toDataStreamResponse()
}

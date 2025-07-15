"use client"

interface ChipStackProps {
  amount: number
  size?: "xs" | "sm" | "md" | "lg"
}

export function ChipStack({ amount, size = "md" }: ChipStackProps) {
  const chipSizes = {
    xs: "w-4 h-4",
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }

  const getChipCount = (amount: number) => {
    if (amount === 0) return []
    if (amount < 10) return [amount]
    if (amount < 100) return [Math.floor(amount / 10), amount % 10].filter((n) => n > 0)
    return [Math.floor(amount / 100), Math.floor((amount % 100) / 10), amount % 10].filter((n) => n > 0)
  }

  const getChipColor = (index: number) => {
    const colors = [
      "bg-gradient-to-br from-red-500 to-red-700 border-red-600", // High value
      "bg-gradient-to-br from-blue-500 to-blue-700 border-blue-600", // Medium value
      "bg-gradient-to-br from-green-500 to-green-700 border-green-600", // Low value
    ]
    return colors[index] || colors[0]
  }

  const chipStacks = getChipCount(amount)

  return (
    <div className="flex justify-center space-x-1">
      {chipStacks.map((count, stackIndex) => (
        <div key={stackIndex} className="relative">
          {Array.from({ length: Math.min(count, 5) }).map((_, chipIndex) => (
            <div
              key={chipIndex}
              className={`${chipSizes[size]} ${getChipColor(stackIndex)} border-2 rounded-full absolute shadow-sm`}
              style={{
                bottom: `${chipIndex * 2}px`,
                zIndex: chipIndex,
              }}
            />
          ))}
          {count > 5 && (
            <div
              className={`${chipSizes[size]} bg-yellow-400 border-2 border-yellow-500 rounded-full absolute shadow-sm flex items-center justify-center`}
              style={{ bottom: "10px", zIndex: 5 }}
            >
              <span className="text-xs font-bold text-black">+</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

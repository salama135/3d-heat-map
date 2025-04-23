"use client"

import { useState, useEffect, useRef } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Define pattern types
type PatternType = "waves" | "ripples" | "gradient" | "checkerboard" | "spiral"

export function HeatMap() {
  const columns = 52 // Increased for smaller cells (like weeks in a year)
  const rows = 20 // Increased for smaller cells
  const [data, setData] = useState<Array<{ col: number; row: number; count: number }>>([])
  const [pattern, setPattern] = useState<PatternType>("waves")

  // Use useRef instead of useState for time to avoid re-renders
  const timeRef = useRef(0)

  // Function to determine the color based on count (GitHub style)
  const getColor = (count: number) => {
    // GitHub-style green colors
    if (count === 0) return "#ebedf0"
    if (count <= 2) return "#9be9a8"
    if (count <= 5) return "#40c463"
    if (count <= 8) return "#30a14e"
    return "#216e39" // Highest intensity
  }

  // Get intensity label based on count
  const getIntensityLabel = (count: number) => {
    if (count === 0) return "No activity"
    if (count <= 2) return "Low activity"
    if (count <= 5) return "Medium activity"
    if (count <= 8) return "High activity"
    return "Very high activity"
  }

  // Generate pattern based on selected type and current time
  const generatePattern = (patternType: PatternType, time: number) => {
    const newData = []
    const centerX = columns / 2
    const centerY = rows / 2

    for (let col = 0; col < columns; col++) {
      for (let row = 0; row < rows; row++) {
        let count = 0

        switch (patternType) {
          case "waves":
            // Create wave pattern using sine functions
            const value = Math.sin(col * 0.2 + time * 0.1) + Math.sin(row * 0.2 + time * 0.1)
            // Map from [-2, 2] to [0, 10]
            count = Math.floor(((value + 2) / 4) * 10)
            break

          case "ripples":
            // Calculate distance from center
            const dx = col - centerX
            const dy = row - centerY
            const distance = Math.sqrt(dx * dx + dy * dy)

            // Create ripple effect
            const rippleValue = Math.sin(distance * 0.5 - time * 0.2)
            // Map from [-1, 1] to [0, 10]
            count = Math.floor(((rippleValue + 1) / 2) * 10)
            break

          case "gradient":
            // Create diagonal gradient with time-based movement
            const gradientValue = (col + row + time) % columns
            // Map to [0, 10]
            count = Math.floor((gradientValue / columns) * 10)
            break

          case "checkerboard":
            // Create animated checkerboard
            const isEven = (col + row + Math.floor(time / 5)) % 2 === 0
            count = isEven ? 10 : 0
            break

          case "spiral":
            // Calculate angle and distance from center
            const spiralDx = col - centerX
            const spiralDy = row - centerY
            const spiralDistance = Math.sqrt(spiralDx * spiralDx + spiralDy * spiralDy)
            const angle = Math.atan2(spiralDy, spiralDx)

            // Create spiral effect
            const spiralValue = (angle + spiralDistance * 0.1 + time * 0.05) % (2 * Math.PI)
            // Map to [0, 10]
            count = Math.floor((spiralValue / (2 * Math.PI)) * 10)
            break

          default:
            count = 0
        }

        newData.push({ col, row, count })
      }
    }

    return newData
  }

  // Animation frame using requestAnimationFrame
  useEffect(() => {
    let animationFrameId: number

    const animate = () => {
      // Increment time
      timeRef.current += 0.1

      // Update data with current pattern and time
      setData(generatePattern(pattern, timeRef.current))

      // Request next frame
      animationFrameId = requestAnimationFrame(animate)
    }

    // Start animation
    animationFrameId = requestAnimationFrame(animate)

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [pattern]) // Only re-run when pattern changes

  // Cycle through patterns every 10 seconds
  useEffect(() => {
    const patterns: PatternType[] = ["waves", "ripples", "gradient", "checkerboard", "spiral"]
    const interval = setInterval(() => {
      setPattern((prevPattern) => {
        const currentIndex = patterns.indexOf(prevPattern)
        const nextIndex = (currentIndex + 1) % patterns.length
        return patterns[nextIndex]
      })
    }, 10000)

    return () => clearInterval(interval)
  }, []) // Empty dependency array - only run once

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-900 p-8">
      <h1 className="text-white text-2xl mb-4">Pattern: {pattern}</h1>
      <div
        className="w-full max-w-5xl h-[70vh] grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {data.map((cell, index) => (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="w-full h-full aspect-square rounded-sm transition-all duration-150 
                             hover:scale-125 hover:z-10 hover:brightness-125 hover:shadow-lg hover:shadow-white/20"
                  style={{ backgroundColor: getColor(cell.count) }}
                  aria-label={`${getIntensityLabel(cell.count)}: Level ${cell.count}`}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-sm mb-1" style={{ backgroundColor: getColor(cell.count) }}></div>
                  <p>{getIntensityLabel(cell.count)}</p>
                  <p className="text-xs text-gray-400">Level: {cell.count}</p>
                  <p className="text-xs text-gray-400">
                    Position: ({cell.col}, {cell.row})
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3 text-white">
        <button
          className={`px-4 py-2 rounded-lg ${pattern === "waves" ? "bg-white text-black" : "bg-gray-800"}`}
          onClick={() => setPattern("waves")}
        >
          Waves
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${pattern === "ripples" ? "bg-white text-black" : "bg-gray-800"}`}
          onClick={() => setPattern("ripples")}
        >
          Ripples
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${pattern === "gradient" ? "bg-white text-black" : "bg-gray-800"}`}
          onClick={() => setPattern("gradient")}
        >
          Gradient
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${pattern === "checkerboard" ? "bg-white text-black" : "bg-gray-800"}`}
          onClick={() => setPattern("checkerboard")}
        >
          Checkerboard
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${pattern === "spiral" ? "bg-white text-black" : "bg-gray-800"}`}
          onClick={() => setPattern("spiral")}
        >
          Spiral
        </button>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="text-white text-sm">Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-[#ebedf0]"></div>
          <div className="w-3 h-3 rounded-sm bg-[#9be9a8]"></div>
          <div className="w-3 h-3 rounded-sm bg-[#40c463]"></div>
          <div className="w-3 h-3 rounded-sm bg-[#30a14e]"></div>
          <div className="w-3 h-3 rounded-sm bg-[#216e39]"></div>
        </div>
        <span className="text-white text-sm">More</span>
      </div>
    </div>
  )
}

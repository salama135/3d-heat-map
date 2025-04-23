"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Text, Environment } from "@react-three/drei"
import * as THREE from "three"
import { Slider } from "@/components/ui/slider"

// Define pattern types
type PatternType = "waves" | "ripples" | "gradient" | "checkerboard" | "spiral"

// Define color themes
type ColorTheme = "github" | "heat" | "ocean" | "rainbow" | "monochrome" | "purple"

// Debug flag - set to true to enable debug mode
const DEBUG = false

// Get color based on count and theme
const getColor = (count: number, theme: ColorTheme): string => {
  // Ensure count is an integer between 0 and 10
  const safeCount = Math.max(0, Math.min(10, Math.floor(count)))

  switch (theme) {
    case "github":
      // GitHub-style green colors
      if (safeCount === 0) return "#ebedf0"
      if (safeCount <= 2) return "#9be9a8"
      if (safeCount <= 5) return "#40c463"
      if (safeCount <= 8) return "#30a14e"
      return "#216e39"

    case "heat":
      // Heat map colors (white to red)
      if (safeCount === 0) return "#f8f9fa"
      if (safeCount <= 2) return "#ffccbc"
      if (safeCount <= 5) return "#ff8a65"
      if (safeCount <= 8) return "#e64a19"
      return "#bf360c"

    case "ocean":
      // Ocean colors (light to dark blue)
      if (safeCount === 0) return "#f5f5f5"
      if (safeCount <= 2) return "#bbdefb"
      if (safeCount <= 5) return "#64b5f6"
      if (safeCount <= 8) return "#1976d2"
      return "#0d47a1"

    case "rainbow":
      // Rainbow colors based on count
      const hue = (safeCount / 10) * 300 // 0-300 degree hue range
      return `hsl(${hue}, 80%, 60%)`

    case "monochrome":
      // Monochrome (grayscale)
      const lightness = 90 - safeCount * 8
      return `hsl(0, 0%, ${lightness}%)`

    case "purple":
      // Purple theme
      if (safeCount === 0) return "#f3e5f5"
      if (safeCount <= 2) return "#ce93d8"
      if (safeCount <= 5) return "#9c27b0"
      if (safeCount <= 8) return "#6a1b9a"
      return "#4a148c"

    default:
      return "#ffffff"
  }
}

// Create a data texture to store pattern values
function createDataTexture(columns: number, rows: number) {
  const size = columns * rows
  const data = new Float32Array(size)
  const texture = new THREE.DataTexture(data, columns, rows, THREE.RedFormat, THREE.FloatType)
  texture.needsUpdate = true
  return { data, texture }
}

// Pattern generator component
function PatternGenerator({
  pattern,
  resolution,
  animationSpeed,
  onUpdate,
}: {
  pattern: PatternType
  resolution: [number, number]
  animationSpeed: number
  onUpdate: (data: Float32Array) => void
}) {
  const [columns, rows] = resolution
  const timeRef = useRef(0)
  const dataRef = useRef(new Float32Array(columns * rows))

  // Generate pattern based on selected type and current time
  const generatePattern = (patternType: PatternType, time: number) => {
    const data = dataRef.current
    const centerX = columns / 2
    const centerY = rows / 2

    for (let i = 0; i < columns * rows; i++) {
      const col = i % columns
      const row = Math.floor(i / columns)
      let value = 0

      switch (patternType) {
        case "waves":
          // Create wave pattern using sine functions
          value = Math.sin(col * 0.2 + time * 0.1) + Math.sin(row * 0.2 + time * 0.1)
          // Map from [-2, 2] to [0, 1]
          value = (value + 2) / 4
          break

        case "ripples":
          // Calculate distance from center
          const dx = col - centerX
          const dy = row - centerY
          const distance = Math.sqrt(dx * dx + dy * dy)

          // Create ripple effect
          const rippleValue = Math.sin(distance * 0.5 - time * 0.2)
          // Map from [-1, 1] to [0, 1]
          value = (rippleValue + 1) / 2
          break

        case "gradient":
          // Create diagonal gradient with time-based movement
          value = ((col + row + time) % columns) / columns
          break

        case "checkerboard":
          // Create animated checkerboard
          const isEven = (col + row + Math.floor(time / 5)) % 2 === 0
          value = isEven ? 1 : 0
          break

        case "spiral":
          // Calculate angle and distance from center
          const spiralDx = col - centerX
          const spiralDy = row - centerY
          const spiralDistance = Math.sqrt(spiralDx * spiralDx + spiralDy * spiralDy)
          const angle = Math.atan2(spiralDy, spiralDx)

          // Create spiral effect
          value = ((angle + spiralDistance * 0.1 + time * 0.05) % (2 * Math.PI)) / (2 * Math.PI)
          break

        default:
          value = 0
      }

      // Store value in data array
      data[i] = value
    }

    // Call update callback with new data
    onUpdate(data)
  }

  // Animation
  useFrame(() => {
    timeRef.current += 0.05 * animationSpeed
    generatePattern(pattern, timeRef.current)
  })

  return null
}

// 3D Cubes component
function Cubes({
  data,
  theme,
  resolution,
}: {
  data: Float32Array
  theme: ColorTheme
  resolution: [number, number]
}) {
  const [columns, rows] = resolution
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { viewport } = useThree()

  // Create temporary objects for matrix and color calculations
  const tempObject = useMemo(() => new THREE.Object3D(), [])
  const tempColor = useMemo(() => new THREE.Color(), [])

  // Update all cubes when data or theme changes
  useEffect(() => {
    if (!meshRef.current || data.length === 0) return

    const width = viewport.width * 0.8
    const height = viewport.height * 0.8
    const cellWidth = width / columns
    const cellHeight = height / rows

    // Update all instances
    for (let i = 0; i < columns * rows; i++) {
      const col = i % columns
      const row = Math.floor(i / columns)
      const value = data[i]

      // Convert value to count (0-10)
      const count = Math.floor(value * 10)

      // Calculate position
      const x = -width / 2 + col * cellWidth + cellWidth / 2
      const z = -height / 2 + row * cellHeight + cellHeight / 2
      const y = count * 0.05 // Height based on count

      // Set position and scale
      tempObject.position.set(x, y / 2, z)
      tempObject.scale.set(cellWidth * 0.9, Math.max(y, 0.05), cellHeight * 0.9)
      tempObject.updateMatrix()

      // Update instance matrix
      meshRef.current.setMatrixAt(i, tempObject.matrix)

      // Get color based on count and theme
      const color = getColor(count, theme)
      tempColor.set(color)
      meshRef.current.setColorAt(i, tempColor)
    }

    // Update instance mesh
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  }, [data, theme, columns, rows, viewport.width, viewport.height, tempObject, tempColor])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, columns * rows]} receiveShadow castShadow>
      <boxGeometry />
      <meshStandardMaterial vertexColors />
    </instancedMesh>
  )
}

// Legend component
function Legend({ theme }: { theme: ColorTheme }) {
  // Get colors based on theme
  const getThemeColors = (theme: ColorTheme) => {
    return [0, 2, 5, 8, 10].map((count) => getColor(count, theme))
  }

  const colors = getThemeColors(theme)

  return (
    <group position={[0, -1, 0]}>
      <Text position={[-3, 0, 0]} fontSize={0.3} color="white">
        Less
      </Text>

      {colors.map((color, i) => (
        <mesh key={i} position={[-1.5 + i, 0, 0]} scale={[0.5, 0.5, 0.5]}>
          <boxGeometry />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}

      <Text position={[3, 0, 0]} fontSize={0.3} color="white">
        More
      </Text>
    </group>
  )
}

// Main scene component
function Scene({
  pattern,
  theme,
  resolution,
  animationSpeed,
}: {
  pattern: PatternType
  theme: ColorTheme
  resolution: [number, number]
  animationSpeed: number
}) {
  const [patternData, setPatternData] = useState<Float32Array>(new Float32Array(resolution[0] * resolution[1]))

  // Handle pattern data updates
  const handlePatternUpdate = (data: Float32Array) => {
    setPatternData(data)
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

      {/* Pattern generator (invisible, just calculates data) */}
      <PatternGenerator
        pattern={pattern}
        resolution={resolution}
        animationSpeed={animationSpeed}
        onUpdate={handlePatternUpdate}
      />

      {/* 3D cubes visualization - add key prop to force refresh on theme change */}
      <Cubes key={`cubes-${theme}`} data={patternData} theme={theme} resolution={resolution} />

      <Legend theme={theme} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
        minDistance={5}
        maxDistance={100}
      />
      <Environment preset="city" />
    </>
  )
}

// Resolution presets
const RESOLUTION_PRESETS = {
  low: [50, 25],
  medium: [100, 50],
  high: [200, 100],
  ultra: [400, 200],
}

// Main component
export function HeatMapHybrid() {
  const [pattern, setPattern] = useState<PatternType>("waves")
  const [theme, setTheme] = useState<ColorTheme>("github")
  const [resolution, setResolution] = useState<"low" | "medium" | "high" | "ultra">("medium")
  const [animationSpeed, setAnimationSpeed] = useState(1)

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
  }, [])

  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="absolute top-4 left-0 right-0 z-10 flex justify-center">
        <h1 className="text-white text-2xl bg-black/50 px-4 py-2 rounded-lg">
          Pattern: {pattern} | Theme: {theme} | Resolution: {RESOLUTION_PRESETS[resolution][0]}×
          {RESOLUTION_PRESETS[resolution][1]} | Speed: {animationSpeed.toFixed(1)}x
        </h1>
      </div>

      <Canvas camera={{ position: [0, 15, 25], fov: 50 }} className="w-full h-full">
        <color attach="background" args={["#121212"]} />
        <fog attach="fog" args={["#121212", 30, 60]} />
        <Scene
          pattern={pattern}
          theme={theme}
          resolution={RESOLUTION_PRESETS[resolution] as [number, number]}
          animationSpeed={animationSpeed}
        />
      </Canvas>

      {/* Animation speed slider */}
      <div className="absolute top-16 left-0 right-0 z-10 flex justify-center items-center gap-3 px-4">
        <span className="text-white">Speed:</span>
        <div className="w-64">
          <Slider
            defaultValue={[1]}
            min={0.1}
            max={3}
            step={0.1}
            value={[animationSpeed]}
            onValueChange={(value) => setAnimationSpeed(value[0])}
          />
        </div>
        <span className="text-white">{animationSpeed.toFixed(1)}x</span>
        <div className="flex gap-2 ml-2">
          <button
            className="px-2 py-1 bg-gray-800 text-white rounded-md text-xs"
            onClick={() => setAnimationSpeed(0.5)}
          >
            0.5x
          </button>
          <button
            className="px-2 py-1 bg-gray-800 text-white rounded-md text-xs"
            onClick={() => setAnimationSpeed(1.0)}
          >
            1x
          </button>
          <button
            className="px-2 py-1 bg-gray-800 text-white rounded-md text-xs"
            onClick={() => setAnimationSpeed(2.0)}
          >
            2x
          </button>
        </div>
      </div>

      {/* Resolution selection */}
      <div className="absolute top-28 left-0 right-0 z-10 flex justify-center gap-3">
        <button
          className={`px-4 py-2 rounded-lg ${resolution === "low" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setResolution("low")}
        >
          Low (1,250 cells)
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${resolution === "medium" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setResolution("medium")}
        >
          Medium (5,000 cells)
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${resolution === "high" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setResolution("high")}
        >
          High (20,000 cells)
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${resolution === "ultra" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setResolution("ultra")}
        >
          Ultra (80,000 cells)
        </button>
      </div>

      {/* Pattern selection */}
      <div className="absolute bottom-16 left-0 right-0 z-10 flex justify-center gap-3">
        <button
          className={`px-4 py-2 rounded-lg ${pattern === "waves" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setPattern("waves")}
        >
          Waves
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${pattern === "ripples" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setPattern("ripples")}
        >
          Ripples
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${pattern === "gradient" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setPattern("gradient")}
        >
          Gradient
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${pattern === "checkerboard" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setPattern("checkerboard")}
        >
          Checkerboard
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${pattern === "spiral" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setPattern("spiral")}
        >
          Spiral
        </button>
      </div>

      {/* Theme selection */}
      <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-3">
        <button
          className={`px-4 py-2 rounded-lg ${theme === "github" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => {
            setTheme("github")
            if (DEBUG) console.log("Setting theme to github")
          }}
          style={{ borderBottom: "3px solid #40c463" }}
        >
          GitHub
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${theme === "heat" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => {
            setTheme("heat")
            if (DEBUG) console.log("Setting theme to heat")
          }}
          style={{ borderBottom: "3px solid #e64a19" }}
        >
          Heat
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${theme === "ocean" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => {
            setTheme("ocean")
            if (DEBUG) console.log("Setting theme to ocean")
          }}
          style={{ borderBottom: "3px solid #1976d2" }}
        >
          Ocean
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${theme === "rainbow" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => {
            setTheme("rainbow")
            if (DEBUG) console.log("Setting theme to rainbow")
          }}
          style={{ borderBottom: "3px solid #ff00ff" }}
        >
          Rainbow
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${theme === "monochrome" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => {
            setTheme("monochrome")
            if (DEBUG) console.log("Setting theme to monochrome")
          }}
          style={{ borderBottom: "3px solid #888888" }}
        >
          Mono
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${theme === "purple" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => {
            setTheme("purple")
            if (DEBUG) console.log("Setting theme to purple")
          }}
          style={{ borderBottom: "3px solid #9c27b0" }}
        >
          Purple
        </button>
      </div>
    </div>
  )
}

"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Text, Environment, Stats } from "@react-three/drei"
import * as THREE from "three"

// Define pattern types
type PatternType = "waves" | "ripples" | "gradient" | "checkerboard" | "spiral"

// Define color themes
type ColorTheme = "github" | "heat" | "ocean" | "rainbow" | "monochrome" | "purple"

// Define performance modes
type PerformanceMode = "low" | "medium" | "high" | "ultra"

// Cell counts for different performance modes
const CELL_COUNTS = {
  low: { columns: 30, rows: 15 },
  medium: { columns: 50, rows: 25 },
  high: { columns: 80, rows: 40 },
  ultra: { columns: 100, rows: 50 },
}

// Function to determine the color based on count and theme
const getColor = (count: number, theme: ColorTheme) => {
  switch (theme) {
    case "github":
      // GitHub-style green colors
      if (count === 0) return "#ebedf0"
      if (count <= 2) return "#9be9a8"
      if (count <= 5) return "#40c463"
      if (count <= 8) return "#30a14e"
      return "#216e39"

    case "heat":
      // Heat map colors (white to red)
      if (count === 0) return "#f8f9fa"
      if (count <= 2) return "#ffccbc"
      if (count <= 5) return "#ff8a65"
      if (count <= 8) return "#e64a19"
      return "#bf360c"

    case "ocean":
      // Ocean colors (light to dark blue)
      if (count === 0) return "#f5f5f5"
      if (count <= 2) return "#bbdefb"
      if (count <= 5) return "#64b5f6"
      if (count <= 8) return "#1976d2"
      return "#0d47a1"

    case "rainbow":
      // Rainbow colors based on count
      const hue = (count / 10) * 300 // 0-300 degree hue range
      return `hsl(${hue}, 80%, 60%)`

    case "monochrome":
      // Monochrome (grayscale)
      const lightness = 90 - count * 8
      return `hsl(0, 0%, ${lightness}%)`

    case "purple":
      // Purple theme
      if (count === 0) return "#f3e5f5"
      if (count <= 2) return "#ce93d8"
      if (count <= 5) return "#9c27b0"
      if (count <= 8) return "#6a1b9a"
      return "#4a148c"

    default:
      return "#ffffff"
  }
}

// Get intensity label based on count
const getIntensityLabel = (count: number) => {
  if (count === 0) return "No activity"
  if (count <= 2) return "Low activity"
  if (count <= 5) return "Medium activity"
  if (count <= 8) return "High activity"
  return "Very high activity"
}

// Optimized particle system component
function ParticleSystem({
  data,
  theme,
  gridWidth,
  gridHeight,
  performanceMode,
}: {
  data: Array<{ col: number; row: number; count: number }>
  theme: ColorTheme
  gridWidth: number
  gridHeight: number
  performanceMode: PerformanceMode
}) {
  // Adjust particle count based on performance mode
  const particlesCount = {
    low: 200,
    medium: 500,
    high: 1000,
    ultra: 2000,
  }[performanceMode]

  const particleRef = useRef<THREE.Points>(null)
  const initializedRef = useRef(false)

  // Use refs instead of state to avoid re-renders
  const positionsRef = useRef(new Float32Array(particlesCount * 3))
  const colorsRef = useRef(new Float32Array(particlesCount * 3))
  const sizesRef = useRef(new Float32Array(particlesCount))
  const velocitiesRef = useRef(
    Array.from({ length: particlesCount }, () => ({
      vx: (Math.random() - 0.5) * 0.05,
      vy: Math.random() * 0.1 + 0.05,
      vz: (Math.random() - 0.5) * 0.05,
      life: Math.random(),
    })),
  )

  // Theme change tracker
  const prevThemeRef = useRef(theme)

  // Reset particles to new positions
  const resetParticles = () => {
    // Safety check - ensure we have data
    if (!data || data.length === 0) return

    const positions = positionsRef.current
    const colors = colorsRef.current
    const sizes = sizesRef.current
    const velocities = velocitiesRef.current

    // Default color (gray) in case we can't find a valid cube
    const defaultColor = new THREE.Color("#888888")

    // Pre-filter active cubes for better performance
    const activeCubes = data.filter((cell) => cell.count > 0)
    const hasActiveCubes = activeCubes.length > 0

    for (let i = 0; i < particlesCount; i++) {
      // If no active cubes, use random positions above the grid
      if (!hasActiveCubes) {
        positions[i * 3] = (Math.random() - 0.5) * gridWidth
        positions[i * 3 + 1] = Math.random() * 2 + 0.5
        positions[i * 3 + 2] = (Math.random() - 0.5) * gridHeight

        // Use default color
        colors[i * 3] = defaultColor.r
        colors[i * 3 + 1] = defaultColor.g
        colors[i * 3 + 2] = defaultColor.b
      } else {
        // Choose a random active cube
        const randomIndex = Math.floor(Math.random() * activeCubes.length)
        const cube = activeCubes[randomIndex]

        // Position particle above the cube
        const offsetX = -gridWidth / 2 + cube.col
        const offsetZ = -gridHeight / 2 + cube.row
        const height = 0.2 + cube.count * 0.15

        // Set position with small random offset
        positions[i * 3] = offsetX + (Math.random() - 0.5) * 0.8
        positions[i * 3 + 1] = height + Math.random() * 0.5
        positions[i * 3 + 2] = offsetZ + (Math.random() - 0.5) * 0.8

        // Set color based on cube color
        const color = new THREE.Color(getColor(cube.count, theme))
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
      }

      // Set size
      sizes[i] = Math.random() * 0.1 + 0.05

      // Reset velocity
      velocities[i] = {
        vx: (Math.random() - 0.5) * 0.05,
        vy: Math.random() * 0.1 + 0.05,
        vz: (Math.random() - 0.5) * 0.05,
        life: Math.random(),
      }
    }

    // Update the geometry if it exists
    if (particleRef.current) {
      const geometry = particleRef.current.geometry
      geometry.attributes.position.array = positions
      geometry.attributes.position.needsUpdate = true
      geometry.attributes.color.array = colors
      geometry.attributes.color.needsUpdate = true
      geometry.attributes.size.array = sizes
      geometry.attributes.size.needsUpdate = true
    }
  }

  // Initialize particles once when data is first available
  useEffect(() => {
    if (data.length > 0 && !initializedRef.current) {
      resetParticles()
      initializedRef.current = true
    }
  }, [data.length > 0]) // Only run when data becomes available

  // Reset particles when theme changes
  useEffect(() => {
    if (theme !== prevThemeRef.current && initializedRef.current) {
      resetParticles()
      prevThemeRef.current = theme
    }
  }, [theme])

  // Animate particles
  useFrame(() => {
    if (!particleRef.current || !initializedRef.current) return

    const positions = particleRef.current.geometry.attributes.position.array as Float32Array
    const colors = particleRef.current.geometry.attributes.color.array as Float32Array
    const sizes = particleRef.current.geometry.attributes.size.array as Float32Array
    const velocities = velocitiesRef.current

    let needsReset = false

    // Only update a subset of particles each frame for better performance
    const updateCount = Math.min(particlesCount, 200)
    const startIndex = Math.floor(Math.random() * (particlesCount - updateCount))

    for (let i = startIndex; i < startIndex + updateCount; i++) {
      // Update position based on velocity
      positions[i * 3] += velocities[i].vx
      positions[i * 3 + 1] += velocities[i].vy
      positions[i * 3 + 2] += velocities[i].vz

      // Add some wind effect
      velocities[i].vx += (Math.random() - 0.5) * 0.01
      velocities[i].vz += (Math.random() - 0.5) * 0.01

      // Update life and fade out
      velocities[i].life -= 0.01

      if (velocities[i].life <= 0) {
        needsReset = true
        break
      }

      // Fade out color and size as life decreases
      const alpha = velocities[i].life
      colors[i * 3] *= alpha
      colors[i * 3 + 1] *= alpha
      colors[i * 3 + 2] *= alpha
      sizes[i] *= alpha
    }

    // Reset particles if needed
    if (needsReset) {
      resetParticles()
    } else {
      particleRef.current.geometry.attributes.position.needsUpdate = true
      particleRef.current.geometry.attributes.color.needsUpdate = true
      particleRef.current.geometry.attributes.size.needsUpdate = true
    }
  })

  return (
    <points ref={particleRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesCount}
          array={positionsRef.current}
          itemSize={3}
        />
        <bufferAttribute attach="attributes-color" count={particlesCount} array={colorsRef.current} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={particlesCount} array={sizesRef.current} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        vertexColors
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

// Individual cubes for better color control
function Cubes({
  data,
  theme,
  gridWidth,
  gridHeight,
  setHoveredCube,
}: {
  data: Array<{ col: number; row: number; count: number }>
  theme: ColorTheme
  gridWidth: number
  gridHeight: number
  setHoveredCube: (cube: { index: number; position: [number, number, number] } | null) => void
}) {
  const offsetX = -gridWidth / 2
  const offsetZ = -gridHeight / 2
  const { raycaster, camera, mouse } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  // Handle hover effects
  useFrame(() => {
    if (!groupRef.current || data.length === 0) return

    // Update the raycaster with the current mouse position
    raycaster.setFromCamera(mouse, camera)

    // Check for intersections
    const intersects = raycaster.intersectObjects(groupRef.current.children, false)

    if (intersects.length > 0) {
      // Get the cube
      const cube = intersects[0].object
      const index = cube.userData.index

      if (index !== undefined && index < data.length) {
        const cell = data[index]
        const x = offsetX + cell.col
        const z = offsetZ + cell.row

        // Set the hovered cube
        setHoveredCube({
          index,
          position: [x, 0, z],
        })

        return
      }
    }

    // No intersection, clear hover state
    setHoveredCube(null)
  })

  return (
    <group ref={groupRef}>
      {data.map((cell, index) => {
        const x = offsetX + cell.col
        const z = offsetZ + cell.row
        const height = 0.2 + cell.count * 0.15
        const color = getColor(cell.count, theme)

        return (
          <mesh
            key={index}
            position={[x, height / 2, z]}
            scale={[0.9, height, 0.9]}
            castShadow
            receiveShadow
            userData={{ index }}
          >
            <boxGeometry />
            <meshStandardMaterial color={color} metalness={0.1} roughness={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}

// Tooltip for hovered cube
function HoverInfo({
  count,
  position,
  theme,
}: { count: number; position: [number, number, number]; theme: ColorTheme }) {
  const color = getColor(count, theme)

  return (
    <group position={[position[0], position[1] + 1.5, position[2]]}>
      <mesh position={[0, 0.4, 0]} scale={[0.3, 0.3, 0.3]}>
        <boxGeometry />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text
        position={[0, 0.2, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {getIntensityLabel(count)}
      </Text>
      <Text
        position={[0, 0, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        Level: {count}
      </Text>
    </group>
  )
}

// Legend component
function Legend({ theme }: { theme: ColorTheme }) {
  const colors = [0, 2, 5, 8, 10].map((count) => getColor(count, theme))

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

// Grid component that contains all cubes
function Grid({
  pattern,
  timeRef,
  theme,
  performanceMode,
  showStats,
}: {
  pattern: PatternType
  timeRef: React.MutableRefObject<number>
  theme: ColorTheme
  performanceMode: PerformanceMode
  showStats: boolean
}) {
  // Get cell counts based on performance mode
  const { columns, rows } = CELL_COUNTS[performanceMode]

  const [data, setData] = useState<Array<{ col: number; row: number; count: number }>>([])
  const [hoveredCube, setHoveredCube] = useState<{ index: number; position: [number, number, number] } | null>(null)

  // Use ref to track last update time to avoid too frequent updates
  const lastUpdateTimeRef = useRef(0)

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

  // Initialize data once
  useEffect(() => {
    setData(generatePattern(pattern, timeRef.current))
  }, [pattern, performanceMode]) // Re-run when pattern or performance mode changes

  // Update animation with throttling to prevent too many state updates
  useFrame(() => {
    timeRef.current += 0.05

    // Only update data every 100ms to avoid too frequent state changes
    // Adjust update frequency based on performance mode
    const updateInterval = {
      low: 100,
      medium: 150,
      high: 200,
      ultra: 250,
    }[performanceMode]

    const currentTime = Date.now()
    if (currentTime - lastUpdateTimeRef.current > updateInterval) {
      setData(generatePattern(pattern, timeRef.current))
      lastUpdateTimeRef.current = currentTime
    }
  })

  // Grid dimensions
  const gridWidth = columns
  const gridHeight = rows

  // Memoize the particle system to prevent unnecessary re-renders
  const particleSystem = useMemo(() => {
    if (data.length === 0) return null
    return (
      <ParticleSystem
        data={data}
        theme={theme}
        gridWidth={gridWidth}
        gridHeight={gridHeight}
        performanceMode={performanceMode}
      />
    )
  }, [data.length > 0, theme, performanceMode]) // Only re-create when data becomes available, theme changes, or performance mode changes

  return (
    <group>
      {/* Individual cubes for better color control */}
      {data.length > 0 && (
        <Cubes
          data={data}
          theme={theme}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          setHoveredCube={setHoveredCube}
        />
      )}

      {/* Particle system */}
      {particleSystem}

      {/* Show tooltip for hovered cube */}
      {hoveredCube !== null && data[hoveredCube.index] && (
        <HoverInfo count={data[hoveredCube.index].count} position={hoveredCube.position} theme={theme} />
      )}

      {/* Add a base plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[gridWidth + 2, gridHeight + 2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Performance stats */}
      {showStats && <Stats />}
    </group>
  )
}

// Main 3D scene component
function Scene({
  pattern,
  theme,
  performanceMode,
  showStats,
}: {
  pattern: PatternType
  theme: ColorTheme
  performanceMode: PerformanceMode
  showStats: boolean
}) {
  const timeRef = useRef(0)

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <Grid pattern={pattern} timeRef={timeRef} theme={theme} performanceMode={performanceMode} showStats={showStats} />
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

export function HeatMap3D() {
  const [pattern, setPattern] = useState<PatternType>("waves")
  const [theme, setTheme] = useState<ColorTheme>("github")
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>("medium")
  const [showStats, setShowStats] = useState(false)

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
          Pattern: {pattern} | Theme: {theme} | Cells: {CELL_COUNTS[performanceMode].columns}×
          {CELL_COUNTS[performanceMode].rows}
        </h1>
      </div>

      <Canvas camera={{ position: [0, 15, 25], fov: 50 }} className="w-full h-full" shadows>
        <color attach="background" args={["#121212"]} />
        <fog attach="fog" args={["#121212", 30, 60]} />
        <Scene pattern={pattern} theme={theme} performanceMode={performanceMode} showStats={showStats} />
      </Canvas>

      {/* Performance mode selection */}
      <div className="absolute top-16 left-0 right-0 z-10 flex justify-center gap-3">
        <button
          className={`px-4 py-2 rounded-lg ${performanceMode === "low" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setPerformanceMode("low")}
        >
          Low (450 cells)
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${performanceMode === "medium" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setPerformanceMode("medium")}
        >
          Medium (1,250 cells)
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${performanceMode === "high" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setPerformanceMode("high")}
        >
          High (3,200 cells)
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${performanceMode === "ultra" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setPerformanceMode("ultra")}
        >
          Ultra (5,000 cells)
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${showStats ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setShowStats(!showStats)}
        >
          {showStats ? "Hide Stats" : "Show Stats"}
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
          onClick={() => setTheme("github")}
          style={{ borderBottom: "3px solid #40c463" }}
        >
          GitHub
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${theme === "heat" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setTheme("heat")}
          style={{ borderBottom: "3px solid #e64a19" }}
        >
          Heat
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${theme === "ocean" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setTheme("ocean")}
          style={{ borderBottom: "3px solid #1976d2" }}
        >
          Ocean
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${theme === "rainbow" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setTheme("rainbow")}
          style={{ borderBottom: "3px solid #ff00ff" }}
        >
          Rainbow
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${theme === "monochrome" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setTheme("monochrome")}
          style={{ borderBottom: "3px solid #888888" }}
        >
          Mono
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${theme === "purple" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setTheme("purple")}
          style={{ borderBottom: "3px solid #9c27b0" }}
        >
          Purple
        </button>
      </div>
    </div>
  )
}

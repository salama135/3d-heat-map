"use client"

import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Text, Environment } from "@react-three/drei"
import * as THREE from "three"
import { Slider } from "@/components/ui/slider"

// Define pattern types
type PatternType = "waves" | "ripples" | "gradient" | "checkerboard" | "spiral"

// Define color themes
type ColorTheme = "github" | "heat" | "ocean" | "rainbow" | "monochrome" | "purple"

// Get color based on count and theme
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

// ShaderMaterial implementation
function createShaderMaterial(
  pattern: PatternType,
  theme: ColorTheme,
  resolution: [number, number],
  animationSpeed: number,
) {
  // Convert pattern to index
  const patternIndex = {
    waves: 0,
    ripples: 1,
    gradient: 2,
    checkerboard: 3,
    spiral: 4,
  }[pattern]

  // Create color arrays for the shader
  const themeColors = [0, 2, 5, 8, 10].map((count) => {
    const color = new THREE.Color(getColor(count, theme))
    return [color.r, color.g, color.b]
  })

  // Flatten the color array for the shader
  const colorArray = themeColors.flat()

  // Vertex shader
  const vertexShader = `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  // Fragment shader
  const fragmentShader = `
    uniform float time;
    uniform int pattern;
    uniform vec3 colors[5];
    uniform vec2 resolution;
    uniform float animationSpeed;
    
    varying vec2 vUv;
    
    // Get color based on value
    vec3 getThemeColor(float value) {
      if (value < 0.05) return colors[0];
      if (value < 0.25) return colors[1];
      if (value < 0.5) return colors[2];
      if (value < 0.75) return colors[3];
      return colors[4];
    }
    
    // Generate pattern value
    float getPatternValue(vec2 pos, int patternType, float time) {
      // Scale coordinates to match grid size
      vec2 scaledPos = pos * resolution;
      
      // Center coordinates
      vec2 center = resolution * 0.5;
      
      // Waves pattern
      if (patternType == 0) {
        float value = sin(scaledPos.x * 0.2 + time) + sin(scaledPos.y * 0.2 + time);
        return (value + 2.0) / 4.0; // Map from [-2, 2] to [0, 1]
      }
      // Ripples pattern
      else if (patternType == 1) {
        vec2 centered = scaledPos - center;
        float dist = length(centered);
        float value = sin(dist * 0.5 - time);
        return (value + 1.0) / 2.0; // Map from [-1, 1] to [0, 1]
      }
      // Gradient pattern
      else if (patternType == 2) {
        float gradValue = mod(scaledPos.x + scaledPos.y + time * 5.0, resolution.x) / resolution.x;
        return gradValue;
      }
      // Checkerboard pattern
      else if (patternType == 3) {
        float timeOffset = floor(time * 0.2);
        float isEven = mod(floor(scaledPos.x) + floor(scaledPos.y) + timeOffset, 2.0);
        return isEven;
      }
      // Spiral pattern
      else if (patternType == 4) {
        vec2 centered = scaledPos - center;
        float angle = atan(centered.y, centered.x);
        float dist = length(centered);
        float spiralValue = mod(angle + dist * 0.1 + time * 0.5, 6.28) / 6.28;
        return spiralValue;
      }
      
      return 0.5; // Default
    }
    
    void main() {
      // Get pattern value
      float value = getPatternValue(vUv, pattern, time * animationSpeed);
      
      // Get color based on value
      vec3 color = getThemeColor(value);
      
      // Add cell grid effect
      vec2 cellSize = 1.0 / resolution;
      vec2 cellPos = fract(vUv * resolution);
      float edge = 0.05; // Border width
      
      // Create grid lines
      float border = 
        step(edge, cellPos.x) * 
        step(edge, cellPos.y) * 
        step(edge, 1.0 - cellPos.x) * 
        step(edge, 1.0 - cellPos.y);
      
      // Darken borders slightly
      color = mix(color * 0.8, color, border);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `

  // Create shader material
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      pattern: { value: patternIndex },
      colors: { value: colorArray },
      resolution: { value: resolution },
      animationSpeed: { value: animationSpeed },
    },
    vertexShader,
    fragmentShader,
  })
}

// ShaderPlane component
function ShaderPlane({
  pattern,
  theme,
  resolution = [100, 50],
  animationSpeed,
}: {
  pattern: PatternType
  theme: ColorTheme
  resolution: [number, number]
  animationSpeed: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const { viewport } = useThree()

  // Create shader material
  useEffect(() => {
    if (meshRef.current) {
      const material = createShaderMaterial(pattern, theme, resolution, animationSpeed)
      meshRef.current.material = material
      materialRef.current = material
    }
  }, [pattern, theme, resolution, animationSpeed])

  // Update time uniform
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[viewport.width, viewport.height, 1, 1]} />
    </mesh>
  )
}

// Fallback visualization using instanced meshes
function InstancedCubes({
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
  const [columns, rows] = resolution
  const timeRef = useRef(0)
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const tempObject = new THREE.Object3D()
  const tempColor = new THREE.Color()
  const { viewport } = useThree()

  // Generate pattern based on selected type and current time
  const generatePattern = (patternType: PatternType, time: number) => {
    const centerX = columns / 2
    const centerY = rows / 2

    for (let i = 0; i < columns * rows; i++) {
      const col = i % columns
      const row = Math.floor(i / columns)
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

      // Calculate position
      const width = viewport.width * 0.8
      const height = viewport.height * 0.8
      const cellWidth = width / columns
      const cellHeight = height / rows

      const x = -width / 2 + col * cellWidth + cellWidth / 2
      const z = -height / 2 + row * cellHeight + cellHeight / 2
      const y = count * 0.05 // Height based on count

      // Set position and scale
      tempObject.position.set(x, y / 2, z)
      tempObject.scale.set(cellWidth * 0.9, y || 0.05, cellHeight * 0.9)
      tempObject.updateMatrix()

      // Update instance
      if (meshRef.current) {
        meshRef.current.setMatrixAt(i, tempObject.matrix)

        // Set color
        tempColor.set(getColor(count, theme))
        meshRef.current.setColorAt(i, tempColor)
      }
    }

    // Update instance mesh
    if (meshRef.current) {
      meshRef.current.instanceMatrix.needsUpdate = true
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true
      }
    }
  }

  // Animation
  useFrame(() => {
    timeRef.current += 0.05 * animationSpeed
    generatePattern(pattern, timeRef.current)
  })

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
  useShader,
  animationSpeed,
}: {
  pattern: PatternType
  theme: ColorTheme
  resolution: [number, number]
  useShader: boolean
  animationSpeed: number
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

      {useShader ? (
        <ShaderPlane pattern={pattern} theme={theme} resolution={resolution} animationSpeed={animationSpeed} />
      ) : (
        <InstancedCubes pattern={pattern} theme={theme} resolution={resolution} animationSpeed={animationSpeed} />
      )}

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
export function HeatMapShader() {
  const [pattern, setPattern] = useState<PatternType>("waves")
  const [theme, setTheme] = useState<ColorTheme>("github")
  const [resolution, setResolution] = useState<"low" | "medium" | "high" | "ultra">("medium")
  const [useShader, setUseShader] = useState(true)
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
          useShader={useShader}
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
      </div>

      {/* Resolution and rendering mode selection */}
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
        <button
          className={`px-4 py-2 rounded-lg ${useShader ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setUseShader(!useShader)}
        >
          {useShader ? "Shader Mode" : "Instance Mode"}
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

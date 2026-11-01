"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { ControlPanel } from "@/components/control-panel"
import { Stage } from "@/components/stage"
import { type AntConfig, createAntId, createDefaultAnt, type DirectionValue, randomRules } from "@/lib/ant"
import { type Camera, createRenderer, type Renderer } from "@/lib/renderer"
import { DEFAULT_WORLD, MAX_GRID, readWorldFromLocation, type WorldConfig, writeWorldToLocation } from "@/lib/share"
import { FrameTimer, MAX_IPF, Simulation } from "@/lib/simulation"
import { EMPTY_STATS, type SimulationStats } from "@/lib/stats"
import { textureToPngBlob } from "@/lib/texture-export"
import { basePath, clamp, cn, measureData, round } from "@/lib/utils"

const SEED_ITERATIONS = 15000

function cloneWorld(world: WorldConfig): WorldConfig {
	return {
		...world,
		ants: world.ants.map(ant => ({ ...ant, rules: [...ant.rules] })),
	}
}

function worldSignature(world: WorldConfig) {
	return JSON.stringify({
		width: world.width,
		height: world.height,
		ants: world.ants.map(ant => [ant.x, ant.y, ant.dx, ant.dy, ant.rules, ant.wrap, ant.stepSize, ant.enabled]),
	})
}

async function copyText(text: string) {
	if (!navigator.clipboard?.writeText) {
		return false
	}

	try {
		await navigator.clipboard.writeText(text)
		return true
	}
	catch {
		return false
	}
}

function viewScale(canvasWidth: number, canvasHeight: number, gridWidth: number, gridHeight: number) {
	const canvasAspect = canvasWidth / Math.max(1, canvasHeight)
	const gridAspect = gridWidth / Math.max(1, gridHeight)

	if (canvasAspect > gridAspect) {
		return { x: gridAspect / canvasAspect, y: 1 }
	}

	return { x: 1, y: canvasAspect / gridAspect }
}

function clampCamera(camera: Camera, canvas: HTMLCanvasElement | null, gridWidth: number, gridHeight: number) {
	if (!canvas || gridWidth <= 0 || gridHeight <= 0) {
		return
	}

	const scale = viewScale(canvas.width, canvas.height, gridWidth, gridHeight)
	const halfX = 0.5 / Math.max(0.0001, camera.zoom * scale.x)
	const halfY = 0.5 / Math.max(0.0001, camera.zoom * scale.y)

	// If an axis fits entirely, keep it centered. Otherwise clamp the camera so
	// the viewport stays inside the grid; letting the center reach 0 here made
	// border-zoom jump to 0, 0.
	camera.x = halfX >= 0.5 ? 0.5 : clamp(camera.x, halfX, 1 - halfX)
	camera.y = halfY >= 0.5 ? 0.5 : clamp(camera.y, halfY, 1 - halfY)
}

export function Simulator() {
	const [world, setWorld] = useState<WorldConfig>(() => cloneWorld(DEFAULT_WORLD))
	const [selectedId, setSelectedId] = useState<string | null>(DEFAULT_WORLD.ants[0]?.id ?? null)
	const [running, setRunning] = useState(false)
	const [ipf, setIpf] = useState(10)
	const [antialias, setAntialias] = useState(true)
	const [pixelGrid, setPixelGrid] = useState(false)
	const [stats, setStats] = useState<SimulationStats>(EMPTY_STATS)
	const [error, setError] = useState<string | null>(null)
	const [toast, setToast] = useState<string | null>(null)
	const [rendererReady, setRendererReady] = useState(false)
	const [booted, setBooted] = useState(false)

	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const rendererRef = useRef<Renderer | null>(null)
	const simRef = useRef<Simulation | null>(null)
	if (!simRef.current) {
		simRef.current = new Simulation()
	}

	const cameraRef = useRef<Camera>({ x: 0.5, y: 0.5, zoom: 1 })
	const antialiasRef = useRef(true)
	const pixelGridRef = useRef(false)
	const runningRef = useRef(false)
	const ipfRef = useRef(ipf)
	const fpsRef = useRef(0)
	const dirtyRef = useRef(true)
	const seededRef = useRef(false)
	const sharedLoadedRef = useRef(false)
	const linkReadyRef = useRef(false)
	const lastSignatureRef = useRef<string | null>(null)
	const toastTimerRef = useRef<number | null>(null)

	const selectedAnt = world.ants.find(ant => ant.id === selectedId) ?? null

	useEffect(() => {
		runningRef.current = running
	}, [running])

	useEffect(() => {
		ipfRef.current = ipf
	}, [ipf])

	useEffect(() => {
		antialiasRef.current = antialias
	}, [antialias])

	useEffect(() => {
		pixelGridRef.current = pixelGrid
	}, [pixelGrid])

	const notify = useCallback((message: string) => {
		setToast(message)
		if (toastTimerRef.current !== null) {
			window.clearTimeout(toastTimerRef.current)
		}
		toastTimerRef.current = window.setTimeout(() => setToast(null), 2400)
	}, [])

	useEffect(() => {
		return () => {
			if (toastTimerRef.current !== null) {
				window.clearTimeout(toastTimerRef.current)
			}
		}
	}, [])

	const refreshStats = useCallback(() => {
		const sim = simRef.current
		if (!sim) {
			return
		}

		const fps = fpsRef.current
		const isRunning = runningRef.current

		setStats({
			fps,
			ips: isRunning ? fps * ipfRef.current : 0,
			iterations: sim.totalIterations,
			liveAnts: sim.ants.length,
			buffer: measureData(sim.bufferBytes),
			bandwidth: isRunning ? `${measureData(sim.bufferBytes * fps)}/s` : "0B/s",
			camera: {
				x: round(cameraRef.current.x * sim.size_x, 1),
				y: round(cameraRef.current.y * sim.size_y, 1),
				zoom: round(cameraRef.current.zoom, 2),
			},
		})
	}, [])

	// Read a shared world once, before the first frame is configured.
	useEffect(() => {
		const shared = readWorldFromLocation(window.location.search)

		if (shared) {
			sharedLoadedRef.current = true
			setWorld(shared)
			setSelectedId(shared.ants[0]?.id ?? null)
		}

		setBooted(true)
	}, [])

	// Keep the simulation engine in sync with the React world.
	useEffect(() => {
		if (!booted) {
			return
		}

		const signature = worldSignature(world)
		if (lastSignatureRef.current === signature) {
			return
		}
		lastSignatureRef.current = signature

		const sim = simRef.current
		if (!sim) {
			return
		}

		sim.resize(world.width, world.height)
		sim.setAnts(world.ants)
		clampCamera(cameraRef.current, canvasRef.current, sim.size_x, sim.size_y)

		if (!seededRef.current) {
			seededRef.current = true
			if (!sharedLoadedRef.current) {
				sim.update(SEED_ITERATIONS)
			}
		}

		dirtyRef.current = true
		refreshStats()

		if (linkReadyRef.current) {
			writeWorldToLocation(world)
		}
		else {
			linkReadyRef.current = true
		}
	}, [booted, world, refreshStats])

	// Build the WebGL renderer once the canvas exists.
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) {
			return
		}

		let cancelled = false
		const prefix = basePath()
		setError(null)

		Promise.all([
			fetch(`${prefix}/shaders/vertex.vert`).then(response => {
				if (!response.ok) {
					throw new Error(`Could not load the vertex shader (${response.status})`)
				}

				return response.text()
			}),
			fetch(`${prefix}/shaders/fragment.frag`).then(response => {
				if (!response.ok) {
					throw new Error(`Could not load the fragment shader (${response.status})`)
				}

				return response.text()
			}),
		])
			.then(([vertex, fragment]) => {
				if (cancelled) {
					return
				}

				const renderer = createRenderer(canvas, vertex, fragment)
				rendererRef.current = renderer

				const rect = canvas.getBoundingClientRect()
				const width = Math.max(1, Math.round(rect.width))
				const height = Math.max(1, Math.round(rect.height))
				canvas.width = width
				canvas.height = height
				renderer.resize(width, height)

				const sim = simRef.current
				if (sim) {
					clampCamera(cameraRef.current, canvas, sim.size_x, sim.size_y)
					refreshStats()
				}

				dirtyRef.current = true
				setRendererReady(true)
			})
			.catch((exception: unknown) => {
				if (cancelled) {
					return
				}

				setError(exception instanceof Error ? exception.message : String(exception))
			})

		return () => {
			cancelled = true
			rendererRef.current?.dispose()
			rendererRef.current = null
		}
	}, [])

	// Keep the drawing buffer matched to its CSS box.
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) {
			return
		}

		const target = canvas.parentElement ?? canvas
		const observer = new ResizeObserver(() => {
			const rect = canvas.getBoundingClientRect()
			const width = Math.max(1, Math.round(rect.width))
			const height = Math.max(1, Math.round(rect.height))
			if (canvas.width === width && canvas.height === height) {
				return
			}

			canvas.width = width
			canvas.height = height
			rendererRef.current?.resize(width, height)

			const sim = simRef.current
			if (sim) {
				clampCamera(cameraRef.current, canvas, sim.size_x, sim.size_y)
				refreshStats()
			}

			dirtyRef.current = true
		})

		observer.observe(target)
		return () => observer.disconnect()
	}, [])

	// Main render loop.
	useEffect(() => {
		if (!rendererReady) {
			return
		}

		let frame = 0
		let last = performance.now()
		let lastStats = 0
		const timer = new FrameTimer()

		const loop = (time: number) => {
			const delta = time - last
			last = time

			timer.addSample(delta)
			timer.update()

			if (timer.sampleIndex === 0) {
				timer.sampleCount = Math.round(clamp(timer.fps, 32, 512) * 0.5)
			}

			const sim = simRef.current
			const renderer = rendererRef.current

			if (sim) {
				if (runningRef.current) {
					sim.update(ipfRef.current)
					dirtyRef.current = true

					if (sim.ants.length === 0) {
						runningRef.current = false
						setRunning(false)
					}
				}

				if (renderer && sim.size_x > 0 && sim.size_y > 0) {
					renderer.draw(cameraRef.current, sim.size_x, sim.size_y, sim.grid, dirtyRef.current || runningRef.current, antialiasRef.current, pixelGridRef.current)
					dirtyRef.current = false
				}
			}

			if (time - lastStats > 200) {
				lastStats = time
				fpsRef.current = timer.fps
				refreshStats()
			}

			frame = requestAnimationFrame(loop)
		}

		frame = requestAnimationFrame(loop)
		return () => cancelAnimationFrame(frame)
	}, [rendererReady, refreshStats])

	const toggleRunning = useCallback(() => {
		const sim = simRef.current
		if (!sim) {
			return
		}

		if (runningRef.current) {
			runningRef.current = false
			setRunning(false)
			refreshStats()
			return
		}

		if (sim.templates.length === 0) {
			notify("Add or enable an ant first")
			return
		}

		if (sim.ants.length === 0) {
			sim.reset()
			dirtyRef.current = true
		}

		runningRef.current = true
		setRunning(true)
		refreshStats()
	}, [notify, refreshStats])

	const step = useCallback(() => {
		const sim = simRef.current
		if (!sim) {
			return
		}

		if (sim.templates.length === 0) {
			notify("Add or enable an ant first")
			return
		}

		if (sim.ants.length === 0) {
			sim.reset()
		}

		sim.update(ipfRef.current)
		dirtyRef.current = true
		refreshStats()
	}, [notify, refreshStats])

	const reset = useCallback(() => {
		const sim = simRef.current
		if (!sim) {
			return
		}

		sim.reset()
		dirtyRef.current = true

		runningRef.current = false
		setRunning(false)
		refreshStats()
	}, [refreshStats])

	const resetCamera = useCallback(() => {
		cameraRef.current = { x: 0.5, y: 0.5, zoom: 1 }
		refreshStats()
	}, [refreshStats])

	const saveImage = useCallback(() => {
		const sim = simRef.current
		if (!sim || sim.size_x <= 0 || sim.size_y <= 0) {
			return
		}

		void textureToPngBlob(sim.grid, sim.size_x, sim.size_y).then((blob) => {
			if (!blob) {
				notify("Could not create the texture PNG")
				return
			}

			const link = document.createElement("a")
			link.download = `langtons-ant_texture_${sim.size_x}x${sim.size_y}_${sim.totalIterations}.png`
			link.href = URL.createObjectURL(blob)
			link.click()

			window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
			notify("Texture saved as PNG")
		})
	}, [notify])

	const copyLink = useCallback(async () => {
		const copied = await copyText(window.location.href)
		notify(copied ? "Link copied to clipboard" : "Could not copy — copy the URL from the address bar")
	}, [notify])

	function updateAnt(patch: Partial<AntConfig>) {
		if (!selectedId) {
			return
		}

		setWorld(current => ({
			...current,
			ants: current.ants.map(ant => {
				if (ant.id !== selectedId) {
					return ant
				}

				return {
					...ant,
					...patch,
					x: patch.x === undefined ? ant.x : clamp(Math.round(patch.x), 0, current.width - 1),
					y: patch.y === undefined ? ant.y : clamp(Math.round(patch.y), 0, current.height - 1),
				}
			}),
		}))
	}

	function replaceRules(rules: DirectionValue[]) {
		if (!selectedId) {
			return
		}

		updateAnt({ rules })
	}

	function addAnt() {
		const ant: AntConfig = {
			...createDefaultAnt(world.width, world.height),
			rules: randomRules(),
			wrap: true,
		}

		setWorld(current => ({ ...current, ants: [...current.ants, ant] }))
		setSelectedId(ant.id)
	}

	function cloneAnt() {
		if (!selectedAnt) {
			return
		}

		const clone: AntConfig = {
			...selectedAnt,
			id: createAntId(),
			rules: [...selectedAnt.rules],
		}

		setWorld(current => ({ ...current, ants: [...current.ants, clone] }))
		setSelectedId(clone.id)
	}

	function removeAnt() {
		if (!selectedId) {
			return
		}

		const index = world.ants.findIndex(ant => ant.id === selectedId)
		const ants = world.ants.filter(ant => ant.id !== selectedId)

		setWorld(current => ({ ...current, ants: current.ants.filter((ant) => ant.id !== selectedId) }))
		setSelectedId(ants[Math.min(index, ants.length - 1)]?.id ?? null)
	}

	function resize(width: number, height: number) {
		const nextWidth = clamp(Math.round(width), 3, MAX_GRID)
		const nextHeight = clamp(Math.round(height), 3, MAX_GRID)

		setWorld(current => {
			if (current.width === nextWidth && current.height === nextHeight) {
				return current
			}

			return {
				width: nextWidth,
				height: nextHeight,
				ants: current.ants.map(ant => ({
					...ant,
					x: clamp(Math.round(ant.x * nextWidth / current.width), 0, nextWidth - 1),
					y: clamp(Math.round(ant.y * nextHeight / current.height), 0, nextHeight - 1),
				})),
			}
		})
	}

	function changeIpf(next: number) {
		const value = clamp(Math.round(next), 1, MAX_IPF)
		ipfRef.current = value
		setIpf(value)
	}

	// Pointer panning, cursor-anchored zoom and camera clamping.
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) {
			return
		}
		const canvasElement: HTMLCanvasElement = canvas

		let dragging = false
		let lastX = 0
		let lastY = 0
		let activePointer = -1

		function handlePointerDown(event: PointerEvent) {
			if (event.button !== 0) {
				return
			}

			dragging = true
			lastX = event.clientX
			lastY = event.clientY
			activePointer = event.pointerId

			try {
				canvasElement.setPointerCapture(event.pointerId)
			}
			catch {
				// Some browsers reject capture for synthetic or already-released pointers.
			}
		}

		function handlePointerMove(event: PointerEvent) {
			if (!dragging) {
				return
			}

			const sim = simRef.current
			if (!sim) {
				return
			}

			const rect = canvasElement.getBoundingClientRect()
			const scale = viewScale(rect.width, rect.height, sim.size_x, sim.size_y)
			const camera = cameraRef.current

			const dx = event.clientX - lastX
			const dy = event.clientY - lastY
			lastX = event.clientX
			lastY = event.clientY

			camera.x -= (dx / Math.max(1, rect.width)) / (camera.zoom * scale.x)
			camera.y -= (dy / Math.max(1, rect.height)) / (camera.zoom * scale.y)

			clampCamera(camera, canvasElement, sim.size_x, sim.size_y)
			refreshStats()
		}

		function handlePointerEnd(event: PointerEvent) {
			if (!dragging) {
				return
			}

			dragging = false

			if (event.pointerId === activePointer && canvasElement.hasPointerCapture(event.pointerId)) {
				try {
					canvasElement.releasePointerCapture(event.pointerId)
				}
				catch {
					// Ignore a pointer that was already released by the browser.
				}
			}

			activePointer = -1
		}

		function handleWheel(event: WheelEvent) {
			event.preventDefault()

			const sim = simRef.current
			if (!sim) {
				return
			}

			const rect = canvasElement.getBoundingClientRect()
			const scale = viewScale(rect.width, rect.height, sim.size_x, sim.size_y)
			const camera = cameraRef.current
			const oldZoom = camera.zoom
			const newZoom = clamp(oldZoom * Math.exp(-event.deltaY * 0.0015), 0.5, 64)

			const cursorX = (event.clientX - rect.left) / Math.max(1, rect.width)
			const cursorY = (event.clientY - rect.top) / Math.max(1, rect.height)

			camera.x += (cursorX - 0.5) * (1 / oldZoom - 1 / newZoom) / scale.x
			camera.y += (cursorY - 0.5) * (1 / oldZoom - 1 / newZoom) / scale.y
			camera.zoom = newZoom

			clampCamera(camera, canvasElement, sim.size_x, sim.size_y)
			refreshStats()
		}

		canvasElement.addEventListener("pointerdown", handlePointerDown)
		canvasElement.addEventListener("pointermove", handlePointerMove)
		canvasElement.addEventListener("pointerup", handlePointerEnd)
		canvasElement.addEventListener("pointercancel", handlePointerEnd)
		canvasElement.addEventListener("wheel", handleWheel, { passive: false })

		return () => {
			canvasElement.removeEventListener("pointerdown", handlePointerDown)
			canvasElement.removeEventListener("pointermove", handlePointerMove)
			canvasElement.removeEventListener("pointerup", handlePointerEnd)
			canvasElement.removeEventListener("pointercancel", handlePointerEnd)
			canvasElement.removeEventListener("wheel", handleWheel)
		}
	}, [refreshStats])

	// Keyboard shortcuts.
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
				return
			}

			if (document.querySelector("[role=\"dialog\"]")) {
				return
			}

			const target = event.target
			if (target instanceof Element && target.closest("input, textarea, select, button, a, summary, [contenteditable='true']")) {
				return
			}

			if (event.code === "Space") {
				event.preventDefault()
				toggleRunning()
				return
			}

			const key = event.key.toLowerCase()

			if (key === "s") {
				event.preventDefault()
				step()
			}
			else if (key === "r") {
				event.preventDefault()
				reset()
			}
			else if (key === "c") {
				event.preventDefault()
				resetCamera()
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [reset, resetCamera, step, toggleRunning])

	return (
		<>
			<main className="grid h-full w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] max-lg:h-auto">
				<Stage
					canvasRef={canvasRef}
					running={running}
					error={error}
					onToggleRun={toggleRunning}
					onStep={step}
					onReset={reset}
					onResetCamera={resetCamera}
					onSaveImage={saveImage}
					onCopyLink={copyLink}
				/>
				<ControlPanel
					world={world}
					selectedId={selectedId}
					selectedAnt={selectedAnt}
					running={running}
					ipf={ipf}
					stats={stats}
					antialias={antialias}
					pixelGrid={pixelGrid}
					onSelectAnt={setSelectedId}
					onAddAnt={addAnt}
					onCloneAnt={cloneAnt}
					onRemoveAnt={removeAnt}
					onUpdateAnt={updateAnt}
					onReplaceRules={replaceRules}
					onResize={resize}
					onIpfChange={changeIpf}
					onAntialiasChange={setAntialias}
					onPixelGridChange={setPixelGrid}
				/>
			</main>

			<div
				role="status"
				aria-live="polite"
				className={cn(
					"fixed bottom-24 left-1/2 z-[100] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-panel border border-line-strong bg-surface-raised px-3 py-2 text-xs text-fg shadow-toast transition-opacity duration-150",
					toast ? "opacity-100" : "pointer-events-none opacity-0",
				)}
			>
				{toast}
			</div>
		</>
	)
}

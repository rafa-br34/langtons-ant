"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { ControlPanel } from "@/components/control-panel"
import { Stage } from "@/components/stage"
import { type AntConfig, createAntId, createDefaultAnt, type DirectionValue, randomRules } from "@/lib/ant"
import { type Camera, createRenderer, type Renderer } from "@/lib/renderer"
import { DEFAULT_WORLD, MAX_GRID, readWorldFromLocation, type WorldConfig, writeWorldToLocation } from "@/lib/share"
import { FrameTimer, MAX_IPF, Simulation } from "@/lib/simulation"
import { EMPTY_STATS, type SimulationStats } from "@/lib/stats"
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
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text)
			return true
		}
		catch {
			// Fall back to the legacy clipboard path below.
		}
	}

	const area = document.createElement("textarea")
	area.value = text
	area.setAttribute("readonly", "")
	area.style.position = "fixed"
	area.style.opacity = "0"
	document.body.append(area)
	area.select()

	try {
		return document.execCommand("copy")
	}
	catch {
		return false
	}
	finally {
		area.remove()
	}
}

export function Simulator() {
	const [world, setWorld] = useState<WorldConfig>(() => cloneWorld(DEFAULT_WORLD))
	const [selectedId, setSelectedId] = useState<string | null>(DEFAULT_WORLD.ants[0]?.id ?? null)
	const [running, setRunning] = useState(false)
	const [ipf, setIpf] = useState(10)
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

	const cameraRef = useRef<Camera>({ x: 0, y: 0, z: 0 })
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
				x: round(cameraRef.current.x, 3),
				y: round(cameraRef.current.y, 3),
				z: round(cameraRef.current.z, 3),
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
		if (!canvas) return

		let cancelled = false
		const prefix = basePath()

		Promise.all([
			fetch(`${prefix}/shaders/vertex.vert`).then((response) => {
				if (!response.ok) throw new Error(`Could not load the vertex shader (${response.status})`)
				return response.text()
			}),
			fetch(`${prefix}/shaders/fragment.frag`).then((response) => {
				if (!response.ok) throw new Error(`Could not load the fragment shader (${response.status})`)
				return response.text()
			}),
		])
			.then(([vertex, fragment]) => {
				if (cancelled) return

				const renderer = createRenderer(canvas, vertex, fragment)
				rendererRef.current = renderer

				const width = Math.max(1, Math.floor(canvas.getBoundingClientRect().width))
				canvas.width = width
				canvas.height = width
				renderer.resize(width, width)

				dirtyRef.current = true
				setRendererReady(true)
			})
			.catch((exception: unknown) => {
				if (cancelled) return
				setError(exception instanceof Error ? exception.message : String(exception))
			})

		return () => {
			cancelled = true
			rendererRef.current?.dispose()
			rendererRef.current = null
		}
	}, [])

	// Keep the drawing buffer square and matched to its CSS box.
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		const target = canvas.parentElement ?? canvas
		const observer = new ResizeObserver(() => {
			const width = Math.max(1, Math.floor(canvas.getBoundingClientRect().width))
			if (canvas.width === width && canvas.height === width) return

			canvas.width = width
			canvas.height = width
			rendererRef.current?.resize(width, width)
			dirtyRef.current = true
		})

		observer.observe(target)
		return () => observer.disconnect()
	}, [])

	// Main render loop.
	useEffect(() => {
		if (!rendererReady) return

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

				if (renderer && sim.width > 0 && sim.height > 0) {
					renderer.draw(cameraRef.current, sim.width, sim.height, sim.grid, dirtyRef.current || runningRef.current)
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
		if (!sim) return

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
		if (!sim) return

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
		if (!sim) return

		sim.reset()
		dirtyRef.current = true

		runningRef.current = false
		setRunning(false)
		refreshStats()
	}, [refreshStats])

	const resetCamera = useCallback(() => {
		cameraRef.current = { x: 0, y: 0, z: 0 }
		refreshStats()
	}, [refreshStats])

	const saveImage = useCallback(() => {
		const canvas = canvasRef.current
		const sim = simRef.current
		const renderer = rendererRef.current

		if (!canvas || !sim || !renderer) return
		if (sim.width <= 0 || sim.height <= 0) return

		renderer.draw(cameraRef.current, sim.width, sim.height, sim.grid, true)

		canvas.toBlob((blob) => {
			if (!blob) {
				notify("Could not create the snapshot")
				return
			}

			const link = document.createElement("a")
			link.download = `langtons-ant_${sim.width}x${sim.height}_${sim.totalIterations}.png`
			link.href = URL.createObjectURL(blob)
			link.click()

			window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
			notify("Snapshot downloaded")
		}, "image/png")
	}, [notify])

	const copyLink = useCallback(async () => {
		const copied = await copyText(window.location.href)
		notify(copied ? "Link copied to clipboard" : "Could not copy — copy the URL from the address bar")
	}, [notify])

	function updateAnt(patch: Partial<AntConfig>) {
		if (!selectedId) return

		setWorld((current) => ({
			...current,
			ants: current.ants.map((ant) => {
				if (ant.id !== selectedId) return ant

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
		if (!selectedId) return
		updateAnt({ rules })
	}

	function addAnt() {
		const ant: AntConfig = {
			...createDefaultAnt(world.width, world.height),
			rules: randomRules(),
			wrap: true,
		}

		setWorld((current) => ({ ...current, ants: [...current.ants, ant] }))
		setSelectedId(ant.id)
	}

	function cloneAnt() {
		if (!selectedAnt) return

		const clone: AntConfig = {
			...selectedAnt,
			id: createAntId(),
			rules: [...selectedAnt.rules],
		}

		setWorld((current) => ({ ...current, ants: [...current.ants, clone] }))
		setSelectedId(clone.id)
	}

	function removeAnt() {
		if (!selectedId) return

		const index = world.ants.findIndex((ant) => ant.id === selectedId)
		const ants = world.ants.filter((ant) => ant.id !== selectedId)

		setWorld((current) => ({ ...current, ants: current.ants.filter((ant) => ant.id !== selectedId) }))
		setSelectedId(ants[Math.min(index, ants.length - 1)]?.id ?? null)
	}

	function resize(width: number, height: number) {
		const nextWidth = clamp(Math.round(width), 3, MAX_GRID)
		const nextHeight = clamp(Math.round(height), 3, MAX_GRID)

		setWorld((current) => {
			if (current.width === nextWidth && current.height === nextHeight) {
				return current
			}

			return {
				width: nextWidth,
				height: nextHeight,
				ants: current.ants.map((ant) => ({
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

	// Mouse and wheel camera controls.
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const canvasElement: HTMLCanvasElement = canvas

		function handlePointerMove(event: PointerEvent) {
			if ((event.buttons & 1) === 0) return

			const sim = simRef.current
			if (!sim) return

			const rect = canvasElement.getBoundingClientRect()
			const ratioX = sim.width / sim.height
			const ratioY = sim.height / sim.width
			const dx = event.movementX / (rect.width / 2)
			const dy = event.movementY / (rect.height / 2)

			if (ratioX > ratioY) {
				cameraRef.current.x += dx / ratioX
				cameraRef.current.y -= dy
			}
			else {
				cameraRef.current.x += dx
				cameraRef.current.y -= dy / ratioY
			}

			refreshStats()
		}

		function handleWheel(event: WheelEvent) {
			event.preventDefault()
			const rect = canvasElement.getBoundingClientRect()
			const zoom = (event.deltaY / (rect.height / 2)) * 0.2
			cameraRef.current.z += (cameraRef.current.z + 1) * zoom
			refreshStats()
		}

		canvasElement.addEventListener("pointermove", handlePointerMove)
		canvasElement.addEventListener("wheel", handleWheel, { passive: false })

		return () => {
			canvasElement.removeEventListener("pointermove", handlePointerMove)
			canvasElement.removeEventListener("wheel", handleWheel)
		}
	}, [refreshStats])

	// Keyboard shortcuts.
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
			if (document.querySelector("[role=\"dialog\"]")) return

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
			<main className="relative z-10 mx-auto grid w-full max-w-[1920px] flex-1 grid-cols-1 gap-3 p-3 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-3.5 lg:p-3.5">
				<Stage
					canvasRef={canvasRef}
					running={running}
					stats={stats}
					error={error}
					onToggleRun={toggleRunning}
					onStep={step}
					onReset={reset}
					onResetCamera={resetCamera}
					onSaveImage={saveImage}
				/>
				<ControlPanel
					world={world}
					selectedId={selectedId}
					selectedAnt={selectedAnt}
					running={running}
					ipf={ipf}
					onSelectAnt={setSelectedId}
					onAddAnt={addAnt}
					onCloneAnt={cloneAnt}
					onRemoveAnt={removeAnt}
					onUpdateAnt={updateAnt}
					onReplaceRules={replaceRules}
					onResize={resize}
					onIpfChange={changeIpf}
					onCopyLink={copyLink}
				/>
			</main>

			<div
				role="status"
				aria-live="polite"
				className={cn(
					"fixed bottom-14 left-1/2 z-[100] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-panel border border-line-strong bg-[#1b1b1b] px-3 py-2 text-[11px] text-fg shadow-[0_16px_44px_rgb(0_0_0/0.5)] transition-opacity duration-150",
					toast ? "opacity-100" : "pointer-events-none opacity-0",
				)}
			>
				{toast}
			</div>
		</>
	)
}

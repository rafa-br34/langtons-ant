"use client"

import type { RefObject } from "react"
import { Download, Pause, Play, RotateCcw, Scan, StepForward } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { SimulationStats } from "@/lib/stats"
import { cn, round } from "@/lib/utils"

interface StageProps {
	canvasRef: RefObject<HTMLCanvasElement | null>
	running: boolean
	stats: SimulationStats
	error: string | null
	onToggleRun: () => void
	onStep: () => void
	onReset: () => void
	onResetCamera: () => void
	onSaveImage: () => void
}

const STAT_ITEMS = [
	{ key: "iterations", label: "Iteration" },
	{ key: "liveAnts", label: "Live ants" },
	{ key: "fps", label: "FPS / IPS" },
	{ key: "buffer", label: "Grid buffer" },
	{ key: "bandwidth", label: "CPU → GPU" },
	{ key: "camera", label: "Camera" }
] as const

function formatCamera(camera: SimulationStats["camera"]) {
	return `${round(camera.x, 3)}, ${round(camera.y, 3)}, ${round(camera.z, 3)}`
}

export function Stage({
	canvasRef,
	running,
	stats,
	error,
	onToggleRun,
	onStep,
	onReset,
	onResetCamera,
	onSaveImage
}: StageProps) {
	const values: Record<(typeof STAT_ITEMS)[number]["key"], string> = {
		iterations: stats.iterations.toLocaleString("en-US"),
		liveAnts: String(stats.liveAnts),
		fps: `${stats.fps.toFixed(2)}/${stats.ips.toFixed(2)}`,
		buffer: stats.buffer,
		bandwidth: stats.bandwidth,
		camera: formatCamera(stats.camera)
	}

	return (
		<section
			id="simulator"
			aria-labelledby="stage-title"
			className="relative flex min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-gradient-to-b from-surface-raised to-[#181818] shadow-panel"
		>
			<h1 id="stage-title" className="sr-only">Langton&apos;s ant simulator</h1>

			<div className="pointer-events-none absolute inset-x-0 top-0 z-[4] h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent" />

			<div className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-b border-line bg-white/[0.014] px-3.5">
				<div className="flex min-w-0 items-center gap-2.5">
					<span className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">Simulation</span>
					<span
						className={cn(
							"inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[10.5px] whitespace-nowrap transition-colors",
							running
								? "border-accent/35 bg-accent-soft text-fg-1"
								: "border-line bg-black/20 text-muted"
						)}
					>
						<span
							className={cn(
								"size-1.5 rounded-full",
								running ? "animate-run-pulse bg-accent" : "bg-faint"
							)}
						/>
						{running ? "Running" : "Paused"}
					</span>
				</div>

				<div className="hidden items-center gap-3 text-[10px] whitespace-nowrap text-faint sm:flex">
					<span><kbd className="mr-1">Drag</kbd>pan</span>
					<span><kbd className="mr-1">Scroll</kbd>zoom</span>
					<span><kbd className="mr-1">Space</kbd>run</span>
				</div>
			</div>

			<div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden bg-void p-4 dot-grid [container-type:size] max-lg:aspect-square max-lg:h-auto max-lg:max-h-[560px] max-lg:flex-none max-sm:p-2.5">
				<div className="relative z-[1] aspect-square w-[min(100cqw,100cqh)] overflow-hidden rounded-[3px] border border-white/10 bg-black canvas-glow">
					<canvas
						ref={canvasRef}
						className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
						aria-label="Langton's ant grid rendering. Drag to pan and scroll to zoom."
					>
						Your browser does not support WebGL, which is required to render the simulation.
					</canvas>
				</div>

				<div className="pointer-events-none absolute inset-0 z-[2] viewport-glow" />

				{error ? (
					<div className="absolute inset-4 z-10 grid place-items-center">
						<div className="max-w-sm rounded-control border border-danger/45 bg-[#261717]/95 px-4 py-3 text-center shadow-xl">
							<p className="text-xs font-medium text-danger-text">WebGL could not start</p>
							<p className="mt-1 font-mono text-[10px] leading-relaxed text-muted">{error}</p>
						</div>
					</div>
				) : null}
			</div>

			<div
				className="flex shrink-0 items-center justify-between gap-2.5 border-t border-line bg-white/[0.014] px-3 py-2.5 max-sm:flex-col max-sm:items-stretch"
				role="toolbar"
				aria-label="Simulation controls"
			>
				<div className="flex items-center gap-1.5 max-sm:grid max-sm:grid-cols-3">
					<Button variant="primary" className="min-w-[92px] max-sm:w-full" aria-pressed={running} onClick={onToggleRun}>
						{running ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
						{running ? "Pause" : "Start"}
					</Button>
					<Button className="max-sm:w-full" onClick={onStep}>
						<StepForward className="size-3.5" aria-hidden />
						Step
					</Button>
					<Button className="max-sm:w-full" onClick={onReset}>
						<RotateCcw className="size-3.5" aria-hidden />
						Reset
					</Button>
				</div>

				<div className="flex items-center gap-1.5 max-sm:grid max-sm:grid-cols-2">
					<Button variant="ghost" className="max-sm:w-full" onClick={onSaveImage}>
						<Download className="size-3.5" aria-hidden />
						Save PNG
					</Button>
					<Button variant="ghost" className="max-sm:w-full" onClick={onResetCamera}>
						<Scan className="size-3.5" aria-hidden />
						Reset view
					</Button>
				</div>
			</div>

			<dl className="grid shrink-0 grid-cols-3 gap-px border-t border-line bg-line lg:grid-cols-6" aria-label="Simulation statistics">
				{STAT_ITEMS.map((item) => (
					<div key={item.key} className="min-w-0 bg-[#191919] px-3 py-2">
						<dt className="truncate font-sans text-[9px] tracking-[0.1em] text-faint uppercase">
							{item.label}
						</dt>
						<dd className="truncate font-mono text-xs text-fg-1 tabular-nums">
							{values[item.key]}
						</dd>
					</div>
				))}
			</dl>
		</section>
	)
}

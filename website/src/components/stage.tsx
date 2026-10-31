"use client"

import { Download, Pause, Play, RotateCcw, Scan, StepForward } from "lucide-react"
import type { RefObject } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface StageProps {
	canvasRef: RefObject<HTMLCanvasElement | null>
	running: boolean
	error: string | null
	onToggleRun: () => void
	onStep: () => void
	onReset: () => void
	onResetCamera: () => void
	onSaveImage: () => void
}

export function Stage({
	canvasRef,
	running,
	error,
	onToggleRun,
	onStep,
	onReset,
	onResetCamera,
	onSaveImage,
}: StageProps) {
	return (
		<section
			id="simulator"
			aria-labelledby="stage-title"
			className="relative h-full min-h-0 overflow-hidden bg-black max-lg:h-[48dvh] max-lg:min-h-[300px]"
		>
			<h1 id="stage-title" className="sr-only">Langton&apos;s ant simulator</h1>

			<canvas
				ref={canvasRef}
				className="absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing"
				aria-label="Langton's ant grid rendering. Drag to pan and scroll to zoom."
			>
				Your browser does not support WebGL, which is required to render the simulation.
			</canvas>

			<div className="pointer-events-none absolute inset-0 z-[1] stage-scrim" />

			<div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-2">
				<span
					className={cn(
						"inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10.5px] whitespace-nowrap backdrop-blur-md transition-colors",
						running
							? "border-accent/35 bg-black/55 text-fg-1"
							: "border-white/10 bg-black/55 text-muted",
					)}
					role="status"
				>
					<span className={cn("size-1.5 rounded-full", running ? "animate-run-pulse bg-accent" : "bg-faint")} />
					{running ? "Running" : "Paused"}
				</span>
			</div>

			<div className="pointer-events-none absolute top-3 right-3 z-10 hidden items-center gap-2 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[9.5px] whitespace-nowrap text-muted backdrop-blur-md sm:flex">
				<span>
					<kbd>Drag</kbd> pan
				</span>
				<span className="text-white/20">·</span>
				<span>
					<kbd>Scroll</kbd> zoom
				</span>
				<span className="text-white/20">·</span>
				<span>
					<kbd>Space</kbd> run
				</span>
			</div>

			<div className="absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
				<div
					className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-panel border border-white/10 bg-black/65 p-1.5 shadow-[0_12px_40px_rgb(0_0_0/0.45)] backdrop-blur-md"
					role="toolbar"
					aria-label="Simulation controls"
				>
					<Button variant="primary" className="min-w-[88px]" aria-pressed={running} onClick={onToggleRun}>
						{running ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
						{running ? "Pause" : "Start"}
					</Button>
					<Button className="border-white/10 bg-white/[0.06] text-fg-1 hover:border-white/20" onClick={onStep}>
						<StepForward className="size-3.5" aria-hidden />
						Step
					</Button>
					<Button className="border-white/10 bg-white/[0.06] text-fg-1 hover:border-white/20" onClick={onReset}>
						<RotateCcw className="size-3.5" aria-hidden />
						Reset
					</Button>
					<span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
					<Button
						variant="ghost"
						className="text-muted hover:border-white/15 hover:bg-white/[0.08] hover:text-fg"
						aria-label="Save the texture as a PNG"
						title="Save the texture as a PNG"
						onClick={onSaveImage}
					>
						<Download className="size-3.5" aria-hidden />
						<span className="max-sm:hidden">Save PNG</span>
					</Button>
					<Button
						variant="ghost"
						className="text-muted hover:border-white/15 hover:bg-white/[0.08] hover:text-fg"
						aria-label="Reset the camera view"
						onClick={onResetCamera}
					>
						<Scan className="size-3.5" aria-hidden />
						<span className="max-sm:hidden">Reset view</span>
					</Button>
				</div>
			</div>

			{error
				? (
					<div className="absolute inset-4 z-20 grid place-items-center">
						<div className="max-w-sm rounded-control border border-danger/45 bg-[#261717]/95 px-4 py-3 text-center shadow-xl">
							<p className="text-xs font-medium text-danger-text">WebGL could not start</p>
							<p className="mt-1 font-mono text-[10px] leading-relaxed text-muted">{error}</p>
						</div>
					</div>
				)
				: null}
		</section>
	)
}

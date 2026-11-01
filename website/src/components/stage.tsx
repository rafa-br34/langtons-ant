"use client"

import { Separator } from "@base-ui/react/separator"
import { Download, Link2, type LucideIcon, Pause, Play, RotateCcw, Scan, StepForward } from "lucide-react"
import type { RefObject } from "react"

import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface StageButtonProps extends Omit<ButtonProps, "title"> {
	icon: LucideIcon
	title: string
	hideLabelOnMobile?: boolean
}

function StageButton({
	icon: Icon,
	title,
	hideLabelOnMobile = true,
	variant = "ghost",
	className,
	children,
	...props
}: Readonly<StageButtonProps>) {
	return (
		<Button
			variant={variant}
			className={cn(
				variant === "ghost" && "text-muted hover:border-white/15 hover:bg-white/[0.08] hover:text-fg",
				className,
			)}
			{...props}
			aria-label={title}
			title={title}
		>
			<Icon className="size-3.5" aria-hidden />
			<span className={hideLabelOnMobile ? "max-sm:hidden" : undefined}>{children}</span>
		</Button>
	)
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
	onCopyLink,
}: {
	readonly canvasRef: RefObject<HTMLCanvasElement | null>
	readonly running: boolean
	readonly error: string | null
	readonly onToggleRun: () => void
	readonly onStep: () => void
	readonly onReset: () => void
	readonly onResetCamera: () => void
	readonly onSaveImage: () => void
	readonly onCopyLink: () => void
}) {
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

			<div className="absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
				<div
					className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-panel border border-white/10 bg-black/65 p-1 shadow-toolbar backdrop-blur-md sm:gap-1.5 sm:p-1.5"
					role="toolbar"
					aria-label="Simulation controls"
				>
					<StageButton
						variant="primary"
						className={cn(
							"min-w-[120px] sm:min-w-[140px]",
							!running && "border-accent bg-accent text-neutral-900 hover:border-accent-bright hover:bg-accent-bright hover:text-neutral-900",
						)}
						icon={running ? Pause : Play}
						title={running ? "Pause the simulation" : "Start the simulation"}
						hideLabelOnMobile={false}
						aria-pressed={running}
						onClick={onToggleRun}
					>
						{running ? "Pause" : "Start"}
					</StageButton>
					<StageButton
						variant="default"
						className="border-white/10 bg-white/[0.06] text-fg-1 hover:border-white/20"
						icon={StepForward}
						title="Step one frame"
						onClick={onStep}
					>
						Step
					</StageButton>
					<StageButton
						variant="default"
						className="border-white/10 bg-white/[0.06] text-fg-1 hover:border-white/20"
						icon={RotateCcw}
						title="Reset the run"
						onClick={onReset}
					>
						Reset
					</StageButton>

					<Separator orientation="vertical" className="mx-0.5 hidden h-full w-px bg-white/10 sm:block" />

					<StageButton icon={Download} title="Save the texture as a PNG" onClick={onSaveImage}>Save PNG</StageButton>
					<StageButton icon={Link2} title="Copy link" onClick={onCopyLink}>Copy link</StageButton>
					<StageButton icon={Scan} title="Reset the camera view" onClick={onResetCamera}>Reset view</StageButton>
				</div>
			</div>

			{error
				? (
					<div className="absolute inset-4 z-20 grid place-items-center">
						<div className="max-w-sm rounded-control border border-danger/45 bg-danger-soft px-4 py-3 text-center shadow-xl">
							<p className="text-xs font-medium text-danger-text">WebGL could not start</p>
							<p className="mt-1 font-mono text-2xs leading-relaxed text-muted">{error}</p>
						</div>
					</div>
				)
				: null}
		</section>
	)
}

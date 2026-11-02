"use client"

import { cn } from "@/lib/utils"
import { Dialog } from "@base-ui/react/dialog"
import { Info, X } from "lucide-react"
import { useEffect, useState } from "react"

function Opcode({ code }: { readonly code: string }) {
	return <code className="rounded-[3px] border border-line bg-black/30 px-1 py-0.5 font-mono text-xs text-accent-bright">{code}</code>
}

function AboutContent() {
	return (
		<Dialog.Portal>
			<Dialog.Backdrop className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[6px] transition-opacity duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
			<Dialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
				<Dialog.Popup
					className={cn(
						"relative max-h-[calc(100dvh-48px)] w-full max-w-[600px] overflow-auto rounded-panel",
						"border border-line bg-surface-raised text-muted outline-none",
						"transition-[opacity,transform] duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
					)}
				>
					<Dialog.Description className="sr-only">
						About Langton's ant and how to use the interactive simulator.
					</Dialog.Description>

					<div className="flex items-center justify-between gap-4 border-b border-line bg-white/[0.014] px-[18px] py-2">
						<div>
							<span className="font-mono text-2xs tracking-widest text-faint uppercase">About</span>
							<Dialog.Title className="mt-0.5 text-lg font-semibold tracking-tight text-fg">Langton's ant</Dialog.Title>
						</div>
						<Dialog.Close
							className="grid size-8 place-items-center rounded-control border border-line text-muted transition-colors hover:border-line-strong hover:bg-white/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
							aria-label="Close dialog"
						>
							<X className="size-4" aria-hidden />
						</Dialog.Close>
					</div>

					<div className="px-[18px] py-[18px] text-xs leading-relaxed">
						<p className="mb-2.5">
							Langton's ant is a two-dimensional Turing machine. The ant walks a grid, turning according to the state of the current cell. Turn right on a blank cell,
							left on a filled one.
						</p>
						<p className="mb-2.5">
							This page runs the simulation in JavaScript and streams the grid to a WebGL2 shader. The simulation uses a uint 8 buffer for all cells, so your state
							machine is inherently limited to 256 possible opcodes. The{" "}
							<a
								className="text-fg underline decoration-line-strong underline-offset-2 hover:decoration-fg"
								href="https://github.com/rafa-br34/langtons-ant"
								target="_blank"
								rel="noopener"
							>
								repository
							</a>{" "}
							also contains C++ implementations that can write huge grids to PNG or TIFF.
						</p>

						<h3 className="mt-5 mb-2 text-2xs font-semibold tracking-widest text-fg-1 uppercase">Controls</h3>
						<dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
							{[
								["Space", "Start / pause"],
								["S", "Step one frame"],
								["R", "Reset the run"],
								["C", "Reset the view"],
								["Drag", "Pan the grid"],
								["Scroll", "Zoom at the cursor"],
							].map(([key, action]) => (
								<div key={key} className="grid grid-cols-[58px_minmax(0,1fr)] items-center gap-2.5 border-b border-white/5 py-1.5">
									<dt>
										<kbd>{key}</kbd>
									</dt>
									<dd className="truncate font-mono text-2xs text-fg-1">{action}</dd>
								</div>
							))}
						</dl>

						<h3 className="mt-5 mb-2 text-2xs font-semibold tracking-widest text-fg-1 uppercase">State machines</h3>
						<div>
							<p>The following operation codes can be used for the state machine:</p>
							<ul className="mt-2 list-disc space-y-1 pl-5">
								<li>
									<Opcode code="R" />/<Opcode code="R90" /> turn right 90°
								</li>
								<li>
									<Opcode code="L" />/<Opcode code="L90" /> turn left 90°
								</li>
								<li>
									<Opcode code="R45" />/<Opcode code="L45" /> turn 45° diagonally
								</li>
								<li>
									<Opcode code="R135" />/<Opcode code="L135" /> turn 135° diagonally
								</li>
								<li>
									<Opcode code="U" /> reverse direction (180°)
								</li>
								<li>
									<Opcode code="C" /> continue straight
								</li>
							</ul>
							<p className="mt-2.5">Cells cycle through each state as the ant visits it.</p>
						</div>
						<p className="mt-4 text-2xs text-faint">
							Made by{" "}
							<a
								className="text-fg underline decoration-line-strong underline-offset-2 hover:decoration-fg"
								href="https://rafa-br34.dev"
								target="_blank"
								rel="noopener"
							>
								rafa_br34
							</a>.
						</p>
					</div>
				</Dialog.Popup>
			</Dialog.Viewport>
		</Dialog.Portal>
	)
}

export function AboutDialog() {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== "?" || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
				return
			}

			const target = event.target
			if (target instanceof Element && target.closest("input, textarea, select, button, a, summary, [contenteditable='true']")) {
				return
			}

			event.preventDefault()
			setOpen(true)
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [])

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Trigger
				className="grid size-8 place-items-center rounded-control border border-line bg-white/[0.03] text-muted transition-colors hover:border-line-strong hover:bg-white/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
				aria-label="About Langton's Ant"
				title="About Langton's Ant"
			>
				<Info className="size-4" aria-hidden />
			</Dialog.Trigger>
			<AboutContent />
		</Dialog.Root>
	)
}

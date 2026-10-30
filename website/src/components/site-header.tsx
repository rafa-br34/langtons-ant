"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Bug, Info, X } from "lucide-react"

import { GithubIcon } from "@/components/github-icon"

function AboutDialog() {
	return (
		<Dialog.Portal>
			<Dialog.Backdrop className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[6px] transition-opacity duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
			<Dialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
				<Dialog.Popup className="relative max-h-[calc(100dvh-48px)] w-full max-w-[600px] overflow-auto rounded-panel border border-line bg-[#1e1e1e] text-muted shadow-[0_40px_120px_rgb(0_0_0/0.7)] outline-none transition-[opacity,transform] duration-200 data-[starting-style]:scale-[0.985] data-[starting-style]:opacity-0 data-[ending-style]:scale-[0.985] data-[ending-style]:opacity-0">
					<Dialog.Description className="sr-only">
						About Langton&apos;s ant and how to use the interactive simulator.
					</Dialog.Description>

					<div className="flex items-center justify-between gap-4 border-b border-line bg-white/[0.014] px-[18px] py-4">
						<div>
							<span className="font-mono text-[9.5px] tracking-[0.14em] text-faint uppercase">About</span>
							<Dialog.Title className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em] text-fg">
								Langton&apos;s ant
							</Dialog.Title>
						</div>
						<Dialog.Close
							className="grid size-8 place-items-center rounded-control border border-line bg-white/[0.03] text-muted transition-colors hover:border-line-strong hover:bg-white/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
							aria-label="Close dialog"
						>
							<X className="size-4" aria-hidden />
						</Dialog.Close>
					</div>

					<div className="px-[18px] py-[18px] text-[12.5px] leading-relaxed">
						<p className="mb-2.5">
							Langton&apos;s ant is a two-dimensional Turing machine. The ant walks a grid, turning according to the state
							machine written on its current cell. Turn right on a blank cell, left on a filled one, and a few million steps
							later a chaotic cloud snaps into a repeating <em className="text-fg-1">highway</em>.
						</p>
						<p className="mb-2.5">
							This page runs the simulation in JavaScript and streams the grid to a WebGL2 shader. The{" "}
							<a
								className="text-fg underline decoration-[#5a5a5a] underline-offset-2 hover:decoration-fg"
								href="https://github.com/rafa-br34/LangtonsAnt"
								target="_blank"
								rel="noopener"
							>
								repository
							</a>{" "}
							also contains C++ implementations that can write huge grids to PNG or TIFF.
						</p>

						<h3 className="mt-5 mb-2 text-[10px] font-semibold tracking-[0.12em] text-fg-1 uppercase">Controls</h3>
						<dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
							{[
								["Space", "Start / pause"],
								["S", "Step one frame"],
								["R", "Reset the run"],
								["C", "Reset the camera"],
								["Drag", "Pan the grid"],
								["Scroll", "Zoom in / out"]
							].map(([key, action]) => (
								<div key={key} className="grid grid-cols-[58px_minmax(0,1fr)] items-center gap-2.5 border-b border-white/5 py-1.5">
									<dt><kbd>{key}</kbd></dt>
									<dd className="truncate font-mono text-[10px] text-fg-1">{action}</dd>
								</div>
							))}
						</dl>

						<h3 className="mt-5 mb-2 text-[10px] font-semibold tracking-[0.12em] text-fg-1 uppercase">State machines</h3>
						<p>
							Each character is one step of the machine: <code className="rounded-[3px] border border-line bg-black/30 px-1 py-0.5 font-mono text-[11px] text-accent-bright">R</code>/<code className="rounded-[3px] border border-line bg-black/30 px-1 py-0.5 font-mono text-[11px] text-accent-bright">L</code> turn 90°,{" "}
							<code className="rounded-[3px] border border-line bg-black/30 px-1 py-0.5 font-mono text-[11px] text-accent-bright">R45</code>/<code className="rounded-[3px] border border-line bg-black/30 px-1 py-0.5 font-mono text-[11px] text-accent-bright">L45</code> and{" "}
							<code className="rounded-[3px] border border-line bg-black/30 px-1 py-0.5 font-mono text-[11px] text-accent-bright">R135</code>/<code className="rounded-[3px] border border-line bg-black/30 px-1 py-0.5 font-mono text-[11px] text-accent-bright">L135</code> turn
							diagonally, <code className="rounded-[3px] border border-line bg-black/30 px-1 py-0.5 font-mono text-[11px] text-accent-bright">U</code> reverses, and <code className="rounded-[3px] border border-line bg-black/30 px-1 py-0.5 font-mono text-[11px] text-accent-bright">C</code> continues
							straight. A cell cycles through the machine&apos;s states as the ant visits it.
						</p>
						<p className="mt-4 text-[10px] text-faint">
							Made by{" "}
							<a className="text-fg underline decoration-[#5a5a5a] underline-offset-2 hover:decoration-fg" href="https://rafa-br34.dev" target="_blank" rel="noopener">
								rafa_br34
							</a>
							. Third-party content belongs to its respective owners.
						</p>
					</div>
				</Dialog.Popup>
			</Dialog.Viewport>
		</Dialog.Portal>
	)
}

export function SiteHeader() {
	const [aboutOpen, setAboutOpen] = useState(false)

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
			setAboutOpen(true)
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [])

	return (
		<Dialog.Root open={aboutOpen} onOpenChange={setAboutOpen}>
			<header className="sticky top-0 z-30 grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line bg-[#1a1a1a]/75 px-5 backdrop-blur-xl max-md:grid-cols-[1fr_auto] max-md:px-3.5">
				<a href="#simulator" className="group flex min-w-0 items-center gap-2.5 justify-self-start rounded-control">
					<span className="grid size-[30px] shrink-0 place-items-center rounded-control border border-line bg-gradient-to-br from-[#2a2a2a] to-[#191919] text-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] transition-colors group-hover:border-accent/50 group-hover:text-accent-bright">
						<Bug className="size-[18px]" aria-hidden />
					</span>
					<span className="flex min-w-0 flex-col">
						<span className="text-[13px] leading-tight font-semibold tracking-[-0.01em] whitespace-nowrap text-fg">Langton&apos;s Ant</span>
						<span className="font-mono text-[9px] leading-tight tracking-[0.13em] whitespace-nowrap text-faint uppercase max-md:hidden">
							Cellular automata lab
						</span>
					</span>
				</a>

				<nav className="flex h-full items-stretch justify-self-center max-md:hidden" aria-label="Primary">
					<a
						href="#simulator"
						aria-current="page"
						className="relative inline-flex h-full items-center border-b-2 border-fg px-3.5 text-[12px] font-normal text-fg"
					>
						Simulator
					</a>
					<Dialog.Trigger className="relative inline-flex h-full items-center border-b-2 border-transparent px-3.5 text-[12px] font-normal text-muted transition-colors hover:text-fg">
						About
					</Dialog.Trigger>
					<a
						href="https://github.com/rafa-br34/LangtonsAnt#readme"
						target="_blank"
						rel="noopener"
						className="relative inline-flex h-full items-center border-b-2 border-transparent px-3.5 text-[12px] font-normal text-muted transition-colors hover:text-fg"
					>
						Docs
					</a>
				</nav>

				<div className="flex items-center gap-2 justify-self-end">
					<Dialog.Trigger
						className="grid size-8 place-items-center rounded-control border border-line bg-white/[0.03] text-muted transition-colors hover:border-line-strong hover:bg-white/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden"
						aria-label="About Langton's Ant"
					>
						<Info className="size-4" aria-hidden />
					</Dialog.Trigger>
					<a
						href="https://github.com/rafa-br34/LangtonsAnt"
						target="_blank"
						rel="noopener"
						aria-label="View source on GitHub"
						title="View source on GitHub"
						className="grid size-8 place-items-center rounded-control border border-line bg-white/[0.03] text-muted transition-colors hover:border-line-strong hover:bg-white/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
					>
						<GithubIcon className="size-4" />
					</a>
				</div>
			</header>

			<AboutDialog />
		</Dialog.Root>
	)
}

"use client"

import { Switch } from "@base-ui/react/switch"
import { Tabs } from "@base-ui/react/tabs"
import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import { ArrowDown, ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUp, ArrowUpLeft, ArrowUpRight, ChevronRight, Dices, FlipHorizontal2, PlayingCard, Plus } from "lucide-react"
import { useEffect, useState } from "react"

import { AboutDialog } from "@/components/about-dialog"
import { NumberInput } from "@/components/number-input"
import { Button } from "@/components/ui/button"
import { type AntConfig, DIRECTION, DIRECTION_VALUES, directionLabel, type DirectionValue, parseStateMachine, stringifyStateMachine } from "@/lib/ant"
import { MAX_GRID, type WorldConfig } from "@/lib/share"
import { MAX_IPF } from "@/lib/simulation"
import type { SimulationStats } from "@/lib/stats"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { SiGithub } from "react-icons/si"

const SPEEDS = [1, 100, 10000, 100000] as const

const STAT_ITEMS = [
	{ key: "iterations", label: "Iteration" },
	{ key: "liveAnts", label: "Live ants" },
	{ key: "fps", label: "FPS / IPS" },
	{ key: "buffer", label: "Buffer" },
	{ key: "bandwidth", label: "CPU → GPU" },
	{ key: "camera", label: "View" },
] as const

const TAB_CLASS = cn(
	"inline-flex h-[30px] flex-1 items-center justify-center gap-1.5 rounded-[4px] border border-transparent px-2",
	"text-2xs font-semibold tracking-widest whitespace-nowrap text-faint uppercase transition-colors",
	"hover:bg-white/[0.06] hover:text-fg-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
	"data-[active]:border-line data-[active]:bg-white/[0.06] data-[active]:text-fg",
)

const CHIP_CLASS = cn(
	"inline-flex h-[23px] items-center rounded-[3px] border border-line px-2 font-mono text-2xs leading-none text-faint",
	"transition-colors hover:border-line-strong hover:bg-white/[0.06] hover:text-fg",
	"data-[pressed]:border-accent/40 data-[pressed]:bg-accent-soft data-[pressed]:text-accent-bright",
	"disabled:pointer-events-none disabled:opacity-35",
)

const DIRECTIONS = [
	{ dx: -1, dy: -1, label: "North west", dir: "NW", icon: ArrowUpLeft, position: "col-start-1 row-start-1" },
	{ dx: 0, dy: -1, label: "North", dir: "N", icon: ArrowUp, position: "col-start-2 row-start-1" },
	{ dx: 1, dy: -1, label: "North east", dir: "NE", icon: ArrowUpRight, position: "col-start-3 row-start-1" },
	{ dx: -1, dy: 0, label: "West", dir: "W", icon: ArrowLeft, position: "col-start-1 row-start-2" },
	{ dx: 0, dy: 0, label: "Center", icon: null, position: "col-start-2 row-start-2" },
	{ dx: 1, dy: 0, label: "East", dir: "E", icon: ArrowRight, position: "col-start-3 row-start-2" },
	{ dx: -1, dy: 1, label: "South west", dir: "SW", icon: ArrowDownLeft, position: "col-start-1 row-start-3" },
	{ dx: 0, dy: 1, label: "South", dir: "S", icon: ArrowDown, position: "col-start-2 row-start-3" },
	{ dx: 1, dy: 1, label: "South east", dir: "SE", icon: ArrowDownRight, position: "col-start-3 row-start-3" },
] as const

function SwitchRow({
	title,
	description,
	checked,
	disabled,
	onCheckedChange,
}: {
	readonly title: string
	readonly description: string
	readonly checked: boolean
	readonly disabled: boolean
	readonly onCheckedChange: (checked: boolean) => void
}) {
	return (
		<div className="flex items-center justify-between gap-2.5 rounded-control border border-line bg-black/20 px-2.5 py-2 transition-colors">
			<div className="flex min-w-0 flex-col">
				<span className="text-xs leading-tight text-fg-1">{title}</span>
				<span className="text-2xs leading-tight text-faint">{description}</span>
			</div>
			<Switch.Root
				checked={checked}
				disabled={disabled}
				onCheckedChange={nextChecked => onCheckedChange(nextChecked)}
				aria-label={title}
				className={cn(
					"group relative h-[18px] w-[34px] shrink-0 rounded-full border border-line-strong bg-line transition-colors",
					"data-[checked]:border-accent/55 data-[checked]:bg-accent/20",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
					"disabled:cursor-not-allowed disabled:opacity-45",
				)}
			>
				<Switch.Thumb className="absolute top-0.5 left-0.5 size-3 rounded-full bg-faint transition-transform group-data-[checked]:translate-x-4 group-data-[checked]:bg-accent" />
			</Switch.Root>
		</div>
	)
}

function FieldLabel({
	label,
	unit,
	htmlFor,
}: {
	readonly label: string
	readonly unit: string
	readonly htmlFor?: string
}) {
	const LABEL_CLASS = "flex items-center justify-between gap-2 text-xs text-muted"

	const content = (
		<>
			{label}
			<span className="font-mono text-xs tracking-tight text-faint uppercase">{unit}</span>
		</>
	)

	if (htmlFor) {
		return (
			<label htmlFor={htmlFor} className={LABEL_CLASS}>
				{content}
			</label>
		)
	}

	return <span className={LABEL_CLASS}>{content}</span>
}

function SectionHeading({ label, className }: { readonly label: string; readonly className?: string }) {
	return (
		<div className={cn("flex items-center gap-2", className)}>
			<span className="font-mono text-3xs tracking-widest text-faint uppercase">{label}</span>
			<span className="h-px flex-1 bg-line" />
		</div>
	)
}

function AntEditor({
	ant,
	worldWidth,
	worldHeight,
	onUpdate,
	onReplaceRules,
}: {
	readonly ant: AntConfig
	readonly worldWidth: number
	readonly worldHeight: number
	readonly onUpdate: (patch: Partial<AntConfig>) => void
	readonly onReplaceRules: (rules: DirectionValue[]) => void
}) {
	const [rulesDraft, setRulesDraft] = useState(() => stringifyStateMachine(ant.rules))

	useEffect(() => {
		setRulesDraft(stringifyStateMachine(ant.rules))
	}, [ant.id, ant.rules])

	const parsedRules = parseStateMachine(rulesDraft)

	if (parsedRules.rules.length > 256) {
		parsedRules.rules = parsedRules.rules.slice(0, 256)
	}

	const rulesValid = parsedRules.valid
	const rulesHint = rulesValid
		? `${parsedRules.rules.length}/256 states · ${stringifyStateMachine(parsedRules.rules, " ").trim()}`
		: "That rule set is not valid. Use R, L, U, C or angles (45/90/135)."

	function applyRules() {
		if (!rulesValid || stringifyStateMachine(parsedRules.rules) === stringifyStateMachine(ant.rules)) {
			return
		}

		onReplaceRules(parsedRules.rules)
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-1.5">
				<FieldLabel label="Position" unit="x, y" />
				<div className="grid grid-cols-2 gap-2">
					<NumberInput
						value={ant.x}
						onChange={x => onUpdate({ x })}
						min={0}
						max={worldWidth - 1}
						prefix="X"
						commitOnBlur
						ariaLabel="Ant X position"
					/>
					<NumberInput
						value={ant.y}
						onChange={y => onUpdate({ y })}
						min={0}
						max={worldHeight - 1}
						prefix="Y"
						commitOnBlur
						ariaLabel="Ant Y position"
					/>
				</div>
			</div>

			<div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
				<div className="flex flex-col gap-1.5">
					<FieldLabel label="Facing" unit="8-way" />
					<div className="grid grid-cols-3 grid-rows-3 gap-[3px]" role="group" aria-label="Initial ant direction">
						{DIRECTIONS.map(direction => {
							const Active = ant.dx === direction.dx && ant.dy === direction.dy
							const Icon = direction.icon

							if (!Icon) {
								return (
									<span
										key={direction.label}
										aria-hidden
										className={cn(
											"grid size-8 place-items-center rounded-[3px] border border-dashed border-line",
											direction.position,
										)}
									>
										<span className="size-1.5 rounded-full bg-faint" />
									</span>
								)
							}

							return (
								<button
									key={direction.label}
									type="button"
									aria-label={direction.label}
									aria-pressed={Active}
									onClick={() => onUpdate({ dx: direction.dx, dy: direction.dy })}
									className={cn(
										"grid size-8 place-items-center rounded-[3px] border border-line bg-black/20 text-faint transition-colors",
										"hover:border-line-strong hover:bg-white/[0.06] hover:text-fg",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
										"aria-pressed:border-accent/50 aria-pressed:bg-accent-soft aria-pressed:text-accent-bright",
										direction.position,
									)}
								>
									<Icon className="size-3.5" aria-hidden />
								</button>
							)
						})}
					</div>
				</div>

				<div className="flex min-w-0 flex-col justify-between gap-2.5">
					<div className="flex flex-col gap-1.5">
						<FieldLabel label="Step size" unit="cells" />
						<NumberInput
							value={ant.stepSize}
							onChange={stepSize => onUpdate({ stepSize })}
							min={0}
							max={100000}
							commitOnBlur
							ariaLabel="Ant step size"
						/>
					</div>
					<div className="flex flex-col gap-0.5 rounded-[3px] border border-dashed border-line bg-black/15 px-2 py-1.5">
						<span className="font-mono text-3xs tracking-widest text-faint uppercase">Vector</span>
						<span className="truncate font-mono text-2xs text-muted">
							{`${ant.dx}, ${ant.dy} · ${directionLabel(ant.dx, ant.dy)}`}
						</span>
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<FieldLabel label="State machine" unit="R L U C" htmlFor="ant-rules" />
				<div className="grid grid-cols-[minmax(0,1fr)_34px_34px_34px] gap-1.5">
					<div
						className={cn(
							"flex h-[34px] items-center rounded-control border border-line bg-black/25 px-2.5 transition-[border-color,box-shadow]",
							"focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/15",
							!rulesValid && "border-danger/65 ring-[3px] ring-danger/10",
						)}
					>
						<input
							id="ant-rules"
							type="text"
							value={rulesDraft}
							spellCheck={false}
							autoComplete="off"
							autoCapitalize="characters"
							aria-invalid={!rulesValid}
							aria-describedby="rules-hint"
							className="w-full min-w-0 bg-transparent font-mono text-xs tracking-wider text-accent-bright outline-none"
							onChange={event => setRulesDraft(event.target.value)}
							onBlur={applyRules}
							onKeyDown={event => {
								if (event.key === "Enter") {
									event.currentTarget.blur()
								}
							}}
						/>
					</div>
					<Button
						size="icon"
						className="h-[34px] w-[34px]"
						aria-label="Mutate one rule"
						title="Mutate one rule"
						onClick={() => {
							const next = [...ant.rules]
							if (next.length === 0) {
								return
							}

							next[Math.floor(Math.random() * next.length)] = DIRECTION_VALUES[Math.floor(Math.random() * DIRECTION_VALUES.length)]!
							onReplaceRules(next)
						}}
					>
						<PlayingCard className="size-3.5" aria-hidden />
					</Button>
					<Button
						size="icon"
						className="h-[34px] w-[34px]"
						aria-label="Randomize the rule set"
						title="Randomize the rule set"
						onClick={() => {
							const length = 4 + Math.floor(Math.random() * 10)
							const next = Array.from({ length }, () => DIRECTION_VALUES[Math.floor(Math.random() * DIRECTION_VALUES.length)]!)
							onReplaceRules(next)
						}}
					>
						<Dices className="size-3.5" aria-hidden />
					</Button>
					<Button
						size="icon"
						className="h-[34px] w-[34px]"
						aria-label="Mirror the rule set"
						title="Mirror the rule set (swap R and L)"
						onClick={() => {
							const next = ant.rules.map(value => (value === DIRECTION.C || value === DIRECTION.U ? value : -value) as DirectionValue)
							setRulesDraft(stringifyStateMachine(next))
							onReplaceRules(next)
						}}
					>
						<FlipHorizontal2 className="size-3.5" aria-hidden />
					</Button>
				</div>
				<p id="rules-hint" className={cn("text-2xs leading-relaxed text-faint", !rulesValid && "text-danger-text")}>
					{rulesHint}
				</p>
			</div>

			<div className="flex flex-col gap-1.5">
				<SwitchRow
					title="Wrap edges"
					description="Teleport at borders"
					checked={ant.wrap}
					disabled={false}
					onCheckedChange={wrap => onUpdate({ wrap })}
				/>
				<SwitchRow
					title="Enabled"
					description="Include in run"
					checked={ant.enabled}
					disabled={false}
					onCheckedChange={enabled => onUpdate({ enabled })}
				/>
			</div>
		</div>
	)
}

export function ControlPanel({
	world,
	selectedId,
	selectedAnt,
	running,
	ipf,
	stats,
	antialias,
	pixelGrid,
	onSelectAnt,
	onAddAnt,
	onCloneAnt,
	onRemoveAnt,
	onUpdateAnt,
	onReplaceRules,
	onResize,
	onIpfChange,
	onAntialiasChange,
	onPixelGridChange,
}: {
	readonly world: WorldConfig
	readonly selectedId: string | null
	readonly selectedAnt: AntConfig | null
	readonly running: boolean
	readonly ipf: number
	readonly stats: SimulationStats
	readonly antialias: boolean
	readonly pixelGrid: boolean
	readonly onSelectAnt: (id: string | null) => void
	readonly onAddAnt: () => void
	readonly onCloneAnt: () => void
	readonly onRemoveAnt: () => void
	readonly onUpdateAnt: (patch: Partial<AntConfig>) => void
	readonly onReplaceRules: (rules: DirectionValue[]) => void
	readonly onResize: (width: number, height: number) => void
	readonly onIpfChange: (value: number) => void
	readonly onAntialiasChange: (value: boolean) => void
	readonly onPixelGridChange: (value: boolean) => void
}) {
	const statValues: Record<(typeof STAT_ITEMS)[number]["key"], string> = {
		iterations: stats.iterations.toLocaleString("en-US"),
		liveAnts: String(stats.liveAnts),
		fps: `${stats.fps.toFixed(2)}/${stats.ips.toFixed(2)}`,
		buffer: stats.buffer,
		bandwidth: stats.bandwidth,
		camera: `${Math.round(stats.camera.x)}, ${Math.round(stats.camera.y)} · ${stats.camera.zoom.toFixed(2)}×`,
	}

	return (
		<aside
			aria-label="Simulation settings"
			className="flex min-h-0 flex-col overflow-hidden bg-surface max-lg:flex-none lg:border-l lg:border-line"
		>
			<div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3.5 py-3">
				<div className="flex min-w-0 items-center gap-2.5">
					<Image src="/favicon.png" alt="Langton's ant demo" width={38} height={38} className="grid size-8 rounded-control border border-line" aria-hidden />
					<span className="min-w-0 block truncate text-sm leading-tight font-semibold tracking-tight text-fg">Langton's Ant</span>
				</div>

				<div className="flex shrink-0 items-center gap-1">
					<AboutDialog />
					<a
						href="https://github.com/rafa-br34/LangtonsAnt"
						target="_blank"
						rel="noopener"
						aria-label="View source on GitHub"
						title="View source on GitHub"
						className="grid size-8 place-items-center rounded-control border border-line bg-white/[0.03] text-muted transition-colors hover:border-line-strong hover:bg-white/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
					>
						<SiGithub className="size-4" aria-hidden />
					</a>
				</div>
			</div>

			<dl className="grid shrink-0 grid-cols-3 gap-px border-b border-line bg-line" aria-label="Simulation statistics">
				{STAT_ITEMS.map(item => (
					<div key={item.key} className="min-w-0 bg-surface-raised px-2.5 py-1.5">
						<dt className="truncate font-sans text-3xs tracking-widest text-faint uppercase">
							{item.label}
						</dt>
						<dd className="truncate font-mono text-2xs text-fg-1 tabular-nums">
							{statValues[item.key]}
						</dd>
					</div>
				))}
			</dl>

			<Tabs.Root defaultValue="ant" className="flex min-h-0 flex-1 flex-col max-lg:flex-none">
				<Tabs.List className="flex shrink-0 gap-[3px] border-b border-line bg-black/15 p-1.5" aria-label="Control panels">
					<Tabs.Tab value="simulation" className={TAB_CLASS}>Simulation</Tabs.Tab>
					<Tabs.Tab value="ant" className={TAB_CLASS}>
						Ant <span className="inline-grid min-w-4 place-items-center rounded-full border border-line px-1 font-mono text-3xs text-faint">{world.ants.length}</span>
					</Tabs.Tab>
				</Tabs.List>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain max-lg:overflow-visible">
					<Tabs.Panel value="simulation" className="p-4">
						<SectionHeading label="World" className="mb-2.5" />

						<div className="flex flex-col gap-1.5">
							<FieldLabel label="Grid size" unit="cells" />
							<div className="grid grid-cols-2 gap-2">
								<NumberInput
									value={world.width}
									onChange={width => onResize(width, world.height)}
									min={3}
									max={MAX_GRID}
									prefix="X"
									disabled={running}
									commitOnBlur
									ariaLabel="Grid width in cells"
								/>
								<NumberInput
									value={world.height}
									onChange={height => onResize(world.width, height)}
									min={3}
									max={MAX_GRID}
									prefix="Y"
									disabled={running}
									commitOnBlur
									ariaLabel="Grid height in cells"
								/>
							</div>
							<p className="text-xs leading-relaxed text-faint">
								Resizing the world resets the run; up to {MAX_GRID.toLocaleString("en-US")} cells per side.
							</p>
						</div>

						<div className="mt-3 flex flex-col gap-1.5">
							<FieldLabel label="Iterations per frame" unit="IPF" htmlFor="ipf-input" />
							<NumberInput
								id="ipf-input"
								value={ipf}
								onChange={onIpfChange}
								min={1}
								max={MAX_IPF}
								ariaLabel="Iterations per frame"
							/>
							<ToggleGroup
								value={SPEEDS.map(String).includes(String(ipf)) ? [String(ipf)] : []}
								onValueChange={values => {
									const next = Number(values.at(-1))
									if (Number.isFinite(next)) {
										onIpfChange(next)
									}
								}}
								className="mt-1 flex flex-wrap gap-1"
								aria-label="Speed presets"
							>
								{SPEEDS.map(speed => <Toggle key={speed} value={String(speed)} className={CHIP_CLASS}>{speed}x</Toggle>)}
							</ToggleGroup>
						</div>

						<SectionHeading label="Graphics" className="my-4" />

						<div className="flex flex-col gap-1.5">
							<SwitchRow
								title="Antialiasing"
								description="4x4 shader supersampling"
								checked={antialias}
								disabled={false}
								onCheckedChange={onAntialiasChange}
							/>
							<SwitchRow
								title="Pixel grid"
								description="Cell borders when zoomed in"
								checked={pixelGrid}
								disabled={false}
								onCheckedChange={onPixelGridChange}
							/>
						</div>
					</Tabs.Panel>

					<Tabs.Panel value="ant" className="p-4">
						<SectionHeading label="Ants" className="mb-2.5" />
						<div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-1.5">
							<Button onClick={onAddAnt}>
								<Plus className="size-3.5" aria-hidden />
								Add ant
							</Button>
							<Button disabled={!selectedAnt} onClick={onCloneAnt}>Clone</Button>
							<Button variant="danger" disabled={!selectedAnt} onClick={onRemoveAnt}>Remove</Button>
						</div>

						<div
							className="mt-2 flex max-h-40 min-h-[66px] flex-col gap-1 overflow-y-auto rounded-control border border-line bg-black/15 p-1"
							aria-label="Ant list"
						>
							{world.ants.length === 0
								? (
									<p className="grid min-h-[56px] place-items-center px-2.5 text-center text-2xs text-faint">
										No ants yet, add one to start the walk.
									</p>
								)
								: (
									world.ants.map((ant, index) => {
										const Selected = ant.id === selectedId
										return (
											<button
												key={ant.id}
												type="button"
												aria-pressed={Selected}
												onClick={() => onSelectAnt(ant.id)}
												className={cn(
													"flex h-[30px] shrink-0 items-center gap-2 rounded-[3px] border border-transparent px-2 text-left text-xs text-muted transition-colors",
													"hover:bg-white/[0.06] hover:text-fg",
													Selected && "border-accent/30 bg-accent-soft text-fg",
												)}
											>
												<span className={cn("size-[5px] rounded-full bg-line-strong", Selected && "bg-accent shadow-accent-glow")} />
												<span>Ant {index + 1}</span>
												<span className="ml-auto truncate font-mono text-3xs text-faint">{stringifyStateMachine(ant.rules)}</span>
												<ChevronRight className={cn("size-3 text-faint", Selected && "text-accent")} aria-hidden />
											</button>
										)
									})
								)}
						</div>

						{world.ants.length > 0 ? <SectionHeading label="Ant editing" className="my-3.5" /> : null}

						{selectedAnt
							? (
								<AntEditor
									ant={selectedAnt}
									worldWidth={world.width}
									worldHeight={world.height}
									onUpdate={onUpdateAnt}
									onReplaceRules={onReplaceRules}
								/>
							)
							: world.ants.length > 0
							? (
								<p className="rounded-control border border-dashed border-line px-3 py-2 text-2xs leading-relaxed text-faint">
									Select an ant above to edit its position, rules and switches.
								</p>
							)
							: null}
					</Tabs.Panel>
				</div>
			</Tabs.Root>
		</aside>
	)
}

"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Switch } from "@base-ui/react/switch"
import { Tabs } from "@base-ui/react/tabs"
import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import {
	ArrowDown,
	ArrowDownLeft,
	ArrowDownRight,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	ArrowUpLeft,
	ArrowUpRight,
	ChevronRight,
	Dices,
	ExternalLink,
	Link2,
	Plus,
	Shuffle
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { NumberInput } from "@/components/number-input"
import {
	DIRECTION_VALUES,
	directionLabel,
	parseStateMachine,
	stringifyStateMachine,
	type AntConfig,
	type DirectionValue
} from "@/lib/ant"
import { MAX_GRID, type WorldConfig } from "@/lib/share"
import { MAX_IPF } from "@/lib/simulation"
import { cn } from "@/lib/utils"

interface ControlPanelProps {
	world: WorldConfig
	selectedId: string | null
	selectedAnt: AntConfig | null
	running: boolean
	ipf: number
	onSelectAnt: (id: string | null) => void
	onAddAnt: () => void
	onCloneAnt: () => void
	onRemoveAnt: () => void
	onUpdateAnt: (patch: Partial<AntConfig>) => void
	onReplaceRules: (rules: DirectionValue[]) => void
	onResize: (width: number, height: number) => void
	onIpfChange: (value: number) => void
	onCopyLink: () => void
}

const SPEEDS = [1, 10, 100, 1000] as const

const RULE_PRESETS = [
	{ label: "RL", rules: parseStateMachine("RL").rules },
	{ label: "LRRRRRLLR", rules: parseStateMachine("LRRRRRLLR").rules },
	{ label: "RLR", rules: parseStateMachine("RLR").rules }
]

const TAB_CLASS = cn(
	"inline-flex h-[30px] flex-1 items-center justify-center gap-1.5 rounded-[4px] border border-transparent px-2",
	"text-[9.5px] font-semibold tracking-[0.09em] whitespace-nowrap text-faint uppercase transition-colors",
	"hover:bg-white/[0.06] hover:text-fg-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
	"data-[active]:border-line data-[active]:bg-white/[0.06] data-[active]:text-fg"
)

const CHIP_CLASS = cn(
	"inline-flex h-[23px] items-center rounded-[3px] border border-line px-2 font-mono text-[9.5px] leading-none text-faint",
	"transition-colors hover:border-line-strong hover:bg-white/[0.06] hover:text-fg",
	"data-[pressed]:border-accent/40 data-[pressed]:bg-accent-soft data-[pressed]:text-accent-bright",
	"disabled:pointer-events-none disabled:opacity-35"
)

const LABEL_CLASS = "flex items-center justify-between gap-2 text-[10.5px] text-muted"
const UNIT_CLASS = "font-mono text-[8.5px] tracking-[0.08em] text-faint uppercase"

const DIRECTIONS = [
	{ dx: -1, dy: -1, label: "North west", icon: ArrowUpLeft, position: "col-start-1 row-start-1" },
	{ dx: 0, dy: -1, label: "North", icon: ArrowUp, position: "col-start-2 row-start-1" },
	{ dx: 1, dy: -1, label: "North east", icon: ArrowUpRight, position: "col-start-3 row-start-1" },
	{ dx: -1, dy: 0, label: "West", icon: ArrowLeft, position: "col-start-1 row-start-2" },
	{ dx: 0, dy: 0, label: "Center", icon: null, position: "col-start-2 row-start-2" },
	{ dx: 1, dy: 0, label: "East", icon: ArrowRight, position: "col-start-3 row-start-2" },
	{ dx: -1, dy: 1, label: "South west", icon: ArrowDownLeft, position: "col-start-1 row-start-3" },
	{ dx: 0, dy: 1, label: "South", icon: ArrowDown, position: "col-start-2 row-start-3" },
	{ dx: 1, dy: 1, label: "South east", icon: ArrowDownRight, position: "col-start-3 row-start-3" }
] as const

function Badge({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex h-5 items-center rounded-full border border-line bg-white/[0.028] px-1.5 font-mono text-[9.5px] whitespace-nowrap text-muted",
				className
			)}
		>
			{children}
		</span>
	)
}

function SwitchRow({
	title,
	description,
	checked,
	disabled,
	onCheckedChange
}: {
	title: string
	description: string
	checked: boolean
	disabled: boolean
	onCheckedChange: (checked: boolean) => void
}) {
	return (
		<div className="flex items-center justify-between gap-2.5 rounded-control border border-line bg-black/20 px-2.5 py-2 transition-colors">
			<div className="flex min-w-0 flex-col">
				<span className="text-[11px] leading-tight text-fg-1">{title}</span>
				<span className="text-[9.5px] leading-tight text-faint">{description}</span>
			</div>
			<Switch.Root
				checked={checked}
				disabled={disabled}
				onCheckedChange={(nextChecked) => onCheckedChange(nextChecked)}
				aria-label={title}
				className={cn(
					"group relative h-[18px] w-[34px] shrink-0 rounded-full border border-[#4a4a4a] bg-[#303030] transition-colors",
					"data-[checked]:border-accent/55 data-[checked]:bg-accent/20",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
					"disabled:cursor-not-allowed disabled:opacity-45"
				)}
			>
				<Switch.Thumb className="absolute top-0.5 left-0.5 size-3 rounded-full bg-[#8f8f8f] transition-transform group-data-[checked]:translate-x-4 group-data-[checked]:bg-accent" />
			</Switch.Root>
		</div>
	)
}

export function ControlPanel({
	world,
	selectedId,
	selectedAnt,
	running,
	ipf,
	onSelectAnt,
	onAddAnt,
	onCloneAnt,
	onRemoveAnt,
	onUpdateAnt,
	onReplaceRules,
	onResize,
	onIpfChange,
	onCopyLink
}: ControlPanelProps) {
	const [rulesDraft, setRulesDraft] = useState("RL")

	useEffect(() => {
		setRulesDraft(selectedAnt ? stringifyStateMachine(selectedAnt.rules) : "RL")
	}, [selectedAnt?.id, selectedAnt?.rules])

	const parsedRules = parseStateMachine(rulesDraft)
	const rulesValid = parsedRules.valid
	const selectedIndex = selectedId ? world.ants.findIndex((ant) => ant.id === selectedId) : -1
	const rulesHint = !selectedAnt
		? "Select an ant to edit its rule set."
		: !rulesValid
			? "That rule set is not valid. Use R, L, U, C or angles (45/90/135)."
			: `${parsedRules.rules.length} states · ${stringifyStateMachine(parsedRules.rules, " ").trim()}`

	function applyRules() {
		if (!selectedAnt || !rulesValid) {
			return
		}

		if (stringifyStateMachine(parsedRules.rules) === stringifyStateMachine(selectedAnt.rules)) {
			return
		}

		onReplaceRules(parsedRules.rules)
	}

	return (
		<aside
			aria-label="Simulation settings"
			className="flex min-h-0 flex-col overflow-hidden rounded-panel border border-line bg-gradient-to-b from-[#1c1c1c]/95 to-[#171717]/95 shadow-panel max-lg:flex-none"
		>
			<div className="shrink-0 border-b border-line bg-white/[0.014] px-4 py-3.5">
				<h2 className="text-sm font-semibold tracking-[-0.01em] text-fg">Controls</h2>
				<p className="mt-0.5 text-[11px] leading-snug text-faint">Shape the world, then give the ants a rule set to follow.</p>
			</div>

			<Tabs.Root defaultValue="ant" className="flex min-h-0 flex-1 flex-col max-lg:flex-none">
				<Tabs.List className="flex shrink-0 gap-[3px] border-b border-line bg-black/15 p-1.5" aria-label="Control panels">
					<Tabs.Tab value="world" className={TAB_CLASS}>World</Tabs.Tab>
					<Tabs.Tab value="ant" className={TAB_CLASS}>Ant</Tabs.Tab>
					<Tabs.Tab value="ants" className={TAB_CLASS}>
						Ants
						<span className="inline-grid min-w-4 place-items-center rounded-full border border-line px-1 font-mono text-[8.5px] text-faint">
							{world.ants.length}
						</span>
					</Tabs.Tab>
				</Tabs.List>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain max-lg:overflow-visible">
					<Tabs.Panel value="world" className="p-4">
						<p className="mb-3.5 text-[10px] leading-relaxed text-faint">
							The grid the ant walks. Resizing the world resets the run; up to {MAX_GRID.toLocaleString("en-US")} cells
							per side.
						</p>

						<div className="flex flex-col gap-1.5">
							<span className={LABEL_CLASS}>
								Grid size
								<span className={UNIT_CLASS}>cells</span>
							</span>
							<div className="grid grid-cols-2 gap-2">
								<NumberInput
									value={world.width}
									onChange={(width) => onResize(width, world.height)}
									min={3}
									max={MAX_GRID}
									prefix="X"
									disabled={running}
									commitOnBlur
									ariaLabel="Grid width in cells"
								/>
								<NumberInput
									value={world.height}
									onChange={(height) => onResize(world.width, height)}
									min={3}
									max={MAX_GRID}
									prefix="Y"
									disabled={running}
									commitOnBlur
									ariaLabel="Grid height in cells"
								/>
							</div>
						</div>

						<div className="mt-3 flex flex-col gap-1.5">
							<label htmlFor="ipf-input" className={LABEL_CLASS}>
								Iterations per frame
								<span className={UNIT_CLASS}>IPF</span>
							</label>
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
								onValueChange={(values) => {
									const next = Number(values.at(-1))
									if (Number.isFinite(next)) {
										onIpfChange(next)
									}
								}}
								className="mt-1 flex flex-wrap gap-1"
								aria-label="Speed presets"
							>
								{SPEEDS.map((speed) => (
									<Toggle key={speed} value={String(speed)} className={CHIP_CLASS}>
										{speed}×
									</Toggle>
								))}
							</ToggleGroup>
						</div>
					</Tabs.Panel>

					<Tabs.Panel value="ant" className="p-4">
						<div className="mb-3 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
							<span className="font-mono text-[9px] tracking-[0.12em] text-faint uppercase">Editing</span>
							<Badge>{selectedAnt ? `Ant ${selectedIndex + 1}` : "None"}</Badge>
						</div>

						{!selectedAnt ? (
							<p className="mb-3 rounded-control border border-dashed border-line px-3 py-2 text-[10px] leading-relaxed text-faint">
								No ant selected. Pick one in the Ants tab, or add a new ant.
							</p>
						) : null}

						<div className={cn("flex flex-col gap-3", !selectedAnt && "opacity-55")}>
							<div className="flex flex-col gap-1.5">
								<span className={LABEL_CLASS}>
									Position
									<span className={UNIT_CLASS}>x, y</span>
								</span>
								<div className="grid grid-cols-2 gap-2">
									<NumberInput
										value={selectedAnt?.x ?? 0}
										onChange={(x) => onUpdateAnt({ x })}
										min={0}
										max={world.width - 1}
										prefix="X"
										disabled={!selectedAnt}
										commitOnBlur
										ariaLabel="Ant X position"
									/>
									<NumberInput
										value={selectedAnt?.y ?? 0}
										onChange={(y) => onUpdateAnt({ y })}
										min={0}
										max={world.height - 1}
										prefix="Y"
										disabled={!selectedAnt}
										commitOnBlur
										ariaLabel="Ant Y position"
									/>
								</div>
							</div>

							<div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
								<div className="flex flex-col gap-1.5">
									<span className={LABEL_CLASS}>
										Facing
										<span className={UNIT_CLASS}>8-way</span>
									</span>
									<div className="grid grid-cols-3 grid-rows-3 gap-[3px]" role="group" aria-label="Initial ant direction">
										{DIRECTIONS.map((direction) => {
											const Active = selectedAnt?.dx === direction.dx && selectedAnt?.dy === direction.dy
											const Icon = direction.icon

											if (!Icon) {
												return (
													<span
														key={direction.label}
														aria-hidden
														className={cn(
															"grid size-8 place-items-center rounded-[3px] border border-dashed border-line",
															direction.position
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
													disabled={!selectedAnt}
													aria-label={direction.label}
													aria-pressed={Active}
													onClick={() => onUpdateAnt({ dx: direction.dx, dy: direction.dy })}
													className={cn(
														"grid size-8 place-items-center rounded-[3px] border border-line bg-black/20 text-faint transition-colors",
														"hover:border-line-strong hover:bg-white/[0.06] hover:text-fg",
														"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
														"aria-pressed:border-accent/50 aria-pressed:bg-accent-soft aria-pressed:text-accent-bright",
														"disabled:pointer-events-none disabled:opacity-35",
														direction.position
													)}
												>
													<Icon className="size-3.5" aria-hidden />
												</button>
											)
										})}
									</div>
								</div>

								<div className="flex min-w-0 flex-col gap-2.5">
									<div className="flex flex-col gap-1.5">
										<span className={LABEL_CLASS}>
											Step size
											<span className={UNIT_CLASS}>cells</span>
										</span>
										<NumberInput
											value={selectedAnt?.stepSize ?? 1}
											onChange={(stepSize) => onUpdateAnt({ stepSize })}
											min={0}
											max={100000}
											disabled={!selectedAnt}
											commitOnBlur
											ariaLabel="Ant step size"
										/>
									</div>
									<div className="flex flex-col gap-0.5 rounded-[3px] border border-dashed border-line bg-black/15 px-2 py-1.5">
										<span className="font-mono text-[8px] tracking-[0.1em] text-faint uppercase">Vector</span>
										<span className="truncate font-mono text-[9.5px] text-muted">
											{selectedAnt
												? `${selectedAnt.dx}, ${selectedAnt.dy} · ${directionLabel(selectedAnt.dx, selectedAnt.dy)}`
												: "No ant selected"}
										</span>
									</div>
								</div>
							</div>

							<div className="flex flex-col gap-1.5">
								<label htmlFor="ant-rules" className={LABEL_CLASS}>
									State machine
									<span className={UNIT_CLASS}>R L U C</span>
								</label>
								<div className="grid grid-cols-[minmax(0,1fr)_34px_34px] gap-1.5">
									<div
										className={cn(
											"flex h-[34px] items-center rounded-control border border-line bg-black/25 px-2.5 transition-[border-color,box-shadow]",
											"focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/15",
											selectedAnt && !rulesValid && "border-danger/65 ring-[3px] ring-danger/10"
										)}
									>
										<input
											id="ant-rules"
											type="text"
											value={rulesDraft}
											disabled={!selectedAnt}
											spellCheck={false}
											autoComplete="off"
											autoCapitalize="characters"
											aria-invalid={Boolean(selectedAnt) && !rulesValid}
											aria-describedby="rules-hint"
											className="w-full min-w-0 bg-transparent font-mono text-xs tracking-[0.04em] text-accent-bright outline-none disabled:cursor-not-allowed"
											onChange={(event) => setRulesDraft(event.target.value)}
											onBlur={applyRules}
											onKeyDown={(event) => {
												if (event.key === "Enter") {
													event.currentTarget.blur()
												}
											}}
										/>
									</div>
									<Button
										size="icon"
										className="h-[34px] w-[34px]"
										disabled={!selectedAnt}
										aria-label="Mutate one rule"
										title="Mutate one rule"
										onClick={() => {
											const next = [...(selectedAnt?.rules ?? [])]
											if (next.length === 0) { return }
											next[Math.floor(Math.random() * next.length)] = DIRECTION_VALUES[Math.floor(Math.random() * DIRECTION_VALUES.length)]!
											onReplaceRules(next)
										}}
									>
										<Dices className="size-3.5" aria-hidden />
									</Button>
									<Button
										size="icon"
										className="h-[34px] w-[34px]"
										disabled={!selectedAnt}
										aria-label="Randomize the rule set"
										title="Randomize the rule set"
										onClick={() => {
											const length = 4 + Math.floor(Math.random() * 10)
											const next = Array.from({ length }, () => DIRECTION_VALUES[Math.floor(Math.random() * DIRECTION_VALUES.length)]!)
											onReplaceRules(next)
										}}
									>
										<Shuffle className="size-3.5" aria-hidden />
									</Button>
								</div>
								<p id="rules-hint" className={cn("text-[9.5px] leading-relaxed text-faint", selectedAnt && !rulesValid && "text-danger-text")}>
									{rulesHint}
								</p>
								<div className="flex flex-wrap gap-1" aria-label="Rule presets">
									{RULE_PRESETS.map((preset) => {
										const Active = selectedAnt ? stringifyStateMachine(selectedAnt.rules) === preset.label : false
										return (
											<button
												key={preset.label}
												type="button"
												disabled={!selectedAnt}
												className={cn(CHIP_CLASS, Active && "border-accent/40 bg-accent-soft text-accent-bright")}
												onClick={() => {
													setRulesDraft(preset.label)
													onReplaceRules(preset.rules)
												}}
											>
												{preset.label}
											</button>
										)
									})}
								</div>
							</div>

							<div className="flex flex-col gap-1.5">
								<SwitchRow
									title="Wrap edges"
									description="Teleport at borders"
									checked={selectedAnt?.wrap ?? false}
									disabled={!selectedAnt}
									onCheckedChange={(wrap) => onUpdateAnt({ wrap })}
								/>
								<SwitchRow
									title="Enabled"
									description="Include in run"
									checked={selectedAnt?.enabled ?? false}
									disabled={!selectedAnt}
									onCheckedChange={(enabled) => onUpdateAnt({ enabled })}
								/>
							</div>
						</div>
					</Tabs.Panel>

					<Tabs.Panel value="ants" className="p-4">
						<p className="mb-3.5 text-[10px] leading-relaxed text-faint">
							Add, clone or remove ants. Select one here, then edit it in the Ant tab.
						</p>

						<div className="mb-2.5 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-1.5">
							<Button onClick={onAddAnt}>
								<Plus className="size-3.5" aria-hidden />
								Add ant
							</Button>
							<Button disabled={!selectedAnt} onClick={onCloneAnt}>Clone</Button>
							<Button variant="danger" disabled={!selectedAnt} onClick={onRemoveAnt}>Remove</Button>
						</div>

						<div
							className="flex max-h-64 min-h-[66px] flex-col gap-1 overflow-y-auto rounded-control border border-line bg-black/15 p-1"
							aria-label="Ant list"
						>
							{world.ants.length === 0 ? (
								<p className="grid min-h-[56px] place-items-center px-2.5 text-center text-[10px] text-faint">
									No ants yet — add one to start the walk.
								</p>
							) : (
								world.ants.map((ant, index) => {
									const Selected = ant.id === selectedId
									return (
										<button
											key={ant.id}
											type="button"
											aria-pressed={Selected}
											onClick={() => onSelectAnt(ant.id)}
											className={cn(
												"flex h-[30px] shrink-0 items-center gap-2 rounded-[3px] border border-transparent px-2 text-left text-[11px] text-muted transition-colors",
												"hover:bg-white/[0.06] hover:text-fg",
												Selected && "border-accent/30 bg-accent-soft text-fg"
											)}
										>
											<span className={cn("size-[5px] rounded-full bg-[#5f5f5f]", Selected && "bg-accent shadow-[0_0_8px_rgb(32_192_192/0.6)]")} />
											<span>Ant {index + 1}</span>
											<span className="ml-auto truncate font-mono text-[9px] text-faint">{stringifyStateMachine(ant.rules)}</span>
											<ChevronRight className={cn("size-3 text-faint", Selected && "text-accent")} aria-hidden />
										</button>
									)
								})
							)}
						</div>
					</Tabs.Panel>
				</div>
			</Tabs.Root>

			<div className="flex shrink-0 items-center gap-3 border-t border-line bg-white/[0.012] px-3.5 py-1.5 text-[9px] text-faint">
				<span><kbd className="mr-1">Space</kbd>run</span>
				<span><kbd className="mr-1">S</kbd>step</span>
				<span><kbd className="mr-1">R</kbd>reset</span>
			</div>

			<div className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-black/25 px-3 py-2">
				<Button size="small" onClick={onCopyLink}>
					<Link2 className="size-3" aria-hidden />
					Copy link
				</Button>
				<a
					className="inline-flex items-center gap-1 px-1 py-1 text-[10.5px] text-faint transition-colors hover:text-fg"
					href="https://github.com/rafa-br34/LangtonsAnt"
					target="_blank"
					rel="noopener"
				>
					Source
					<ExternalLink className="size-2.5" aria-hidden />
				</a>
			</div>
		</aside>
	)
}

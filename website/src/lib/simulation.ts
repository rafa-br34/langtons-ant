import type { AntConfig, DirectionValue } from "./ant"

export const MAX_IPF = 1_000_000

const DIRECTIONS_X = [0, 1, 1, 1, 0, -1, -1, -1] as const
const DIRECTIONS_Y = [-1, -1, 0, 1, 1, 1, 0, -1] as const
const VECTOR_LOOKUP = [7, 0, 1, 6, 0, 2, 5, 4, 3] as const

export class LiveAnt {
	x: number
	y: number
	dx: number
	dy: number

	lastX = 0
	lastY = 0

	readonly rules: readonly DirectionValue[]
	readonly wrap: boolean
	readonly stepSize: number

	constructor(config: AntConfig) {
		this.x = config.x
		this.y = config.y
		this.dx = config.dx
		this.dy = config.dy
		this.rules = config.rules.length > 0 ? config.rules : [2, -2]
		this.wrap = config.wrap
		this.stepSize = config.stepSize
	}

	rotate(rotation: number) {
		const index = (VECTOR_LOOKUP[3 * this.dy + this.dx + 4]! + rotation + 8) % 8
		this.dx = DIRECTIONS_X[index]!
		this.dy = DIRECTIONS_Y[index]!
	}

	wrapPosition(width: number, height: number) {
		if (this.x < 0) this.x = width - 1
		if (this.y < 0) this.y = height - 1
		if (this.x >= width) this.x = 0
		if (this.y >= height) this.y = 0
	}

	update(grid: Uint8Array, width: number, height: number) {
		if (this.x < 0 || this.y < 0 || this.x >= width || this.y >= height) {
			return false
		}

		const cellIndex = width * this.y + this.x
		const cellValue = grid[cellIndex]!

		this.rotate(this.rules[cellValue % this.rules.length]!)
		this.x += this.dx * this.stepSize
		this.y += this.dy * this.stepSize

		grid[cellIndex] = (cellValue + 1) % this.rules.length

		if (this.wrap) {
			this.wrapPosition(width, height)
		}

		return true
	}

	updatePosition(grid: Uint8Array, width: number, height: number) {
		const cellValue = grid[width * this.y + this.x]!

		this.rotate(this.rules[cellValue % this.rules.length]!)

		this.lastX = this.x
		this.lastY = this.y

		this.x += this.dx * this.stepSize
		this.y += this.dy * this.stepSize

		if (this.wrap) {
			this.wrapPosition(width, height)
		}
	}

	updateCell(grid: Uint8Array, width: number, height: number) {
		if (this.x < 0 || this.y < 0 || this.x >= width || this.y >= height) {
			return false
		}

		const cellIndex = width * this.lastY + this.lastX
		grid[cellIndex] = (grid[cellIndex]! + 1) % this.rules.length

		return true
	}
}

export class Simulation {
	width = 0
	height = 0
	grid = new Uint8Array(0)
	totalIterations = 0

	ants: LiveAnt[] = []
	templates: AntConfig[] = []

	get bufferBytes() {
		return this.grid.byteLength
	}

	resize(width: number, height: number) {
		this.width = width
		this.height = height
		this.grid = new Uint8Array(width * height)
		this.totalIterations = 0
		this.ants = []
	}

	setAnts(ants: readonly AntConfig[]) {
		this.templates = ants.filter((ant) => ant.enabled)
		this.reset()
	}

	reset() {
		this.totalIterations = 0
		this.grid.fill(0)
		this.ants = this.templates.map((config) => new LiveAnt(config))
	}

	update(iterations = 1) {
		if (this.width <= 0 || this.height <= 0 || this.grid.length === 0) {
			return 0
		}

		const width = this.width
		const height = this.height
		const grid = this.grid

		let iterated = 0

		if (this.ants.length === 1) {
			const ant = this.ants[0]!

			for (; iterated < iterations; iterated += 1) {
				if (!ant.update(grid, width, height)) {
					this.ants = []
					break
				}
			}
		}
		else if (this.ants.length > 1) {
			for (; iterated < iterations; iterated += 1) {
				for (const ant of this.ants) {
					ant.updatePosition(grid, width, height)
				}

				this.ants = this.ants.filter((ant) => ant.updateCell(grid, width, height))

				if (this.ants.length === 0) {
					break
				}
			}
		}

		this.totalIterations += iterated
		return iterated
	}
}

export class FrameTimer {
	sampleCount = 1
	sampleIndex = 0
	min = 0
	max = 0
	average = 0

	samples: number[] = []
	timeScale = 1

	get fps() {
		return this.average > 0 ? 1000 / this.average : 0
	}

	update() {
		let average = 0
		let min = this.samples[0] ?? 0
		let max = 0

		const sampleCount = Math.min(this.samples.length, this.sampleCount)

		for (let i = 0; i < sampleCount; i += 1) {
			const sample = this.samples[i]!
			min = Math.min(min, sample)
			max = Math.max(max, sample)
			average += (sample - average) / (i + 1)
		}

		this.average = average
		this.min = min
		this.max = max
	}

	addSample(sample: number) {
		this.samples[this.sampleIndex] = sample * this.timeScale
		this.sampleIndex = (this.sampleIndex + 1) % this.sampleCount
	}
}

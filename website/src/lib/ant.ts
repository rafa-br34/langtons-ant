export const DIRECTION = {
	R45: 1,
	R90: 2,
	R135: 3,
	L45: -1,
	L90: -2,
	L135: -3,
	C: 0,
	U: 4,
} as const

export type DirectionValue = (typeof DIRECTION)[keyof typeof DIRECTION]

export const DIRECTION_VALUES: readonly DirectionValue[] = [1, 2, 3, -1, -2, -3, 0, 4]

const DIRECTION_STRINGS = ["L135", "L", "L45", "C", "R45", "R", "R135", "U"] as const

const DIRECTION_SET = new Set<number>(DIRECTION_VALUES)

export interface Vec2 {
	x: number
	y: number
}

export interface AntConfig {
	id: string
	x: number
	y: number
	dx: number
	dy: number
	rules: DirectionValue[]
	wrap: boolean
	stepSize: number
	enabled: boolean
}

export interface ParsedStateMachine {
	rules: DirectionValue[]
	valid: boolean
}

let nextAntId = 0

export function createAntId() {
	nextAntId += 1
	return `ant-${nextAntId.toString(36)}`
}

export function createDefaultAnt(width: number, height: number): AntConfig {
	return {
		id: createAntId(),
		x: Math.floor(width / 2),
		y: Math.floor(height / 2),
		dx: 0,
		dy: -1,
		rules: [DIRECTION.R90, DIRECTION.L90],
		wrap: true,
		stepSize: 1,
		enabled: true,
	}
}

export function parseStateMachine(input: string): ParsedStateMachine {
	const source = input.toUpperCase().replace(/[\s,;]+/g, "")
	const rules: DirectionValue[] = []
	let index = 0

	while (index < source.length) {
		const character = source[index]

		if (character === "R" || character === "L") {
			const sign = character === "R" ? 1 : -1
			let angle = 90

			const match = source.slice(index + 1).match(/^(45|90|135)/)
			if (match) {
				angle = Number(match[1])
				index += match[1].length
			}

			rules.push((sign * (angle / 45)) as DirectionValue)
			index += 1
			continue
		}

		if (character === "C") {
			rules.push(DIRECTION.C)
			index += 1
			continue
		}

		if (character === "U") {
			rules.push(DIRECTION.U)
			index += 1
			continue
		}

		return { rules: [], valid: false }
	}

	return { rules, valid: rules.length > 0 }
}

export function stringifyStateMachine(rules: readonly DirectionValue[], separator = "") {
	return rules.map((value) => DIRECTION_STRINGS[(value + 3) % DIRECTION_STRINGS.length]).join(separator)
}

export function isDirectionValue(value: unknown): value is DirectionValue {
	return typeof value === "number" && DIRECTION_SET.has(value)
}

export function normalizeRules(value: unknown): DirectionValue[] | null {
	if (!Array.isArray(value) || value.length === 0) {
		return null
	}

	const rules = value.filter(isDirectionValue)
	return rules.length === value.length ? rules : null
}

export function randomRules() {
	const length = 4 + Math.floor(Math.random() * 10)
	return Array.from({ length }, () => DIRECTION_VALUES[Math.floor(Math.random() * DIRECTION_VALUES.length)]!)
}

export function mutateRules(rules: readonly DirectionValue[]) {
	if (rules.length === 0) {
		return randomRules()
	}

	const next = [...rules]
	next[Math.floor(Math.random() * next.length)] = DIRECTION_VALUES[Math.floor(Math.random() * DIRECTION_VALUES.length)]!
	return next
}

export const DIRECTION_LABELS: Record<string, string> = {
	"0,-1": "North",
	"1,-1": "North east",
	"1,0": "East",
	"1,1": "South east",
	"0,1": "South",
	"-1,1": "South west",
	"-1,0": "West",
	"-1,-1": "North west",
}

export function directionLabel(dx: number, dy: number) {
	return DIRECTION_LABELS[`${dx},${dy}`] ?? "Unknown"
}

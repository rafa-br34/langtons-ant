import { compressSync, decompressSync, strFromU8, strToU8 } from "fflate"

import { type AntConfig, createAntId, createDefaultAnt, type DirectionValue, normalizeRules } from "./ant"
import { DEFAULT_IPF, MAX_IPF } from "./simulation"
import { clamp } from "./utils"

export const MAX_GRID = 8192

export interface WorldConfig {
	width: number
	height: number
	ants: AntConfig[]
}

export interface SharedState {
	world: WorldConfig
	ipf: number
}

interface SerializedAnt {
	x: number
	y: number
	dx: number
	dy: number
	rules: DirectionValue[]
	wrap: boolean
	stepSize: number
	enabled: boolean
}

interface SerializedWorld {
	version: 2
	width: number
	height: number
	ants: SerializedAnt[]
	ipf?: number
}

export const DEFAULT_WORLD: WorldConfig = {
	width: 300,
	height: 300,
	ants: [createDefaultAnt(300, 300)],
}

function toInteger(value: unknown, fallback: number) {
	return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback
}

function normalizeSize(value: unknown, fallback: number) {
	return clamp(toInteger(value, fallback), 3, MAX_GRID)
}

function parseAnt(value: unknown): AntConfig | null {
	if (!value || typeof value !== "object") {
		return null
	}

	const record = value as Record<string, unknown>
	const position = (record.Position ?? record) as Record<string, unknown>
	const direction = (record.Direction ?? record) as Record<string, unknown>
	const rules = normalizeRules(record.StateMachine ?? record.rules)

	if (!rules) {
		return null
	}

	const dx = toInteger(direction.X ?? direction.dx, 0)
	const dy = toInteger(direction.Y ?? direction.dy, -1)

	if (!Number.isInteger(dx) || !Number.isInteger(dy)) {
		return null
	}

	if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (dx === 0 && dy === 0)) {
		return null
	}

	return {
		dx,
		dy,
		rules,
		id: createAntId(),
		x: clamp(toInteger(position.X ?? position.x, 0), 0, MAX_GRID - 1),
		y: clamp(toInteger(position.Y ?? position.y, 0), 0, MAX_GRID - 1),
		wrap: Boolean(record.Wrap ?? record.wrap),
		stepSize: clamp(toInteger(record.StepSize ?? record.stepSize, 1), 0, 100000),
		enabled: record.enabled === undefined ? true : Boolean(record.enabled),
	}
}

function parseWorld(value: unknown): WorldConfig | null {
	if (!value || typeof value !== "object") {
		return null
	}

	const record = value as Record<string, unknown>
	const size = (record.Size ?? record) as Record<string, unknown>
	const width = normalizeSize(size.X ?? size.width, 300)
	const height = normalizeSize(size.Y ?? size.height, 300)
	const rawAnts = record.Ants ?? record.ants

	if (!Array.isArray(rawAnts)) {
		return null
	}

	const ants = rawAnts.map(parseAnt).filter((ant): ant is AntConfig => ant !== null)

	if (ants.length === 0) {
		return null
	}

	for (const ant of ants) {
		ant.x = clamp(ant.x, 0, width - 1)
		ant.y = clamp(ant.y, 0, height - 1)
	}

	return { width, height, ants }
}

function parseState(value: unknown): SharedState | null {
	const world = parseWorld(value)
	if (!world) {
		return null
	}

	const record = value as Record<string, unknown>
	const ipf = clamp(toInteger(record.ipf, DEFAULT_IPF), 1, MAX_IPF)

	return { world, ipf }
}

export function serializeState(state: SharedState): string {
	const payload: SerializedWorld = {
		version: 2,
		width: state.world.width,
		height: state.world.height,
		ipf: clamp(Math.round(state.ipf), 1, MAX_IPF),
		ants: state.world.ants.map(ant => ({
			x: ant.x,
			y: ant.y,
			dx: ant.dx,
			dy: ant.dy,
			rules: ant.rules,
			wrap: ant.wrap,
			stepSize: ant.stepSize,
			enabled: ant.enabled,
		})),
	}

	const compressed = compressSync(strToU8(JSON.stringify(payload)), { level: 9, mem: 12 })
	let binary = ""

	for (const byte of compressed) {
		binary += String.fromCharCode(byte) // NOSONAR typescript:S7758 (fromCharCode uses the 0-255 range)
	}

	return encodeURIComponent(btoa(binary))
}

export function deserializeState(value: string): SharedState | null {
	try {
		const binary = atob(decodeURIComponent(value))
		const bytes = Uint8Array.from(binary, character => character.charCodeAt(0)) // NOSONAR typescript:S7758 (charCodeAt operates in the 0-255 range)
		const parsed: unknown = JSON.parse(strFromU8(decompressSync(bytes)))
		return parseState(parsed)
	}
	catch {
		return null
	}
}

export function readStateFromLocation(search = window.location.search): SharedState | null {
	const encoded = new URLSearchParams(search).get("v")
	return encoded ? deserializeState(encoded) : null
}

export function writeStateToLocation(state: SharedState) {
	if (typeof window === "undefined") {
		return
	}

	const encoded = serializeState(state)
	const url = `${window.location.pathname}?v=${encoded}${window.location.hash}`

	if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
		try {
			window.history.replaceState(null, "", url)
		}
		catch {
			// Extremely long worlds can exceed the URL limit; keep the app running.
		}
	}
}

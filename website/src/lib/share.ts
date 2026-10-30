import { compressSync, decompressSync, strFromU8, strToU8 } from "fflate"

import {
	createAntId,
	createDefaultAnt,
	normalizeRules,
	type AntConfig,
	type DirectionValue
} from "./ant"
import { clamp } from "./utils"

export const MAX_GRID = 8192

export interface WorldConfig {
	width: number
	height: number
	ants: AntConfig[]
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
}

export const DEFAULT_WORLD: WorldConfig = {
	width: 300,
	height: 300,
	ants: [createDefaultAnt(300, 300)]
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

	if (!Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) > 1 || Math.abs(dy) > 1 || (dx === 0 && dy === 0)) {
		return null
	}

	return {
		id: createAntId(),
		x: clamp(toInteger(position.X ?? position.x, 0), 0, MAX_GRID - 1),
		y: clamp(toInteger(position.Y ?? position.y, 0), 0, MAX_GRID - 1),
		dx,
		dy,
		rules,
		wrap: Boolean(record.Wrap ?? record.wrap),
		stepSize: clamp(toInteger(record.StepSize ?? record.stepSize, 1), 0, 100000),
		enabled: record.enabled === undefined ? true : Boolean(record.enabled)
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

export function serializeWorld(world: WorldConfig): string {
	const payload: SerializedWorld = {
		version: 2,
		width: world.width,
		height: world.height,
		ants: world.ants.map((ant) => ({
			x: ant.x,
			y: ant.y,
			dx: ant.dx,
			dy: ant.dy,
			rules: ant.rules,
			wrap: ant.wrap,
			stepSize: ant.stepSize,
			enabled: ant.enabled
		}))
	}

	const compressed = compressSync(strToU8(JSON.stringify(payload)), { level: 9, mem: 12 })
	let binary = ""

	for (const byte of compressed) {
		binary += String.fromCharCode(byte)
	}

	return encodeURIComponent(btoa(binary))
}

export function deserializeWorld(value: string): WorldConfig | null {
	try {
		const binary = atob(decodeURIComponent(value))
		const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
		const parsed: unknown = JSON.parse(strFromU8(decompressSync(bytes)))
		return parseWorld(parsed)
	}
	catch {
		return null
	}
}

export function readWorldFromLocation(search = window.location.search): WorldConfig | null {
	const encoded = new URLSearchParams(search).get("v")
	return encoded ? deserializeWorld(encoded) : null
}

export function writeWorldToLocation(world: WorldConfig) {
	if (typeof window === "undefined") {
		return
	}

	const encoded = serializeWorld(world)
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

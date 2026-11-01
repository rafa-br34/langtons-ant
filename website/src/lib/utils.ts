import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function xorshift32(value: number) {
	value = value >>> 0
	value = (value ^ (value << 13)) >>> 0
	value = (value ^ (value >>> 17)) >>> 0
	value = (value ^ (value << 5)) >>> 0
	value = Math.imul(value, 0x9E3779B9) >>> 0

	return value
}

export function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max)
}

export function parseNumericExpression(input: string, min: number, max: number): number | null {
	const source = input.trim()
	let index = 0

	const fail = (): never => {
		throw new SyntaxError("Invalid numeric expression")
	}

	function skipWhitespace() {
		while (index < source.length && /\s/.test(source[index]!)) {
			index += 1
		}
	}

	function parseExpression(): number {
		let value = parseTerm()

		for (;;) {
			skipWhitespace()
			const operator = source[index]

			if (operator !== "+" && operator !== "-") {
				return value
			}

			index += 1
			const right = parseTerm()
			value = operator === "+" ? value + right : value - right
		}
	}

	function parseTerm(): number {
		let value = parseFactor()

		for (;;) {
			skipWhitespace()
			const operator = source[index]

			if (operator !== "*" && operator !== "/") {
				return value
			}

			index += 1
			const right = parseFactor()

			if (operator === "/" && right === 0) {
				return fail()
			}

			value = operator === "*" ? value * right : value / right
		}
	}

	function parseFactor(): number {
		skipWhitespace()
		const operator = source[index]

		if (operator === "+" || operator === "-") {
			index += 1
			const value = parseFactor()
			return operator === "+" ? value : -value
		}

		return parsePrimary()
	}

	function parsePrimary(): number {
		skipWhitespace()

		if (source[index] === "(") {
			index += 1
			const value = parseExpression()
			skipWhitespace()

			if (source[index] !== ")") {
				fail()
			}

			index += 1
			return applyPercent(value)
		}

		const match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i.exec(source.slice(index))

		if (!match) {
			return fail()
		}

		index += match[0].length
		const value = Number(match[0])

		if (!Number.isFinite(value)) {
			return fail()
		}

		return applyPercent(value)
	}

	function applyPercent(value: number): number {
		skipWhitespace()

		if (source[index] === "%") {
			index += 1
			return value / 100 * max
		}

		return value
	}

	try {
		skipWhitespace()
		if (index >= source.length) {
			return null
		}

		const value = parseExpression()
		skipWhitespace()

		if (index !== source.length || !Number.isFinite(value)) {
			return null
		}

		return clamp(value, min, max)
	}
	catch {
		return null
	}
}

export function round(value: number, precision: number) {
	const factor = 10 ** precision
	return Math.round(value * factor) / factor
}

const MEASUREMENTS = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB", "RB", "QB"] as const

export function measureData(value: number, precision = 2) {
	let scaled = value
	let index = 0

	while (scaled >= 1024 && index < MEASUREMENTS.length - 1) {
		scaled /= 1024
		index += 1
	}

	return `${round(scaled, precision)}${MEASUREMENTS[index]}`
}

export function basePath() {
	const value = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? ""
	if (!value || value === "/") {
		return ""
	}

	return `/${value.replace(/^\/+|\/+$/g, "")}` // NOSONAR typescript:S8786
}

export function withBasePath(path: string) {
	const prefix = basePath()
	const suffix = path.startsWith("/") ? path : `/${path}`
	return `${prefix}${suffix}`
}

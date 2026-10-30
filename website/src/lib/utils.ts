import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max)
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

	return `/${value.replace(/^\/+|\/+$/g, "")}`
}

export function withBasePath(path: string) {
	const prefix = basePath()
	const suffix = path.startsWith("/") ? path : `/${path}`
	return `${prefix}${suffix}`
}

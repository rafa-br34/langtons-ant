export interface SimulationStats {
	fps: number
	ips: number
	iterations: number
	liveAnts: number
	buffer: string
	bandwidth: string
	camera: {
		x: number
		y: number
		zoom: number
	}
}

export const EMPTY_STATS: SimulationStats = {
	fps: 0,
	ips: 0,
	iterations: 0,
	liveAnts: 0,
	buffer: "0B",
	bandwidth: "0B/s",
	camera: { x: 0, y: 0, zoom: 1 },
}

// Mirrors GetColor() in public/shaders/fragment.frag so the exported PNG uses
// exactly the same palette as the WebGL texture.
const PALETTE = new Uint8Array(256 * 3)

for (let state = 0; state < 256; state += 1) {
	let value = state >>> 0

	value = (value ^ (value << 13)) >>> 0
	value = (value ^ (value >>> 17)) >>> 0
	value = (value ^ (value << 5)) >>> 0
	value = Math.imul(value, 0x9E3779B9) >>> 0

	PALETTE[state * 3] = (value >>> 16) & 0xFF
	PALETTE[state * 3 + 1] = (value >>> 8) & 0xFF
	PALETTE[state * 3 + 2] = value & 0xFF
}

export async function textureToPngBlob(grid: Uint8Array, width: number, height: number): Promise<Blob | null> {
	if (width <= 0 || height <= 0 || grid.length < width * height) {
		return null
	}

	try {
		const canvas = document.createElement("canvas")
		canvas.width = width
		canvas.height = height

		const context = canvas.getContext("2d")
		if (!context) {
			return null
		}

		const image = context.createImageData(width, height)
		const data = image.data

		for (let index = 0; index < width * height; index += 1) {
			const paletteIndex = grid[index]! * 3
			const pixelIndex = index * 4

			data[pixelIndex] = PALETTE[paletteIndex]!
			data[pixelIndex + 1] = PALETTE[paletteIndex + 1]!
			data[pixelIndex + 2] = PALETTE[paletteIndex + 2]!
			data[pixelIndex + 3] = 255
		}

		context.putImageData(image, 0, 0)

		return await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(resolve, "image/png")
		})
	}
	catch {
		return null
	}
}

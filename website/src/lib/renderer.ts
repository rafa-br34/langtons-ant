export interface Camera {
	x: number
	y: number
	zoom: number
}

export interface Renderer {
	resize: (width: number, height: number) => void
	draw: (
		camera: Camera,
		gridWidth: number,
		gridHeight: number,
		grid: Uint8Array,
		upload: boolean,
		antialias: boolean,
		pixelGrid: boolean,
	) => void
	dispose: () => void
}

function compileShader(gl: WebGL2RenderingContext, source: string, type: number) {
	const shader = gl.createShader(type)
	if (!shader) {
		throw new Error("Unable to create a WebGL shader")
	}

	gl.shaderSource(shader, source)
	gl.compileShader(shader)

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader)
		gl.deleteShader(shader)
		throw new Error(`Shader compilation failed: ${log ?? "unknown error"}`)
	}

	return shader
}

function createProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) {
	const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER)
	const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER)
	const program = gl.createProgram()

	if (!program) {
		throw new Error("Unable to create a WebGL program")
	}

	gl.attachShader(program, vertexShader)
	gl.attachShader(program, fragmentShader)
	gl.linkProgram(program)

	gl.deleteShader(vertexShader)
	gl.deleteShader(fragmentShader)

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const log = gl.getProgramInfoLog(program)
		gl.deleteProgram(program)
		throw new Error(`Program linking failed: ${log ?? "unknown error"}`)
	}

	return program
}

export function createRenderer(
	canvas: HTMLCanvasElement,
	vertexSource: string,
	fragmentSource: string,
): Renderer {
	const gl = canvas.getContext("webgl2", {
		antialias: false,
		premultipliedAlpha: false,
		preserveDrawingBuffer: true,
	})

	if (!gl) {
		throw new Error("WebGL2 is not available in this browser")
	}

	const program = createProgram(gl, vertexSource, fragmentSource)
	const positionLocation = gl.getAttribLocation(program, "a_VertexPosition")
	const centerUniform = gl.getUniformLocation(program, "u_Center")
	const zoomUniform = gl.getUniformLocation(program, "u_Zoom")
	const scaleUniform = gl.getUniformLocation(program, "u_Scale")
	const viewportUniform = gl.getUniformLocation(program, "u_ViewportSize")
	const antialiasUniform = gl.getUniformLocation(program, "u_Antialias")
	const pixelGridUniform = gl.getUniformLocation(program, "u_PixelGrid")

	// dprint-ignore
	const vertices = new Float32Array([
		-1, -1,
		-1, 1,
		1, -1,

		-1, 1,
		1, -1,
		1, 1
	])

	const vertexBuffer = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

	const vertexArray = gl.createVertexArray()
	gl.bindVertexArray(vertexArray)
	gl.enableVertexAttribArray(positionLocation)
	gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

	const texture = gl.createTexture()
	gl.bindTexture(gl.TEXTURE_2D, texture)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

	let canvasWidth = 1
	let canvasHeight = 1
	let disposed = false

	return {
		resize(width, height) {
			canvasWidth = Math.max(1, width)
			canvasHeight = Math.max(1, height)
			gl.viewport(0, 0, canvasWidth, canvasHeight)
		},

		draw(camera, gridWidth, gridHeight, grid, upload, antialias, pixelGrid) {
			if (disposed) {
				return
			}

			const canvasAspect = canvasWidth / canvasHeight
			const gridAspect = gridWidth / gridHeight

			let scaleX = 1
			let scaleY = 1

			if (canvasAspect > gridAspect) {
				scaleX = gridAspect / canvasAspect
			}
			else {
				scaleY = canvasAspect / gridAspect
			}

			gl.clearColor(0, 0, 0, 0)
			gl.clear(gl.COLOR_BUFFER_BIT)

			gl.useProgram(program)
			gl.uniform2f(centerUniform, camera.x, camera.y)
			gl.uniform1f(zoomUniform, camera.zoom)
			gl.uniform2f(scaleUniform, scaleX, scaleY)
			gl.uniform2f(viewportUniform, canvasWidth, canvasHeight)
			gl.uniform1f(antialiasUniform, antialias ? 1 : 0)
			gl.uniform1f(pixelGridUniform, pixelGrid ? 1 : 0)

			gl.activeTexture(gl.TEXTURE0)
			gl.bindTexture(gl.TEXTURE_2D, texture)

			if (upload) {
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.R8UI,
					gridWidth,
					gridHeight,
					0,
					gl.RED_INTEGER,
					gl.UNSIGNED_BYTE,
					grid,
				)
			}

			gl.bindVertexArray(vertexArray)
			gl.drawArrays(gl.TRIANGLES, 0, 6)
		},

		dispose() {
			if (disposed) {
				return
			}
			disposed = true

			gl.deleteProgram(program)
			gl.deleteBuffer(vertexBuffer)
			gl.deleteVertexArray(vertexArray)
			gl.deleteTexture(texture)
		},
	}
}

#version 300 es

precision highp float;

uniform highp usampler2D u_Grid;
uniform vec2 u_Center;
uniform float u_Zoom;
uniform vec2 u_Scale;
uniform vec2 u_ViewportSize;
uniform float u_Antialias;

in vec2 v_Screen;

out vec4 o_FragColor;

#define XOR_SHIFT32(S) S ^= (S << 13); S ^= (S >> 17); S ^= (S << 5);

#define U8(V) uint(int(V) % 256)
#define FU8(V) float(U8(V)) / 255.0

vec3 GetColor(uint S) {
	// This won't create a very high quality random number but it doesn't really matter.
	XOR_SHIFT32(S); S *= 0x9E3779B9u;

	return vec3(
		FU8((S >> 16) & 0xFFu),
		FU8((S >> 8) & 0xFFu),
		FU8((S >> 0) & 0xFFu)
	);
}

vec2 ScreenToGrid(vec2 screen) {
	return (screen - 0.5) / (u_Zoom * u_Scale) + u_Center;
}

vec3 SampleGrid(vec2 grid) {
	if (grid.x < 0.0 || grid.x >= 1.0 || grid.y < 0.0 || grid.y >= 1.0) {
		return vec3(0.0);
	}

	return GetColor(texture(u_Grid, grid).x);
}

void main() {
	// Screen space: 0,0 is the top-left corner.
	vec2 screen = vec2(v_Screen.x, -v_Screen.y) * 0.5 + 0.5;

	// Camera works in normalized grid space, then the letterbox scale keeps the
	// cells square when the canvas is not square.
	vec2 grid = ScreenToGrid(screen);

	if (grid.x < 0.0 || grid.x >= 1.0 || grid.y < 0.0 || grid.y >= 1.0) {
		// Draw a one-pixel outline just outside the texture so the world bounds
		// are visible even while zoomed out or panned.
		vec2 clampedGrid = clamp(grid, 0.0, 1.0);
		vec2 distanceInPixels = abs(grid - clampedGrid) * u_Zoom * u_Scale * u_ViewportSize;

		if (max(distanceInPixels.x, distanceInPixels.y) <= 1.0) {
			o_FragColor = vec4(1.0);
			return;
		}

		o_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
		return;
	}

	if (u_Antialias > 0.5) {
		// Only supersample pixels that actually straddle a cell boundary. This
		// keeps flat cell interiors as one crisp sample instead of blurring the
		// whole pattern, and avoids paying for 16 samples almost everywhere.
		vec2 gridSize = vec2(textureSize(u_Grid, 0));
		vec2 cell = grid * gridSize;
		vec2 footprint = gridSize / (u_Zoom * u_Scale * u_ViewportSize);
		vec2 halfFootprint = footprint * 0.5;
		vec2 fraction = fract(cell);

		if (any(lessThan(fraction, halfFootprint)) || any(greaterThan(fraction, 1.0 - halfFootprint))) {
			// 4x4 supersampling inside the pixel footprint. Sampling inside the
			// pixel (instead of on its shared corners) means adjacent pixels do
			// not both soften around the same edge.
			vec3 color = vec3(0.0);

			for (int y = 0; y < 4; y++) {
				for (int x = 0; x < 4; x++) {
					vec2 jitter = (vec2(float(x) + 0.5, float(y) + 0.5) / 4.0 - 0.5) / u_ViewportSize;
					color += SampleGrid(ScreenToGrid(screen + jitter));
				}
			}

			o_FragColor = vec4(color / 16.0, 1.0);
			return;
		}
	}

	o_FragColor = vec4(SampleGrid(grid), 1.0);
}

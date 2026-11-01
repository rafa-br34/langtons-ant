#version 300 es

precision highp float;

uniform highp usampler2D u_Grid;
uniform vec2 u_Center;
uniform float u_Zoom;
uniform vec2 u_Scale;
uniform vec2 u_ViewportSize;
uniform float u_Antialias;
uniform float u_PixelGrid;

in vec2 v_Screen;

out vec4 o_FragColor;

#define XOR_SHIFT32(S) S ^= (S << 13); S ^= (S >> 17); S ^= (S << 5);

#define U8(V) uint(int(V) % 256)
#define FU8(V) float(U8(V)) / 255.0

const vec3 BORDER_COLOR = vec3(0.125, 0.753, 0.753);

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

vec3 ApplyPixelGrid(vec3 color, vec2 grid) {
	if (u_PixelGrid < 0.5) {
		return color;
	}

	vec2 gridSize = vec2(textureSize(u_Grid, 0));
	vec2 footprint = gridSize / (u_Zoom * u_Scale * u_ViewportSize);
	float cellPixels = 1.0 / max(max(footprint.x, footprint.y), 0.0001);
	float fade = smoothstep(3.5, 6.0, cellPixels);

	if (fade <= 0.0) {
		return color;
	}

	vec2 cell = grid * gridSize;
	vec2 distanceInPixels = min(fract(cell), 1.0 - fract(cell)) / max(footprint, vec2(0.0001));

	if (min(distanceInPixels.x, distanceInPixels.y) < 0.5) {
		return mix(color, vec3(1.0), 0.35 * fade);
	}

	return color;
}

void main() {
	vec2 screen = vec2(v_Screen.x, -v_Screen.y) * 0.5 + 0.5;
	vec2 grid = ScreenToGrid(screen);

	if (grid.x < 0.0 || grid.x >= 1.0 || grid.y < 0.0 || grid.y >= 1.0) {
		vec2 clampedGrid = clamp(grid, 0.0, 1.0);
		vec2 distanceInPixels = abs(grid - clampedGrid) * u_Zoom * u_Scale * u_ViewportSize;
		float borderCoverage = 1.0 - smoothstep(1.0, 2.0, max(distanceInPixels.x, distanceInPixels.y));

		if (borderCoverage > 0.0) {
			o_FragColor = vec4(BORDER_COLOR * borderCoverage, 1.0);
			return;
		}

		o_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
		return;
	}

	if (u_Antialias > 0.5) {
		vec2 gridSize = vec2(textureSize(u_Grid, 0));
		vec2 cell = grid * gridSize;
		vec2 footprint = gridSize / (u_Zoom * u_Scale * u_ViewportSize);
		vec2 halfFootprint = footprint * 0.5;
		vec2 fraction = fract(cell);

		if (any(lessThan(fraction, halfFootprint)) || any(greaterThan(fraction, 1.0 - halfFootprint))) {
			vec3 color = vec3(0.0);

			for (int y = 0; y < 4; y++) {
				for (int x = 0; x < 4; x++) {
					vec2 jitter = (vec2(float(x) + 0.5, float(y) + 0.5) / 4.0 - 0.5) / u_ViewportSize;
					color += SampleGrid(ScreenToGrid(screen + jitter));
				}
			}

			o_FragColor = vec4(ApplyPixelGrid(color / 16.0, grid), 1.0);
			return;
		}
	}

	o_FragColor = vec4(ApplyPixelGrid(SampleGrid(grid), grid), 1.0);
}

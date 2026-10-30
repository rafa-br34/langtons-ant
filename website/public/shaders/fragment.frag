#version 300 es

precision highp float;

uniform highp usampler2D u_Grid;
uniform vec2 u_Center;
uniform float u_Zoom;
uniform vec2 u_Scale;

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

void main() {
	// Screen space: 0,0 is the top-left corner.
	vec2 screen = vec2(v_Screen.x, -v_Screen.y) * 0.5 + 0.5;

	// Camera works in normalized grid space, then the letterbox scale keeps the
	// cells square when the canvas is not square.
	vec2 grid = (screen - 0.5) / (u_Zoom * u_Scale) + u_Center;

	if (grid.x < 0.0 || grid.x >= 1.0 || grid.y < 0.0 || grid.y >= 1.0) {
		o_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
		return;
	}

	o_FragColor = vec4(GetColor(texture(u_Grid, grid).x), 1.0);
}

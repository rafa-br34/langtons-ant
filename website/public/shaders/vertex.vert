#version 300 es

in vec2 a_VertexPosition;

out vec2 v_Screen;

void main() {
	v_Screen = a_VertexPosition;
	gl_Position = vec4(a_VertexPosition, 0.0, 1.0);
}

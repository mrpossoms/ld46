varying lowp vec2 v_tex_coord;

uniform sampler2D u_texture;
uniform mediump float u_percentage;

void main (void)
{
	lowp vec4 color = texture2D(u_texture, v_tex_coord);
	if ((1.0 - v_tex_coord.y) > u_percentage) { color.a = 0.0; }
    gl_FragColor = color;
}

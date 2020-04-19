attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec3 a_color;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_proj;

varying lowp vec3 v_color;

void main (void)
{
  gl_Position = u_proj * u_view * u_model * vec4(a_position, 1.0);
  float l = (dot(normalize(vec3(1.0, 1.0, 0.0)), a_normal) + 1.0) * 0.5;
  v_color = a_color * min(1.0, 0.25 + l);
}

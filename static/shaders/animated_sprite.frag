uniform sampler2D u_sprite_sheet;
uniform lowp vec4 u_origin_size;
varying lowp vec2 v_tex_coord;
void main (void)
{
    lowp vec2 origin = u_origin_size.xy;
    lowp vec2 size = u_origin_size.zw;
    gl_FragColor = texture2D(u_sprite_sheet, v_tex_coord * size + origin);
}
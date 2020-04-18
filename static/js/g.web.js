g.web = {
	_draw: function() {},
	_on_message: function() {},
	_on_event: {},
	_canvas: null,

	gfx: {
		_initalize: function()
		{
			with (g.web)
			{
				if (_canvas == null)
				{
					console.error('Canvas element has not been set, WebGL cannot initialize');
					return false;
				}

				const gl = _canvas.getContext('webgl');

				if (gl == null)
				{
					alert('Unable to initialize WebGL. Your browser or machine may not support it.');
					return false;
				}

				gl.clearColor(0.1, 0.1, 0.1, 1.0);
				gl.clearDepth(1.0);                 // Clear everything
				gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
				gl.enable(gl.DEPTH_TEST);           // Enable depth testing
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

				window.gl = gl;

				if (document.body.onresize) { document.body.onresize(); }

				return true;
			}
		},
		camera: function() {
			this._q = [0,0,0,1];
			this._view = [].I(4);
			this._proj = [].I(4);
			this._pos = [0,0,0];
			this._forward = [0,0,1];
			this._up = [0,1,0];

			this.look_at = function(position, subject, up)
			{
				if (position && subject && up)
				{
					this._pos = position;
					this._forward = subject.sub(position).norm();
					this._up = up.norm();
					this._view = [].view(this._pos, this._forward, this._up);
				}

				return this._view;
			};

			this.view = function(position, forward, up)
			{
				if (position && forward && up)
				{
					this._pos = position;
					this._forward = forward.norm();
					this._up = up.norm();
					this._view = [].view(this._pos, this._forward, this._up);
				}

				return this._view;
			};

			this.orientation = function(q)
			{
				if (q) { this._q = q; }
				return this._q;
			};

			this.tilt = function(d_yaw, d_pitch, d_roll)
			{
				d_yaw = d_yaw || 0;
				d_pitch = d_pitch || 0;
				d_roll = d_roll || 0;

				const dqx = [].quat_rotation([1, 0, 0], d_pitch);
				const dqy = [].quat_rotation([0, 1, 0], d_yaw);
				const dqz = [].quat_rotation([0, 0, 1], d_roll);
				const dq = dqx.quat_mul(dqy).quat_mul(dqz);
				this._q = this._q.quat_mul(dq);

				this._up = this._q.quat_rotate_vector([0, 1, 0]);
				this._forward = this._q.quat_rotate_vector([0, 0, 1]);

				this.view(this._pos, this._forward, this._up);
			};

			this.position = function(p)
			{
				if (p)
				{
					this._pos = p;
					this.view(this._pos, this._forward, this._up);
				}

				return this._pos;
			};

			this.up = function(u)
			{
				if (u)
				{
					this._up = u;
					this.view(this._pos, this._forward, this._up);
				}

				return this._up;
			};

			this.forward = function(f)
			{
				if (f)
				{
					this._forward = f;
					this.view(this._pos, this._forward, this._up);
				}

				return this._forward;
			};

			this.projection = function() { return this._proj; }

			this.perspective = function(fov, near, far)
			{
				fov = fov || Math.PI / 2;
				near = near || 0.1;
				far = far || 500;

				this._proj = [].perspective(fov, g.web.gfx.aspect(), near, far);

				return this;
			};

			this.orthographic = function(near, far)
			{
				const a = g.web.gfx.aspect();
				near = near || 0.1;
				far = far || 100;
				this._proj = [].orthographic(-a, a, -1, 1, near, far);

				return this;
			};
		},
		width: function() { return g.web._canvas.width; },
		height: function() { return g.web._canvas.height; },
		aspect: function()
		{
			return g.web._canvas.width / g.web._canvas.height;
		},
		texture: {
			_filtering: null,
			_wraping: null,

			repeating: function() { this._wraping = gl.REPEAT; return this; },
			clamped: function() { this._wraping = gl.CLAMP_TO_EDGE; return this; },
			pixelated: function() { this._filtering = gl.NEAREST; return this; },
			smooth: function() { this._filtering = gl.LINEAR; return this; },

			create: function(img)
			{
				const tex = gl.createTexture();
				const filter = g.web.gfx.texture._filtering || gl.LINEAR;
				var wrap = g.web.gfx.texture._wraping || gl.REPEAT;
				
				function is_power_of_2(n) { return (n != 0) && ((n & (n - 1))) == 0; }

				if (!is_power_of_2(img.width) || !is_power_of_2(img.height)) { wrap = gl.CLAMP_TO_EDGE; }

				// img.onload = function()
				{
					gl.bindTexture(gl.TEXTURE_2D, tex);
					gl.texImage2D(
						gl.TEXTURE_2D,
						0,
						gl.RGBA,
						gl.RGBA,
						gl.UNSIGNED_BYTE,
						img
					);

					if (wrap == null)
					{ console.error('Texture wrap not specified. Please call repeating() or clamped()'); }
					if (filter == null)
					{ console.error('Texture filter not specified. Please call pixelated() or smooth()'); }

					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
				};

				return tex;
			}
		},
		shader: {
			create: function(name, vertex_src, fragment_src)
			{
				function load_shader(type, source)
				{
					const shader = gl.createShader(type);

					// Send the source to the shader object
					gl.shaderSource(shader, source);

					// Compile the shader program
					gl.compileShader(shader);

					// See if it compiled successfully
					if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
					{
						console.error('Error building ' + type);
						console.error(source);
						console.error('An error occurred compiling the shader: ' + gl.getShaderInfoLog(shader));
						console.error('-------------------------');

						gl.deleteShader(shader);
						return null;
					}

					return shader;
				}

				const vertex_shader = load_shader(gl.VERTEX_SHADER, vertex_src);
				const fragment_shader = load_shader(gl.FRAGMENT_SHADER, fragment_src);

				const program = gl.createProgram();
				gl.attachShader(program, vertex_shader);
				gl.attachShader(program, fragment_shader);
				gl.linkProgram(program);

				if (!gl.getProgramParameter(program, gl.LINK_STATUS))
				{
					console.error('Failed to link shader program: ' + gl.getProgramInfoLog(program));
					return null;
				}

				return g.web.gfx.shader[name] = program;
			}
		},
		mesh: {
			create: function(mesh_json)
			{
				var mesh = {
					indices: null,
					vertices: {},
					shader_configs: {},

					buffer: function(buffer_name)
					{
						const mesh_ref = this;

						return {
							set_data: function(v)
							{
								gl.bindBuffer(gl.ARRAY_BUFFER, mesh_ref.vertices[buffer_name]);
								gl.bufferData(gl.ARRAY_BUFFER, v.as_Float32Array(), gl.DYNAMIC_DRAW);
							},
						};
					},

					using_shader: function(shader_name)
					{
						const mesh_ref = this;
						const shader = g.web.gfx.shader[shader_name];
						var tex_unit = 0;
						gl.useProgram(shader);

						return {
							with_attribute: function(description)
							{
								// TODO: add functionality to cache vertex attr pointers
								const buf = mesh_ref.vertices[description.buffer];

								if (buf === undefined) { console.error('Cannot use undefined buffer'); return; }
								gl.bindBuffer(gl.ARRAY_BUFFER, buf);
								const loc = gl.getAttribLocation(shader, description.name);
								if (loc < 0)
								{
									console.error('Cannot find location for attribute "' + name + '" in shader "' + shader_name + '"');
									return null;
								}

								gl.vertexAttribPointer(
									loc,
									description.components || 1,
									description.type || gl.FLOAT,
									description.normalized || false,
									description.stride || 0,
									description.offset || 0
								);
								gl.enableVertexAttribArray(loc);

								return this;
							},
							with_camera: function(camera)
							{
								return this.set_uniform('u_proj').mat4(camera.projection())
										   .set_uniform('u_view').mat4(camera.view());
							},
							set_uniform: function(uni_name)
							{
								const shader_ref = this;
								const loc = gl.getUniformLocation(shader, uni_name);

								if (loc < 0) { console.error('Could not find uniform "' + uni_name + '"'); }

								return {
									mat4: function(m)
									{
										const v = m.as_Float32Array();
										gl.uniformMatrix4fv(loc, false, v);
										return shader_ref;
									},
									vec3: function(v)
									{
										gl.uniform3fv(loc, v.as_Float32Array(), 1);
										return shader_ref;
									},
									vec4: function(v)
									{
										gl.uniform4fv(loc, v.as_Float32Array(), 1);
										return shader_ref;
									},
									float: function(s)
									{
										gl.uniform1f(loc, s);
										return shader_ref;
									},
									texture: function(tex)
									{
										gl.activeTexture(gl.TEXTURE0 + tex_unit);
										gl.bindTexture(gl.TEXTURE_2D, tex);
										gl.uniform1i(loc, tex_unit);
										++tex_unit;
										return shader_ref;
									},
								};
							},
							draw_tris: function()
							{
								if (mesh_ref.indices)
								{
									gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh_ref.indices);
									gl.drawElements(
										gl.TRIANGLES,
										mesh_ref.element_count,
										gl.UNSIGNED_SHORT,
										0
									);
								}
								else
								{
									gl.drawArrays(gl.TRIANGLES, 0, mesh_ref.positions.length / 9);
								}
							},
							draw_tri_strip: function()
							{
								if (mesh_ref.indices)
								{
									gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh_ref.indices);
									gl.drawElements(
										gl.TRIANGLE_STRIP,
										mesh_ref.element_count,
										gl.UNSIGNED_SHORT,
										0
									);
								}
								else
								{
									gl.drawArrays(gl.TRIANGLE_STRIP, 0, mesh_ref.element_count / 3);
								}
							},
							draw_lines: function()
							{
								if (mesh_ref.indices)
								{
									gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh_ref.indices);
									gl.drawElements(
										gl.LINES,
										mesh_ref.element_count,
										gl.UNSIGNED_SHORT,
										0
									);
								}
								else
								{
									gl.drawArrays(gl.LINES, 0, mesh_ref.element_count / 3);
								}
							},
							draw_points: function()
							{
								if (mesh_ref.indices)
								{
									gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh_ref.indices);
									gl.drawElements(
										gl.POINTS,
										mesh_ref.element_count,
										gl.UNSIGNED_SHORT,
										0
									);
								}
								else
								{
									gl.drawArrays(gl.POINTS, 0, mesh_ref.element_count / 3);
								}
							}
						};
					},
				};

				if (!mesh_json) { return mesh; }

				if (mesh_json.positions)
				{
					mesh.vertices.positions = gl.createBuffer();
					gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertices.positions);
					gl.bufferData(gl.ARRAY_BUFFER, mesh_json.positions.as_Float32Array(), gl.STATIC_DRAW);
				}

				if (mesh_json.texture_coords)
				{
					mesh.vertices.texture_coords = gl.createBuffer();
					gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertices.texture_coords);
					gl.bufferData(gl.ARRAY_BUFFER, mesh_json.texture_coords.as_Float32Array(), gl.STATIC_DRAW);
				}

				if (mesh_json.colors)
				{
					mesh.vertices.colors = gl.createBuffer();
					gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertices.colors);
					gl.bufferData(gl.ARRAY_BUFFER, mesh_json.colors.as_Float32Array(), gl.STATIC_DRAW);
				}

				if (mesh_json.normals)
				{
					mesh.vertices.normals = gl.createBuffer();
					gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertices.normals);
					gl.bufferData(gl.ARRAY_BUFFER, mesh_json.normals.as_Float32Array(), gl.STATIC_DRAW);
				}

				if (mesh_json.indices)
				{
					mesh.indices = gl.createBuffer();
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
					gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh_json.indices.as_Int16Array(), gl.STATIC_DRAW);
					mesh.element_count = mesh_json.indices.length;
				}
				else
				{
					mesh.element_count = mesh_json.positions.length;
				}

				return mesh;
			},
			generate: {
				from_voxels: function(voxel_data)
				{
					var mesh = {
						positions: [],
						normals: [],
						colors: [],
						texture_coords: [],
						indices: [],
					};

					const w = voxel_data.width;
					const h = voxel_data.height;
					const d = voxel_data.depth;
					const s = voxel_data.scale;
					const cells = voxel_data.cells;

					// volume extents
					var min = [-w, -h, -d].mul(0.5 * s), max = [w, h, d].mul(0.5 * s);

					/*
							x -->

						z   3---2
						|   | / |
						v   |/  |
							0---1

						indices [ 0, 3, 2, 0, 2, 1 ]
					*/

					const cell_dims = [s / w, s / h, s / d];

					var i = 0;
					for (var wi = 0; wi < w; ++wi)
					for (var hi = 0; hi < h; ++hi)
					for (var di = 0; di < d; ++di)
					{
						function has_neighbor_w(delta)
						{
							delta = wi + delta;
							if (delta < 0 || delta >= w) { return false; }
							return cells[delta][hi][di] > 0;
						}

						function has_neighbor_h(delta)
						{
							delta = hi + delta;
							if (delta < 0 || delta >= h) { return false; }
							return cells[wi][delta][di] > 0;
						}

						function has_neighbor_d(delta)
						{
							delta = di + delta;
							if (delta < 0 || delta >= d) { return false; }
							return cells[wi][hi][delta] > 0;
						}

						const cell = cells[wi][hi][di];
						if (cell > 0)
						{
							const cell_top = has_neighbor_h(1), cell_bottom = has_neighbor_h(-1);
							const cell_left = has_neighbor_w(-1), cell_right = has_neighbor_w(1);
							const cell_front = has_neighbor_d(1), cell_back = has_neighbor_d(-1);
							
							var corners = [];
							if (!cell_bottom) corners.push([[ 0, 0, 0 ], [ s, 0, 0 ], [ s, 0, s ], [ 0, 0, s ]]); // bottom 00-03
							if (!cell_left)   corners.push([[ 0, 0, 0 ], [ 0, s, 0 ], [ 0, s, s ], [ 0, 0, s ]]); // left   04-07
							if (!cell_front)  corners.push([[ 0, 0, s ], [ 0, s, s ], [ s, s, s ], [ s, 0, s ]]); // front  08-12
							if (!cell_right)  corners.push([[ s, 0, 0 ], [ s, s, 0 ], [ s, s, s ], [ s, 0, s ]]); // right  13-17
							if (!cell_back)   corners.push([[ 0, 0, 0 ], [ 0, s, 0 ], [ s, s, 0 ], [ s, 0, 0 ]]); // back   18-22
							if (!cell_top)    corners.push([[ 0, s, 0 ], [ s, s, 0 ], [ s, s, s ], [ 0, s, s ]]); // top    23-27

							var texture_coords = [];
							if (!cell_bottom) texture_coords.push( 0.00, 1.00,  1/6, 1.00,  1/6, 0.00, 0.00, 0.00 ); // bottom
							if (!cell_left)   texture_coords.push(  4/6, 0.00,  4/6, 1.00,  3/6, 1.00,  3/6, 0.00 ); // left
							if (!cell_front)  texture_coords.push(  5/6, 0.00,  5/6, 1.00,  4/6, 1.00,  4/6, 0.00 ); // front
							if (!cell_right)  texture_coords.push(  1/6, 0.00,  1/6, 1.00,  2/6, 1.00,  2/6, 0.00 ); // right
							if (!cell_back)   texture_coords.push(  2/6, 0.00,  2/6, 1.00,  3/6, 1.00,  3/6, 0.00 ); // back
							if (!cell_top)    texture_coords.push(  5/6, 0.00, 1.00, 0.00, 1.00, 1.00,  5/6, 1.00 ); // top

							var normals = [];
							if (!cell_bottom) normals.push( 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0 ); // bottom
							if (!cell_left)   normals.push(-1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0 ); // left
							if (!cell_front)  normals.push( 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1 ); // front
							if (!cell_right)  normals.push( 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0 ); // right
							if (!cell_back)   normals.push( 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1 ); // back
							if (!cell_top)    normals.push( 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0 ); // top

							var indices = [];
							if (!cell_bottom) { indices.push(i + 2, i + 3, i + 0, i + 1, i + 2, i + 0); i += 4; }
							if (!cell_left)   { indices.push(i + 0, i + 3, i + 2, i + 0, i + 2, i + 1); i += 4; }
							if (!cell_front)  { indices.push(i + 0, i + 3, i + 2, i + 0, i + 2, i + 1); i += 4; }
							if (!cell_right)  { indices.push(i + 2, i + 3, i + 0, i + 1, i + 2, i + 0); i += 4; }
							if (!cell_back)   { indices.push(i + 2, i + 3, i + 0, i + 1, i + 2, i + 0); i += 4; }
							if (!cell_top)    { indices.push(i + 0, i + 3, i + 2, i + 0, i + 2, i + 1); i += 4; }

							for (var pi = 0; pi < corners.length; ++pi)
							{
								var plane = corners[pi];
								for (var vi = 0; vi < plane.length; ++vi)
								{
									plane[vi] = plane[vi].add([wi, hi, di].mul(s));
								}
							}

							mesh.positions = mesh.positions.concat(corners.flatten());
							mesh.normals = mesh.normals.concat(normals);
							mesh.texture_coords = mesh.texture_coords.concat(texture_coords);

							mesh.indices = mesh.indices.concat(indices);
						}
					}

					return g.web.gfx.mesh.create(mesh);
				}
			}
		},
		sprite: {
			create: function(aesprite_json)
			{
				const img_w = aesprite_json.meta.size.w;
				const img_h = aesprite_json.meta.size.h;
				var frames = [];
				var tags = {};

				for_each(aesprite_json.meta.frameTags, (frame_tag) => {
					tags[frame_tag.name] = [];
					switch (frame_tag.direction)
					{
						case 'forward':
							for (var i = frame_tag.from; i <= frame_tag.to; ++i)
							{
								tags[frame_tag.name].push(i);
							}
							break;
						case 'pingpong':
							for (var i = frame_tag.from; i <= frame_tag.to; ++i)
							{
								tags[frame_tag.name].push(i);
							}
							for (var i = frame_tag.to; i >= frame_tag.from; --i)
							{
								tags[frame_tag.name].push(i);
							}
							break;
					}

					tag = tags[frame_tag.name];
				});

				for_each(aesprite_json.frames, (frame_meta) => {
					const frame = frame_meta.frame;
					frames.push({
						x: frame.x / img_w,
						y: frame.y / img_h,
						w: frame.w / img_w,
						h: frame.h / img_h,
						sec: frame_meta.duration / 1000
					});
				});

				return function() {
					this.frame_idx = 0;
					this.frame_duration = frames[0].sec;
					this.tag = tag;
					this.tags = tags;
					this.queue = [];

					this.current_frame = function()
					{
						return frames[this.tag[this.frame_idx]];
					}

					this.tick = function(dt)
					{
						while (dt > 0)
						{
							const prev_dur = this.frame_duration;
							this.frame_duration -= dt;

							if (this.frame_duration <= 0)
							{
								this.frame_idx++;
								if (this.frame_idx >= this.tag.length)
								{
									if (this.queue.length > 0)
									{
										this.tag = this.queue.pop();
									}

									this.frame_idx = 0;
								}
								this.frame_duration = this.current_frame().sec;
							}

							dt -= prev_dur;
						}
					};

					this.set = function(tag)
					{
						this.frame_idx = 0;
						this.tag = this.tags[tag];
					}

					this.origin = function()
					{
						return [ this.current_frame().x,  this.current_frame().y ];
					};

					this.size = function()
					{
						return [ this.current_frame().w,  this.current_frame().h ];
					};
				};
			}
		}
	},

	assets: {
		load: function(asset_arr, on_finish)
		{
			var count = asset_arr.length;

			function load_resource(path)
			{
				return fetch(path).then(function(res)
				{
					console.log('Loading: ' + path);
					const type = res.headers.get('content-type');
					const type_stem = type.split('/')[0];
					var bytes_to_read = parseInt(res.headers.get('content-length'));

					switch (type_stem)
					{
						case 'image':
						{
							var img = new Image();
							img.src = res.url;
							g.web.assets[path] = img;
							console.log('Finished: ' + path);

							// create webgl texture automatically
							img.onload = function()
							{
								const fields = path.split('.');
								const name = fields[0];
								const tex_name = name.replace('imgs', 'tex');

								var chain = g.web.gfx.texture.smooth().repeating();

								if (fields.indexOf('pixelated') > 0) { chain = chain.pixelated(); }
								if (fields.indexOf('smooth') > 0) { chain = chain.smooth(); }
								if (fields.indexOf('repeating') > 0) { chain = chain.repeating(); }
								if (fields.indexOf('clamped') > 0) { chain = chain.clamped(); }
								g.web.assets[tex_name] = chain.create(img);
							};
						} break;

						case 'audio':
						{
							g.web.assets[path] = new Audio(res.url);
							console.log('Finished: ' + path);
						} break;
					}

					// specific mime types
					switch (type)
					{
						case 'application/json':
						case 'application/json; charset=UTF-8':
						{
							g.web.assets[path] = '';
							return res.json().then(function (json) {
								g.web.assets[path] = json;

								if (path.indexOf('meshes') > -1)
								{
									const mesh_name = path.replace('meshes', 'mesh').replace('.json', '');
									g.web.assets[mesh_name] = g.web.gfx.mesh.create(g.web.assets[path]);
								}

								console.log('Finished OK: ' + path);
							});
						} break;

						case 'text/plain':
						case 'application/octet-stream':
						{
							g.web.assets[path] = '';
							return res.body.getReader().read().then(function(res)
							{
								console.log('Loading: ' + path + ' bytes remaining: ' + bytes_to_read);
								g.web.assets[path] += (new TextDecoder()).decode(res.value);
							});
						} break;
					}
				});
			}

			var promises = [];
			// for (var i = 0; i < asset_arr.length; i++)
			// {
			// 	promises.push(load_resource(asset_arr[i]));
			// }
			function load(idx)
			{
				if (idx >= asset_arr.length) { return this; }
				return load_resource(asset_arr[idx]).then(function(){
					return load(idx + 1);
				})
			}

			// Promise.all(promises).then(function(values)
			// {
			//     on_finish();
			// });
			load(0).then(function(){ on_finish(); })
		},
	},

	pointer:
	{
		_last : [ 0, 0 ],

		on_move: function(on_move_func)
		{
			g.web._canvas.addEventListener("touchmove", function(e)
			{
				const t = e.touches[0];
				e.preventDefault();

				if (g.web.pointer._last)
				{
					t.movementX = t.clientX - g.web.pointer._last[0];
					t.movementY = t.clientY - g.web.pointer._last[1];
				}

				on_move_func(t);
				g.web.pointer._last = [ t.clientX, t.clientY ];
			}, false);

			g.web._canvas.addEventListener("mousemove", function(e)
			{
				e.preventDefault();
				g.web.pointer._last = [ e.clientX, e.clientY ];
				on_move_func(e);
			}, false);

			return this;
		},

		on_scroll: function(on_scoll_func)
		{
			g.web._canvas.addEventListener("scroll", function(e)
			{
				on_scoll_func(e);
			});
		},

		on_pointer_lock_change: function(on_pointer_lock_func)
		{
			if ("onpointerlockchange" in document)
			{
				document.addEventListener('pointerlockchange', function(e)
				{
					on_pointer_lock_func(e);
				}, false);
			}
			else if ("onmozpointerlockchange" in document)
			{
				document.addEventListener('mozpointerlockchange', function(e)
				{
					on_pointer_lock_func(e);
				}, false);
			}
		},

		cast_ray: function(view)
		{
			const s = [ g.web.gfx.width(), g.web.gfx.height() ];
			const h = s.mul(0.5);
			const p = g.web.pointer._last.sub(h).div(h);
			const d = [ p[0], p[1], 1, 1 ];

			const dp = view.mat_mul(d);

			// console.log(dp);
		},

		on_press: function(on_press_func)
		{
			g.web._canvas.ontouchstart = function(e)
			{
				const t = e.touches[0];
				g.web.pointer._last = [ t.clientX, t.clientY ];
				on_press_func(e);
			};

			g.web._canvas.onmousedown = function(e)
			{
				const t = e;
				g.web.pointer._last = [ t.clientX, t.clientY ];
				on_press_func(e);
			};
		},

		on_release: function(on_release_func)
		{
			g.web._canvas.ontouchend = g.web._canvas.ontouchcancel = g.web._canvas.onmouseup = function()
			{
				on_release_func();
			};
		}
	},

	key:
	{
		_initalized: false,
		_initalize: function()
		{
			if (g.web.key._initalized) { return; }

			document.onkeydown = function(key)
			{
				g.web.key._map[key.key.toLowerCase()] = true;

				for (var i = g.web.key._key_down_handlers.length; i--;)
				{
					g.web.key._key_down_handlers[i](key.key.toLowerCase());
				}
			};

			document.onkeyup = function(key)
			{
				g.web.key._map[key.key.toLowerCase()] = false;

				for (var i = g.web.key._key_up_handlers.length; i--;)
				{
					g.web.key._key_up_handlers[i](key.key.toLowerCase());
				}
			};

			g.web.key._initalized = true;
		},
		_map: {},
		_key_down_handlers: [],
		_key_up_handlers: [],
		is_pressed: function(key)
		{
			g.web.key._initalize();

			return g.web.key._map[key] || false;
		},
		is_down: function(cb) { g.web.key._initalize(); g.web.key._key_down_handlers.push(cb); },
		is_up: function(cb) { g.web.key._initalize(); g.web.key._key_up_handlers.push(cb); }
	},

	on_message: function(f) { g.web._on_message = f; return this; },

	on: function(event)
	{
		return { 'do': function(cb) { g.web._on_event[event] = cb; }}
	},

	canvas: function(dom_element, opts)
	{
		opts = opts || {};
		g.web._canvas = dom_element;

		if (opts.fill)
		{
			document.body.onresize = function(e) {
				g.web._canvas.width = document.body.clientWidth;
				g.web._canvas.height = document.body.clientHeight;
				gl.viewport(0, 0, document.body.clientWidth, document.body.clientHeight);
			};
		}
		else if (!opts.fixed_size)
		{
			document.body.onresize = function(e) {
				g.web._canvas.width = g.web._canvas.clientWidth;
				g.web._canvas.height = g.web._canvas.clientHeight;
				gl.viewport(0, 0, g.web._canvas.clientWidth, g.web._canvas.clientHeight);
			};
		}

		g.web._canvas.requestPointerLock = g.web._canvas.requestPointerLock ||
										   g.web._canvas.mozRequestPointerLock ||
										   function(){};

		document.exitPointerLock = document.exitPointerLock ||
								   document.mozExitPointerLock ||
								   function(){};

		g.web._canvas.requestPointerLock();

		return this;
	},

	draw: function(f) { g.web._draw = f; return this; }

};

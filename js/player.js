// ==========================================
// Player
//
// This class contains the code that manages the local player.
// ==========================================

// Mouse event enumeration
MOUSE = {};
MOUSE.DOWN = 1;
MOUSE.UP = 2;
MOUSE.MOVE = 3;

// Constructor()
//
// Creates a new local player manager.

function Player()
{	
}

// setWorld( world )
//
// Assign the local player to a world.

Player.prototype.setWorld = function( world )
{
	this.world = world;
	this.world.localPlayer = this;
	this.pos = world.spawn;
	this.velocity = new Vector( 0, 0, 0 );
	this.angles = [ 0, Math.PI, 0 ];
	this.falling = false;
	this.keys = {};
	this.buildMaterial = BLOCK.DIRT;
	this.eventHandlers = {};
	this.spectatorMode = false; // Modo espectador: volar libremente sin colisiones
	this.cameraMode = 1; // Modo de cámara: 1 = primera persona, 2 = segunda persona, 3 = tercera persona
	
	// Inventory system
	this.hotbar = new Array(9).fill(null); // 9 slots del hotbar
	this.inventory = new Array(27).fill(null); // 27 slots del inventario (3 filas x 9 columnas)
	this.selectedHotbarSlot = 0; // Slot seleccionado (0-8)
	this.inventoryOpen = false;
}

// setClient( client )
//
// Assign the local player to a socket client.

Player.prototype.setClient = function( client )
{
	this.client = client;
}

// setPhysics( physics )
//
// Assign the physics simulator to this player.

Player.prototype.setPhysics = function( physics )
{
	this.physics = physics;
}

// setInputCanvas( id )
//
// Set the canvas the renderer uses for some input operations.

Player.prototype.setInputCanvas = function( id )
{
	var canvas = this.canvas = document.getElementById( id );

	var t = this;
	document.onkeydown = function( e ) { if ( e.target.tagName != "INPUT" ) { t.onKeyEvent( e.keyCode, true ); return false; } }
	document.onkeyup = function( e ) { if ( e.target.tagName != "INPUT" ) { t.onKeyEvent( e.keyCode, false ); return false; } }
	canvas.onmousedown = function( e ) { t.onMouseEvent( e.clientX, e.clientY, MOUSE.DOWN, e.which == 3 ); return false; }
	canvas.onmouseup = function( e ) { t.onMouseEvent( e.clientX, e.clientY, MOUSE.UP, e.which == 3 ); return false; }
	canvas.onmousemove = function( e ) { t.onMouseEvent( e.clientX, e.clientY, MOUSE.MOVE, e.which == 3 ); return false; }

	// Pointer lock for mouse capture
	canvas.onclick = function() {
		canvas.requestPointerLock();
	}

	document.addEventListener('pointerlockchange', function() {
		if (document.pointerLockElement === canvas) {
			document.getElementById('crosshair').style.display = 'block';
			document.getElementById('cursor').style.display = 'none';
			t.pointerLocked = true;
			t.dragging = true;
			t.targetPitch = t.angles[0];
			t.targetYaw = t.angles[1];
			// Disable old mouse events
			canvas.onmousedown = null;
			canvas.onmouseup = null;
			canvas.onmousemove = null;
		} else {
			document.getElementById('crosshair').style.display = 'none';
			document.getElementById('cursor').style.display = 'block';
			t.pointerLocked = false;
			t.dragging = false;
			t.angles[0] = t.targetPitch;
			t.angles[1] = t.targetYaw;
			// Re-enable old mouse events
			canvas.onmousedown = function( e ) { t.onMouseEvent( e.clientX, e.clientY, MOUSE.DOWN, e.which == 3 ); return false; }
			canvas.onmouseup = function( e ) { t.onMouseEvent( e.clientX, e.clientY, MOUSE.UP, e.which == 3 ); return false; }
			canvas.onmousemove = function( e ) { t.onMouseEvent( e.clientX, e.clientY, MOUSE.MOVE, e.which == 3 ); return false; }
			// Pause the game when mouse is uncaptured, but NOT if inventory is open
			if (typeof pauseGame === 'function' && !t.inventoryOpen) {
				pauseGame();
			}
		}
	});

	document.addEventListener('mousemove', function(e) {
		if (t.pointerLocked && !t.inventoryOpen) {
			t.onMouseMove(e.movementX, e.movementY);
		}
	});

	document.addEventListener('mousedown', function(e) {
		if (t.pointerLocked && !t.inventoryOpen) {
			if (e.button === 0) { // Left click
				t.doBlockActionAtCenter(true); // Destroy
			} else if (e.button === 2) { // Right click
				t.doBlockActionAtCenter(false); // Place
			}
			e.preventDefault();
		}
	});
}

// initInventory()
//
// Initializes the hotbar and inventory system.

Player.prototype.initInventory = function()
{
	// Initialize hotbar slots
	var hotbarEl = document.getElementById("hotbar");
	var pl = this;
	
	// Set up hotbar slot click handlers
	for (var i = 0; i < 9; i++) {
		var slot = hotbarEl.children[i];
		slot.onclick = function() {
			var slotIndex = parseInt(this.getAttribute("data-slot"));
			pl.selectHotbarSlot(slotIndex);
		};
	}
	
	// Initialize with DIRT in first slot
	this.setHotbarSlot(0, BLOCK.DIRT);
	this.selectHotbarSlot(0);
	
	// Populate inventory with all spawnable blocks
	this.updateInventoryDisplay();
	
	// Initialize 3D player model in inventory
	this.initInventoryPlayerModel();
}

// initInventoryPlayerModel()
//
// Initializes a mini 3D WebGL renderer for the player model in the inventory.

Player.prototype.initInventoryPlayerModel = function()
{
	var canvas = document.getElementById("inventoryPlayerCanvas");
	if (!canvas) return;
	
	var pl = this;
	
	// Set canvas size (must match CSS size)
	var rect = canvas.getBoundingClientRect();
	canvas.width = 64;
	canvas.height = 64;
	canvas.style.width = "64px";
	canvas.style.height = "64px";
	
	// Get WebGL context with alpha channel for transparency
	var gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false }) || 
	         canvas.getContext("experimental-webgl", { alpha: true, premultipliedAlpha: false });
	if (!gl) {
		console.warn("WebGL not supported for inventory player model");
		return;
	}
	
	// Store gl context
	this.inventoryPlayerGL = gl;
	this.inventoryPlayerCanvas = canvas;
	
	// Initialize WebGL
	this.initInventoryPlayerWebGL(gl);
	
	// Mouse tracking for head rotation
	var modelYaw = 0;
	var modelPitch = 0;
	
	// Store rotation state
	this.inventoryModelYaw = modelYaw;
	this.inventoryModelPitch = modelPitch;
	
	// Mouse move listener for player model rotation (follows mouse without dragging)
	canvas.addEventListener("mousemove", function(e) {
		if (!pl.inventoryOpen) return;
		
		var rect = canvas.getBoundingClientRect();
		var mouseX = e.clientX - rect.left;
		var mouseY = e.clientY - rect.top;
		
		// Normalize mouse coordinates to -1 to 1 range
		var normalizedX = (mouseX / rect.width) * 2 - 1;
		var normalizedY = (mouseY / rect.height) * 2 - 1;
		
		// Adjust sensitivity and limits
		modelYaw = normalizedX * Math.PI * 0.2; // Max 36 degrees left/right
		modelPitch = -normalizedY * Math.PI * 0.2; // Max 36 degrees up/down
		
		pl.inventoryModelYaw = modelYaw;
		pl.inventoryModelPitch = modelPitch;
		pl.renderInventoryPlayerModel(modelYaw, modelPitch);
	});
	
	// Create render loop for continuous rendering when inventory is open
	this.inventoryPlayerRenderer = {
		renderLoopId: null,
		startRenderLoop: function() {
			if (this.renderLoopId) return;
			var self = this;
			var frameCount = 0;
			function loop() {
				if (pl.inventoryOpen && pl.inventoryModelYaw !== undefined && pl.inventoryModelPitch !== undefined) {
					pl.renderInventoryPlayerModel(pl.inventoryModelYaw, pl.inventoryModelPitch);
					frameCount++;
					// Log cada 60 frames para verificar que se está renderizando
					if (frameCount % 60 === 0) {
						console.log('Inventory player model render loop activo - frame:', frameCount);
					}
				}
				self.renderLoopId = requestAnimationFrame(loop);
			}
			loop();
		},
		stopRenderLoop: function() {
			if (this.renderLoopId) {
				cancelAnimationFrame(this.renderLoopId);
				this.renderLoopId = null;
			}
		}
	};
	
	// Initial render
	this.renderInventoryPlayerModel(0, 0);
}

// initInventoryPlayerWebGL( gl )
//
// Initializes WebGL context for inventory player model rendering.

Player.prototype.initInventoryPlayerWebGL = function(gl)
{
	// Vertex shader (same as main renderer)
	var vertexShaderSource = `
		attribute vec3 aPosition;
		attribute vec2 aTexCoord;
		attribute vec4 aColor;
		uniform mat4 uModelMat;
		uniform mat4 uViewMat;
		uniform mat4 uProjMat;
		varying vec2 vTexCoord;
		varying vec4 vColor;
		void main() {
			gl_Position = uProjMat * uViewMat * uModelMat * vec4(aPosition, 1.0);
			vTexCoord = aTexCoord;
			vColor = aColor;
		}
	`;
	
	// Fragment shader (same as main renderer)
	var fragmentShaderSource = `
		precision mediump float;
		uniform sampler2D uSampler;
		varying vec2 vTexCoord;
		varying vec4 vColor;
		void main() {
			gl_FragColor = texture2D(uSampler, vTexCoord) * vColor;
		}
	`;
	
	// Compile shaders
	var vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	var fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
	
	// Create program
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error("Error linking program:", gl.getProgramInfoLog(program));
		return;
	}
	
	gl.useProgram(program);
	
	// Get attribute and uniform locations
	var aPosition = gl.getAttribLocation(program, "aPosition");
	var aTexCoord = gl.getAttribLocation(program, "aTexCoord");
	var aColor = gl.getAttribLocation(program, "aColor");
	var uModelMat = gl.getUniformLocation(program, "uModelMat");
	var uViewMat = gl.getUniformLocation(program, "uViewMat");
	var uProjMat = gl.getUniformLocation(program, "uProjMat");
	var uSampler = gl.getUniformLocation(program, "uSampler");
	
	// Store program and locations
	this.inventoryPlayerProgram = program;
	this.inventoryPlayerAttribs = {
		position: aPosition,
		texCoord: aTexCoord,
		color: aColor
	};
	this.inventoryPlayerUniforms = {
		modelMat: uModelMat,
		viewMat: uViewMat,
		projMat: uProjMat,
		sampler: uSampler
	};
	
	// Enable attributes
	gl.enableVertexAttribArray(aPosition);
	gl.enableVertexAttribArray(aTexCoord);
	gl.enableVertexAttribArray(aColor);
	
	// WebGL state
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.clearColor(0, 0, 0, 0); // Transparent background
	
	// Create a temporary white texture while player.png loads
	var whiteTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, whiteTexture);
	var whitePixel = new Uint8Array([255, 255, 255, 255]);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, whitePixel);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	this.inventoryPlayerTexture = whiteTexture; // Usar textura blanca temporal
	
	// Load player texture
	var playerTexture = gl.createTexture();
	var img = new Image();
	var self = this;
	img.onload = function() {
		gl.bindTexture(gl.TEXTURE_2D, playerTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		self.inventoryPlayerTexture = playerTexture; // Reemplazar con la textura real
		// Render after texture loads
		if (self.inventoryOpen) {
			self.renderInventoryPlayerModel(self.inventoryModelYaw || 0, self.inventoryModelPitch || 0);
		}
	};
	img.onerror = function() {
		console.error('Error cargando player.png para el modelo del inventario');
	};
	img.src = "media/player.png";
	
	// Load player models (head and body)
	this.loadInventoryPlayerModels(gl);
}

// compileShader( gl, type, source )
//
// Compiles a WebGL shader.

Player.prototype.compileShader = function(gl, type, source)
{
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error("Error compiling shader:", gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	
	return shader;
}

// loadInventoryPlayerModels( gl )
//
// Loads player head and body models for inventory rendering.
// Reuses vertex data from the main renderer to save memory.

Player.prototype.loadInventoryPlayerModels = function(gl)
{
	// Reuse vertex data from the main renderer (shared functions)
	var headVertices = getPlayerHeadVertices();
	var bodyVertices = getPlayerBodyVertices();
	
	// Create buffers in this WebGL context
	var headBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, headBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(headVertices), gl.STATIC_DRAW);
	headBuffer.vertices = headVertices.length / 9;
	this.inventoryPlayerHead = headBuffer;
	
	var bodyBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, bodyBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bodyVertices), gl.STATIC_DRAW);
	bodyBuffer.vertices = bodyVertices.length / 9;
	this.inventoryPlayerBody = bodyBuffer;
}

// renderInventoryPlayerModel( yaw, pitch )
//
// Renders the player model in the inventory with head following mouse.

Player.prototype.renderInventoryPlayerModel = function(yaw, pitch)
{
	var gl = this.inventoryPlayerGL;
	var canvas = this.inventoryPlayerCanvas;
	if (!gl || !canvas || !this.inventoryPlayerHead || !this.inventoryPlayerBody) {
		console.warn('Inventory player model: faltan recursos', {
			gl: !!gl,
			canvas: !!canvas,
			head: !!this.inventoryPlayerHead,
			body: !!this.inventoryPlayerBody,
			texture: !!this.inventoryPlayerTexture
		});
		return;
	}
	
	// Set viewport
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	// Check for WebGL errors
	var error = gl.getError();
	if (error !== gl.NO_ERROR) {
		console.warn('WebGL error before render:', error);
	}
	
	// Use the shader program
	gl.useProgram(this.inventoryPlayerProgram);
	
	// Setup matrices
	var modelMatrix = mat4.create();
	var viewMatrix = mat4.create();
	var projMatrix = mat4.create();
	
	// Projection: perspective looking at player from front
	mat4.perspective(projMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 10.0);
	
	// View: cámara en tercera persona estática, mirando al jugador desde el frente
	// IMPORTANTE: El shader espera [x, y, z] donde z es altura
	// Pero cuando se renderiza el modelo del jugador en el renderer principal, se hace:
	// mat4.translate(modelMatrix, [player.pos.x, player.pos.z, player.pos.y + 1.7])
	// Esto significa que se pasa [x, z, y] al shader, donde y es altura
	// Entonces, el shader interpreta esto como [x, y, z] donde z=y (altura)
	// Por lo tanto, en el sistema del shader: X y Y = horizontal, Z = vertical (altura)
	// El modelo del cuerpo va de Z=0.73 a Z=1.45 en el sistema original
	// Después del scale 1.5x: Z=1.095 a Z=2.175
	// El centro del cuerpo está en Z=(1.095 + 2.175) / 2 = 1.635
	// La cabeza está en Z=1.7 * 1.5 = 2.55 (centro de la cabeza)
	// Cámara estática en tercera persona: delante del jugador, mirando hacia él
	var cameraDistance = 4.0; // Distancia fija desde el jugador (eje Y positivo en el sistema del shader)
	var modelCenterHeight = 1.635; // Centro del modelo después del scale: (1.095 + 2.175) / 2 = 1.635
	// Posición de la cámara: delante del jugador (eje Y positivo en el sistema del shader)
	// Mirando hacia el jugador en el origen, centrado verticalmente
	// lookAt espera: [eyeX, eyeY, eyeZ], [centerX, centerY, centerZ], [upX, upY, upZ]
	// En el sistema del shader: X y Y = horizontal, Z = vertical (altura)
	mat4.lookAt(viewMatrix, [0, cameraDistance, modelCenterHeight], [0, 0, modelCenterHeight], [0, 0, 1]);
	
	// Bind texture (siempre debería existir, al menos la textura blanca temporal)
	if (!this.inventoryPlayerTexture) {
		// Si por alguna razón no hay textura, crear una blanca temporal
		var whiteTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, whiteTexture);
		var whitePixel = new Uint8Array([255, 255, 255, 255]);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, whitePixel);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		this.inventoryPlayerTexture = whiteTexture;
	}
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.inventoryPlayerTexture);
	gl.uniform1i(this.inventoryPlayerUniforms.sampler, 0);
	
	// Set uniforms
	gl.uniformMatrix4fv(this.inventoryPlayerUniforms.viewMat, false, viewMatrix);
	gl.uniformMatrix4fv(this.inventoryPlayerUniforms.projMat, false, projMatrix);
	
	// Draw body
	// IMPORTANTE: El modelo está definido con coordenadas [x, y, z] donde z es altura
	// En el renderer principal, cuando se renderiza el modelo del jugador, se hace:
	// mat4.translate(modelMatrix, [player.pos.x, player.pos.z, player.pos.y + 1.7])
	// Esto significa que se pasa [x, z, y] al shader, donde y es altura
	// El shader interpreta esto como [x, y, z] donde z=y (altura)
	// Por lo tanto, en el sistema del shader: X y Y = horizontal, Z = vertical (altura)
	// El modelo del cuerpo va de Z=0.73 a Z=1.45 en el sistema original
	// Después del scale 1.5x: Z=1.095 a Z=2.175
	// El centro del cuerpo está en Z=(1.095 + 2.175) / 2 = 1.635
	mat4.identity(modelMatrix);
	// Centrar el modelo en el origen verticalmente
	// El cuerpo va de Z=1.095 a Z=2.175 después del scale, centro en Z=1.635
	// Para centrarlo, mover hacia abajo por 1.635
	mat4.translate(modelMatrix, [0, 0, -1.635]); // [x, y, z] donde z es altura - mover hacia abajo para centrar
	mat4.scale(modelMatrix, [1.5, 1.5, 1.5]); // Escalar 1.5x para que sea más visible
	// Rotar 180 grados para que mire hacia la cámara (como en el renderer principal)
	mat4.rotateZ(modelMatrix, Math.PI);
	gl.uniformMatrix4fv(this.inventoryPlayerUniforms.modelMat, false, modelMatrix);
	this.drawInventoryBuffer(this.inventoryPlayerBody);
	
	// Draw head (follows mouse)
	mat4.identity(modelMatrix);
	// El modelo de la cabeza va de Z=-0.25 a Z=0.25 en el sistema original
	// Después del scale 1.5x: Z=-0.375 a Z=0.375, centro en Z=0
	// El cuerpo termina en Z=2.175, así que la cabeza debe estar en Z=2.175 + 0.375 = 2.55
	// Pero el centro de la cabeza está en Z=0, así que necesito posicionarla en Z=2.55
	// Para centrarlo verticalmente, mover hacia abajo por 1.635 (igual que el cuerpo)
	mat4.translate(modelMatrix, [0, 0, 2.55 - 1.635]); // [x, y, z] donde z es altura - cabeza a 2.55, centrado
	mat4.scale(modelMatrix, [1.5, 1.5, 1.5]); // Escalar 1.5x para que sea más visible
	// Rotar 180 grados para que mire hacia la cámara, luego aplicar rotación del mouse
	mat4.rotateZ(modelMatrix, Math.PI - yaw); // Rotate around Z (horizontal rotation) - invertir yaw
	mat4.rotateX(modelMatrix, -pitch); // Rotate around X (vertical rotation)
	gl.uniformMatrix4fv(this.inventoryPlayerUniforms.modelMat, false, modelMatrix);
	this.drawInventoryBuffer(this.inventoryPlayerHead);
	
	// Check for WebGL errors after rendering
	var error = gl.getError();
	if (error !== gl.NO_ERROR) {
		console.warn('WebGL error after render:', error);
	}
}

// drawInventoryBuffer( buffer )
//
// Draws a vertex buffer in the inventory player model renderer.

Player.prototype.drawInventoryBuffer = function(buffer)
{
	var gl = this.inventoryPlayerGL;
	if (!gl || !buffer) return;
	
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	
	var stride = 9 * 4; // 9 floats per vertex (x, y, z, u, v, r, g, b, a)
	
	gl.vertexAttribPointer(this.inventoryPlayerAttribs.position, 3, gl.FLOAT, false, stride, 0);
	gl.vertexAttribPointer(this.inventoryPlayerAttribs.texCoord, 2, gl.FLOAT, false, stride, 3 * 4);
	gl.vertexAttribPointer(this.inventoryPlayerAttribs.color, 4, gl.FLOAT, false, stride, 5 * 4);
	
	gl.drawArrays(gl.TRIANGLES, 0, buffer.vertices);
}


// selectHotbarSlot( index )
//
// Selects a hotbar slot (0-8).

Player.prototype.selectHotbarSlot = function(index)
{
	if (index < 0 || index >= 9) return;
	
	this.selectedHotbarSlot = index;
	
	// Update visual selection
	var hotbarEl = document.getElementById("hotbar");
	for (var i = 0; i < 9; i++) {
		var slot = hotbarEl.children[i];
		if (i === index) {
			slot.classList.add("selected");
		} else {
			slot.classList.remove("selected");
		}
	}
	
	// Update buildMaterial
	var block = this.hotbar[index];
	if (block) {
		this.buildMaterial = block;
	} else {
		this.buildMaterial = BLOCK.AIR;
	}
}

// setHotbarSlot( index, block )
//
// Sets a block in a hotbar slot.

Player.prototype.setHotbarSlot = function(index, block)
{
	if (index < 0 || index >= 9) return;
	
	this.hotbar[index] = block;
	this.updateHotbarDisplay();
}

// updateHotbarDisplay()
//
// Updates the visual display of the hotbar.

Player.prototype.updateHotbarDisplay = function()
{
	var hotbarEl = document.getElementById("hotbar");
	
	for (var i = 0; i < 9; i++) {
		var slot = hotbarEl.children[i];
		var block = this.hotbar[i];
		
		// Clear existing thumbnail
		var existingThumb = slot.querySelector(".block-thumbnail");
		if (existingThumb) {
			existingThumb.remove();
		}
		
		// Add thumbnail if block exists
		if (block && block !== BLOCK.AIR) {
			var thumb = this.renderBlockThumbnail(block, 32);
			thumb.className = "block-thumbnail";
			slot.appendChild(thumb);
		}
	}
	
	// Update selection
	this.selectHotbarSlot(this.selectedHotbarSlot);
}

// updateInventoryDisplay()
//
// Populates the inventory grid with all spawnable blocks.

Player.prototype.updateInventoryDisplay = function()
{
	var inventoryGrid = document.querySelector(".inventory-grid");
	if (!inventoryGrid) return;
	
	var pl = this;
	
	// Clear existing slots
	inventoryGrid.innerHTML = "";
	
	// Get all spawnable blocks
	var spawnableBlocks = [];
	for (var mat in BLOCK) {
		if (typeof(BLOCK[mat]) == "object" && BLOCK[mat].spawnable == true) {
			spawnableBlocks.push(BLOCK[mat]);
		}
	}
	
	// Create slots for each block
	for (var i = 0; i < spawnableBlocks.length && i < 27; i++) {
		var slot = document.createElement("div");
		slot.className = "inventory-slot";
		slot.blockData = spawnableBlocks[i];
		
		// Render thumbnail
		var thumb = this.renderBlockThumbnail(spawnableBlocks[i], 16);
		thumb.className = "block-thumbnail";
		slot.appendChild(thumb);
		
		// Set up click handler
		slot.onclick = function() {
			var block = this.blockData;
			if (block) {
				// Add to first empty hotbar slot
				var emptySlot = pl.hotbar.indexOf(null);
				if (emptySlot !== -1) {
					pl.setHotbarSlot(emptySlot, block);
					pl.selectHotbarSlot(emptySlot);
				} else {
					// Replace current selected slot
					pl.setHotbarSlot(pl.selectedHotbarSlot, block);
				}
			}
		};
		
		inventoryGrid.appendChild(slot);
	}
	
	// Fill remaining slots with empty slots
	for (var i = spawnableBlocks.length; i < 27; i++) {
		var slot = document.createElement("div");
		slot.className = "inventory-slot";
		inventoryGrid.appendChild(slot);
	}
	
	// Update inventory hotbar to match main hotbar
	this.updateInventoryHotbarDisplay();
}

// updateInventoryHotbarDisplay()
//
// Updates the inventory hotbar to match the main hotbar.

Player.prototype.updateInventoryHotbarDisplay = function()
{
	var inventoryHotbar = document.querySelector(".inventory-hotbar");
	if (!inventoryHotbar) return;
	
	var pl = this;
	var slots = inventoryHotbar.querySelectorAll(".inventory-slot");
	for (var i = 0; i < 9; i++) {
		var slot = slots[i];
		var block = this.hotbar[i];
		
		// Clear existing thumbnail
		var existingThumb = slot.querySelector(".block-thumbnail");
		if (existingThumb) {
			existingThumb.remove();
		}
		
		// Add thumbnail if block exists
		if (block && block !== BLOCK.AIR) {
			var thumb = this.renderBlockThumbnail(block, 16);
			thumb.className = "block-thumbnail";
			slot.appendChild(thumb);
		}
		
		slot.blockData = block;
		
		// Set up click handler
		slot.onclick = function() {
			var slotIndex = parseInt(this.getAttribute("data-inv-slot"));
			var block = this.blockData;
			if (block) {
				pl.setHotbarSlot(slotIndex, block);
				pl.selectHotbarSlot(slotIndex);
			}
		};
	}
}

// renderBlockThumbnail( block, size )
//
// Renders a block thumbnail using canvas and terrain.png.

Player.prototype.renderBlockThumbnail = function(block, size)
{
	var canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	var ctx = canvas.getContext("2d");
	
	// Load terrain.png
	var img = new Image();
	img.onload = function() {
		// Get block texture coordinates (use top face for thumbnail)
		var texCoords = block.texture(null, null, true, 0, 0, 0, DIRECTION.UP);
		
		// Convert normalized coordinates to pixel coordinates
		var texWidth = img.width;
		var texHeight = img.height;
		var u_min = texCoords[0] * texWidth;
		var v_min = texCoords[1] * texHeight;
		var u_max = texCoords[2] * texWidth;
		var v_max = texCoords[3] * texHeight;
		var texSize = u_max - u_min;
		
		// Draw texture to canvas
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(
			img,
			u_min, v_min, texSize, texSize,
			0, 0, size, size
		);
	};
	img.src = "media/terrain.png";
	
	return canvas;
}

// toggleInventory()
//
// Opens or closes the inventory. Game does not pause when inventory is open.
// Inventory releases pointer lock to allow mouse interaction, but game continues running.

Player.prototype.toggleInventory = function()
{
	var inventory = document.getElementById("inventory");
	if (!inventory) return;
	
	this.inventoryOpen = !this.inventoryOpen;
	
	if (this.inventoryOpen) {
		inventory.style.display = "flex";
		// Add class to body to hide health/armor icons when inventory is open
		document.body.classList.add("inventory-open");
		// Clear all keys to prevent movement while inventory is open
		// This prevents keys from being "stuck" when inventory is opened
		this.keys = {};
		// Update inventory display (main grid and hotbar)
		this.updateInventoryDisplay();
		// Start rendering the miniature player model
		if (this.inventoryPlayerRenderer) {
			this.inventoryPlayerRenderer.startRenderLoop();
		}
		// Render immediately when opening inventory
		if (this.inventoryModelYaw !== undefined && this.inventoryModelPitch !== undefined) {
			this.renderInventoryPlayerModel(this.inventoryModelYaw, this.inventoryModelPitch);
		} else {
			this.renderInventoryPlayerModel(0, 0);
		}
		// Release pointer lock to allow mouse interaction with inventory
		// The pointerlockchange listener will check inventoryOpen and won't pause the game
		if (this.pointerLocked) {
			document.exitPointerLock();
		}
		// Disable pointer events on canvas so clicks go to inventory
		if (this.canvas) {
			this.canvas.style.pointerEvents = "none";
		}
	} else {
		inventory.style.display = "none";
		// Remove class from body to show health/armor icons when inventory is closed
		document.body.classList.remove("inventory-open");
		// Stop rendering the miniature player model
		if (this.inventoryPlayerRenderer) {
			this.inventoryPlayerRenderer.stopRenderLoop();
		}
		// Re-enable pointer events on canvas
		if (this.canvas) {
			this.canvas.style.pointerEvents = "auto";
		}
		// Request pointer lock when closing inventory (to resume game control)
		if (this.canvas && !this.pointerLocked) {
			this.canvas.requestPointerLock();
		}
	}
}

// on( event, callback )
//
// Hook a player event.

Player.prototype.on = function( event, callback )
{
	this.eventHandlers[event] = callback;
}

// onKeyEvent( keyCode, down )
//
// Hook for keyboard input.

Player.prototype.onKeyEvent = function( keyCode, down )
{
	var key = String.fromCharCode( keyCode ).toLowerCase();
	
	// If inventory is open, only process E and Esc keys
	if (this.inventoryOpen) {
		// Inventory toggle (E key)
		if ( !down && (keyCode == 69 || key == "e") ) {
			this.toggleInventory();
		}
		// ESC key to close inventory
		if ( !down && keyCode == 27 ) {
			this.toggleInventory();
		}
		// Don't process any other keys when inventory is open
		return;
	}
	
	// Normal key processing when inventory is closed
	this.keys[key] = down;
	this.keys[keyCode] = down;

	if ( !down && key == "t" && this.eventHandlers["openChat"] ) this.eventHandlers.openChat();
	
	// Inventory toggle (E key)
	if ( !down && (keyCode == 69 || key == "e") ) {
		this.toggleInventory();
	}
	
	// Camera perspective toggle (F5 key - keyCode 116)
	// Desactivado en modo espectador (solo primera persona)
	if ( !down && keyCode == 116 ) {
		if (this.spectatorMode) {
			// En modo espectador, solo permitir primera persona
			this.cameraMode = 1;
			console.log('Modo de cámara: Primera persona (modo espectador activo)');
		} else {
			this.cameraMode = (this.cameraMode % 3) + 1; // Cicla entre 1, 2, 3
			console.log('Modo de cámara: ' + (this.cameraMode === 1 ? 'Primera persona' : this.cameraMode === 2 ? 'Segunda persona' : 'Tercera persona'));
		}
	}
	
	// Hotbar selection (1-9 keys)
	if ( !down ) {
		if ( keyCode >= 49 && keyCode <= 57 ) { // Keys 1-9
			var slotIndex = keyCode - 49; // 0-8
			this.selectHotbarSlot(slotIndex);
		}
	}
	
	if ( !down && keyCode == 27 ) { // ESC key
		if (this.pointerLocked) {
			document.exitPointerLock();
		} else if (typeof pauseGame === 'function') {
			pauseGame();
		}
	}
}

// onMouseEvent( x, y, type, rmb )
//
// Hook for mouse input.

Player.prototype.onMouseEvent = function( x, y, type, rmb )
{
	if ( type == MOUSE.DOWN ) {
		this.dragStart = { x: x, y: y };
		this.mouseDown = true;
		this.yawStart = this.targetYaw = this.angles[1];
		this.pitchStart = this.targetPitch = this.angles[0];
	} else if ( type == MOUSE.UP ) {
		if ( Math.abs( this.dragStart.x - x ) + Math.abs( this.dragStart.y - y ) < 4 )
			this.doBlockAction( x, y, !rmb );

		this.dragging = false;
		this.mouseDown = false;
		this.canvas.style.cursor = "default";
	} else if ( type == MOUSE.MOVE && this.mouseDown ) {
		this.dragging = true;
		this.targetPitch = this.pitchStart - ( y - this.dragStart.y ) / 200;
		this.targetYaw = this.yawStart + ( x - this.dragStart.x ) / 200;

		this.canvas.style.cursor = "move";
	}
}

// onMouseMove( deltaX, deltaY )
//
// Hook for mouse movement in pointer lock mode.

Player.prototype.onMouseMove = function( deltaX, deltaY )
{
	this.targetPitch = this.angles[0] - deltaY / 200;
	this.targetYaw = this.angles[1] + deltaX / 200;
	this.dragging = true;
}

// raycast( start, direction, maxDistance )
//
// Lanza un rayo desde start en la dirección direction y devuelve el primer bloque sólido con el que choca.
// Usa el algoritmo DDA (Digital Differential Analyzer) para detectar bloques de forma eficiente.
// Ejes: X y Z = horizontal, Y = vertical (altura)
// direction debe ser un Vector normalizado
// maxDistance es la distancia máxima del rayo (por defecto 5 bloques)

Player.prototype.raycast = function( start, direction, maxDistance )
{
	maxDistance = maxDistance || 5.0;
	var world = this.world;
	
	// Normalizar dirección
	var dirLen = Math.sqrt( direction.x * direction.x + direction.y * direction.y + direction.z * direction.z );
	if ( dirLen < 0.0001 ) return false;
	
	var dx = direction.x / dirLen;
	var dy = direction.y / dirLen;
	var dz = direction.z / dirLen;
	
	// Posición actual del rayo
	var x = start.x;
	var y = start.y;
	var z = start.z;
	
	// Bloque actual
	var blockX = Math.floor( x );
	var blockY = Math.floor( y );
	var blockZ = Math.floor( z );
	
	// Calcular el paso y la distancia hasta el siguiente borde en cada eje
	var stepX = dx > 0 ? 1 : -1;
	var stepY = dy > 0 ? 1 : -1;
	var stepZ = dz > 0 ? 1 : -1;
	
	var tMaxX = dx != 0 ? ( ( blockX + ( dx > 0 ? 1 : 0 ) ) - x ) / dx : Infinity;
	var tMaxY = dy != 0 ? ( ( blockY + ( dy > 0 ? 1 : 0 ) ) - y ) / dy : Infinity;
	var tMaxZ = dz != 0 ? ( ( blockZ + ( dz > 0 ? 1 : 0 ) ) - z ) / dz : Infinity;
	
	var tDeltaX = dx != 0 ? stepX / dx : Infinity;
	var tDeltaY = dy != 0 ? stepY / dy : Infinity;
	var tDeltaZ = dz != 0 ? stepZ / dz : Infinity;
	
	var normalX = 0, normalY = 0, normalZ = 0;
	
	while ( true )
	{
		// Verificar límites del mundo
		if ( blockX < 0 || blockX >= world.sx || 
		     blockY < 0 || blockY >= world.sy || 
		     blockZ < 0 || blockZ >= world.sz )
		{
			break; // Fuera de límites
		}
		
		// Calcular la distancia actual
		var t = Math.min( tMaxX, Math.min( tMaxY, tMaxZ ) );
		if ( t > maxDistance ) break; // Excedimos la distancia máxima
		
		var block = world.getBlock( blockX, blockY, blockZ );
		
		// Si encontramos un bloque sólido (puede ser transparente o no, pero no AIR)
		// Los bloques transparentes como glass y leaves también deben ser detectables para destrucción
		if ( block != BLOCK.AIR && block )
		{
			return {
				x: blockX,
				y: blockY,
				z: blockZ,
				n: new Vector( normalX, normalY, normalZ )
			};
		}
		
		// Avanzar al siguiente bloque usando DDA
		if ( tMaxX < tMaxY && tMaxX < tMaxZ )
		{
			// Cruzamos un borde en X
			blockX += stepX;
			normalX = -stepX;
			normalY = 0;
			normalZ = 0;
			tMaxX += tDeltaX;
		}
		else if ( tMaxY < tMaxZ )
		{
			// Cruzamos un borde en Y
			blockY += stepY;
			normalX = 0;
			normalY = -stepY;
			normalZ = 0;
			tMaxY += tDeltaY;
		}
		else
		{
			// Cruzamos un borde en Z
			blockZ += stepZ;
			normalX = 0;
			normalY = 0;
			normalZ = -stepZ;
			tMaxZ += tDeltaZ;
		}
	}
	
	return false; // No se encontró ningún bloque
}

// doBlockAction( x, y )
//
// Called to perform an action based on the player's block selection and input.

Player.prototype.doBlockAction = function( x, y, destroy )
{
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// Usar raycasting en lugar de pickAt para mayor confiabilidad
	var eyePos = this.getEyePos();
	var pitch = this.angles[0]; // Ángulo vertical (hacia arriba/abajo)
	var yaw = this.angles[1];   // Ángulo horizontal (rotación alrededor del eje Y)
	
	// Calcular dirección del rayo
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// yaw: 0 = Norte (hacia -Z), PI/2 = Este (hacia +X), PI = Sur (hacia +Z), 3*PI/2 = Oeste (hacia -X)
	var cosPitch = Math.cos( pitch );
	var sinPitch = Math.sin( pitch );
	var cosYaw = Math.cos( yaw );
	var sinYaw = Math.sin( yaw );
	
	// Dirección del rayo: [x, y, z] donde y es altura
	var direction = new Vector(
		cosPitch * sinYaw,      // X: horizontal
		sinPitch,               // Y: altura (vertical)
		cosPitch * cosYaw       // Z: horizontal
	);
	
	// Lanzar el rayo (máximo 5 bloques de distancia)
	var block = this.raycast( eyePos, direction, 5.0 );

	if ( block != false )
	{
		var obj = this.client ? this.client : this.world;

		if ( destroy )
			obj.setBlock( block.x, block.y, block.z, BLOCK.AIR );
		else
		{
			// Calcular la posición donde se colocará el bloque
			// Ejes: X y Z = horizontal, Y = vertical (altura)
			// La normal apunta hacia la dirección donde se debe colocar el bloque
			var placeX = Math.floor( block.x + block.n.x );
			var placeY = Math.floor( block.y + block.n.y );
			var placeZ = Math.floor( block.z + block.n.z );
			
			// Verificar que las coordenadas estén dentro de los límites del mundo
			if ( placeX < 0 || placeX >= world.sx || 
			     placeY < 0 || placeY >= world.sy || 
			     placeZ < 0 || placeZ >= world.sz ) {
				return; // Fuera de los límites del mundo
			}
			
			// Verificar que el lugar donde se va a colocar esté vacío (AIR)
			if ( world.getBlock( placeX, placeY, placeZ ) != BLOCK.AIR ) {
				return; // Ya hay un bloque en esa posición
			}
			
			// Verificar si el bloque se colocaría dentro de la hitbox del jugador
			// Hitbox del jugador: tamaño 0.25 en X y Z (horizontal), altura 1.7 en Y
			var playerSize = 0.25;
			var playerHeight = 1.7;
			var playerMinX = this.pos.x - playerSize;
			var playerMaxX = this.pos.x + playerSize;
			var playerMinY = this.pos.y; // Y es altura
			var playerMaxY = this.pos.y + playerHeight;
			var playerMinZ = this.pos.z - playerSize; // Z es horizontal
			var playerMaxZ = this.pos.z + playerSize;
			
			// El bloque ocupa desde (placeX, placeY, placeZ) hasta (placeX+1, placeY+1, placeZ+1)
			// placeY es altura, placeX y placeZ son horizontales
			var blockMinX = placeX;
			var blockMaxX = placeX + 1;
			var blockMinY = placeY; // Y es altura
			var blockMaxY = placeY + 1;
			var blockMinZ = placeZ; // Z es horizontal
			var blockMaxZ = placeZ + 1;
			
			// Verificar intersección entre la hitbox del jugador y el bloque a colocar
			var intersects = ( playerMaxX > blockMinX && playerMinX < blockMaxX &&
			                   playerMaxY > blockMinY && playerMinY < blockMaxY &&
			                   playerMaxZ > blockMinZ && playerMinZ < blockMaxZ );
			
			// Si hay intersección, no permitir colocar el bloque
			if ( intersects ) {
				return; // No colocar el bloque dentro del jugador
			}
			
			// Colocar el bloque
			obj.setBlock( placeX, placeY, placeZ, this.buildMaterial );
		}
	}
}

// doBlockActionAtCenter()
//
// Called to perform an action at the center of the screen (crosshair position).

Player.prototype.doBlockActionAtCenter = function( destroy )
{
	var canvas = this.canvas;
	var centerX = canvas.width / 2;
	var centerY = canvas.height / 2;
	this.doBlockAction( centerX, centerY, destroy );
}

// getEyePos()
//
// Returns the position of the eyes of the player for rendering.

Player.prototype.getEyePos = function()
{
	// En modo espectador, siempre usar primera persona (sin offset de altura)
	if ( this.spectatorMode ) {
		return this.pos;
	}
	
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	var eyePos = this.pos.add( new Vector( 0.0, 1.7, 0.0 ) );
	
	// Ajustar posición de la cámara según el modo de perspectiva
	// En modo espectador, solo primera persona está permitida
	if ( this.cameraMode === 1 ) {
		// Primera persona: cámara en los ojos del jugador
		return eyePos;
	} else if ( this.cameraMode === 2 ) {
		// Segunda persona: cámara detrás del jugador, conectada rígidamente a la cabeza
		// Como si hubiera un fierro invisible entre la cabeza y la cámara
		// Si la cabeza baja, la cámara sube (y viceversa)
		var yaw = this.angles[1];
		var pitch = this.angles[0];
		var distance = 2.0; // Distancia fija desde la cabeza
		
		// Calcular posición horizontal basada en yaw
		// La cámara está detrás del jugador (opuesta a donde mira)
		// yawOffset = PI para estar detrás del jugador
		var yawOffset = Math.PI;
		var adjustedYaw = yaw + yawOffset;
		
		// Calcular posición horizontal (X, Z)
		// Ejes: X y Z = horizontal, Y = vertical (altura)
		// El sistema usa: Math.cos(Math.PI/2 - yaw) para X y Math.sin(Math.PI/2 - yaw) para Z
		var cosPitch = Math.cos( pitch );
		var offsetX = Math.cos( Math.PI / 2 - adjustedYaw ) * distance * cosPitch;
		var offsetZ = Math.sin( Math.PI / 2 - adjustedYaw ) * distance * cosPitch;
		
		// Calcular posición vertical: si la cabeza baja (pitch negativo), la cámara sube (offsetY positivo)
		// El pitch se invierte para que la cámara esté en el extremo opuesto
		var offsetY = -Math.sin( pitch ) * distance;
		
		// La cabeza está en pos.y + 1.7, la cámara está a offsetY de esa altura
		return this.pos.add( new Vector( offsetX, 1.7 + offsetY, offsetZ ) );
	} else if ( this.cameraMode === 3 ) {
		// Tercera persona: cámara delante del jugador, conectada rígidamente a la cabeza
		// Como si hubiera un fierro invisible entre la cabeza y la cámara (de frente a Steve)
		// Si la cabeza baja, la cámara también baja (pero la cámara mira hacia arriba)
		var yaw = this.angles[1];
		var pitch = this.angles[0];
		var distance = 2.5; // 1/4 más lejos que segunda persona (2.0 * 1.25 = 2.5)
		
		// Calcular posición horizontal basada en yaw
		// La cámara está delante del jugador (en la dirección donde mira)
		// yawOffset = 0 para estar delante del jugador
		var yawOffset = 0;
		var adjustedYaw = yaw + yawOffset;
		
		// Calcular posición horizontal (X, Z)
		// Ejes: X y Z = horizontal, Y = vertical (altura)
		// El sistema usa: Math.cos(Math.PI/2 - yaw) para X y Math.sin(Math.PI/2 - yaw) para Z
		var cosPitch = Math.cos( pitch );
		var offsetX = Math.cos( Math.PI / 2 - adjustedYaw ) * distance * cosPitch;
		var offsetZ = Math.sin( Math.PI / 2 - adjustedYaw ) * distance * cosPitch;
		
		// Calcular posición vertical: si la cabeza baja (pitch negativo), la cámara también baja (offsetY negativo)
		// NO se invierte el pitch, la cámara sigue el movimiento de la cabeza
		var offsetY = Math.sin( pitch ) * distance;
		
		// La cabeza está en pos.y + 1.7, la cámara está a offsetY de esa altura
		return this.pos.add( new Vector( offsetX, 1.7 + offsetY, offsetZ ) );
	}
	
	return eyePos;
}

// update()
//
// Updates this local player (gravity, movement)

Player.prototype.update = function()
{
	var world = this.world;
	var velocity = this.velocity;
	var pos = this.pos;
	var bPos = new Vector( Math.floor( pos.x ), Math.floor( pos.y ), Math.floor( pos.z ) );

	if ( this.lastUpdate != null )
	{
		var delta = ( new Date().getTime() - this.lastUpdate ) / 1000;
		
		// Limit delta to prevent large jumps when game is paused/resumed
		// This prevents the player from falling through the world or moving too fast
		var maxDelta = 0.1; // Maximum 100ms delta (10 FPS equivalent)
		if ( delta > maxDelta ) {
			delta = maxDelta;
		}

		// View
		if ( this.dragging )
		{
			this.angles[0] += ( this.targetPitch - this.angles[0] ) * 30 * delta;
			this.angles[1] += ( this.targetYaw - this.angles[1] ) * 30 * delta;
			if ( this.angles[0] < -Math.PI/2 ) this.angles[0] = -Math.PI/2;
			if ( this.angles[0] > Math.PI/2 ) this.angles[0] = Math.PI/2;
		}

		// Modo espectador: volar libremente sin colisiones ni gravedad
		if ( this.spectatorMode )
		{
			// Velocidad de vuelo más rápida
			var flySpeed = 12;
			
			// Movimiento horizontal (WASD)
			// Ejes: X y Z = horizontal, Y = vertical (altura)
			var walkVelocity = new Vector( 0, 0, 0 );
			if ( this.keys["w"] ) {
				walkVelocity.x += Math.cos( Math.PI / 2 - this.angles[1] );
				walkVelocity.z += Math.sin( Math.PI / 2 - this.angles[1] ); // Z es horizontal
			}
			if ( this.keys["s"] ) {
				walkVelocity.x += Math.cos( Math.PI + Math.PI / 2 - this.angles[1] );
				walkVelocity.z += Math.sin( Math.PI + Math.PI / 2 - this.angles[1] ); // Z es horizontal
			}
			if ( this.keys["a"] ) {
				walkVelocity.x += Math.cos( Math.PI / 2 + Math.PI / 2 - this.angles[1] );
				walkVelocity.z += Math.sin( Math.PI / 2 + Math.PI / 2 - this.angles[1] ); // Z es horizontal
			}
			if ( this.keys["d"] ) {
				walkVelocity.x += Math.cos( -Math.PI / 2 + Math.PI / 2 - this.angles[1] );
				walkVelocity.z += Math.sin( -Math.PI / 2 + Math.PI / 2 - this.angles[1] ); // Z es horizontal
			}
			
			// Movimiento vertical (Espacio para subir, Shift para bajar)
			// Ejes: X y Z = horizontal, Y = vertical (altura)
			if ( this.keys[" "] ) {
				walkVelocity.y = 1; // Subir (Y es altura)
			}
			if ( this.keys["Shift"] || this.keys[16] ) {
				walkVelocity.y = -1; // Bajar
			}
			
			// Aplicar velocidad
			// Ejes: X y Z = horizontal, Y = vertical (altura)
			if ( walkVelocity.length() > 0 ) {
				walkVelocity = walkVelocity.normal();
				velocity.x = walkVelocity.x * flySpeed; // X horizontal
				velocity.y = walkVelocity.y * flySpeed; // Y altura
				velocity.z = walkVelocity.z * flySpeed; // Z horizontal
			} else {
				velocity.x /= 1.5;
				velocity.y /= 1.5;
				velocity.z /= 1.5;
			}
			
			// En modo espectador, simplemente mover sin colisiones
			this.pos = pos.add( velocity.mul( delta ) );
			this.falling = false;
		}
		else
		{
			// Modo normal: con gravedad y colisiones
			// Ejes: X y Z = horizontal, Y = vertical (altura)
			// Gravity
			if ( this.falling )
				velocity.y += -0.5; // Y es altura

			// Jumping
			if ( this.keys[" "] && !this.falling )
				velocity.y = 8; // Y es altura

			// Walking
			// Ejes: X y Z = horizontal, Y = vertical (altura)
			var walkVelocity = new Vector( 0, 0, 0 );
			if ( !this.falling )
			{
				if ( this.keys["w"] ) {
					walkVelocity.x += Math.cos( Math.PI / 2 - this.angles[1] );
					walkVelocity.z += Math.sin( Math.PI / 2 - this.angles[1] ); // Z es horizontal
				}
				if ( this.keys["s"] ) {
					walkVelocity.x += Math.cos( Math.PI + Math.PI / 2 - this.angles[1] );
					walkVelocity.z += Math.sin( Math.PI + Math.PI / 2 - this.angles[1] ); // Z es horizontal
				}
				if ( this.keys["a"] ) {
					walkVelocity.x += Math.cos( Math.PI / 2 + Math.PI / 2 - this.angles[1] );
					walkVelocity.z += Math.sin( Math.PI / 2 + Math.PI / 2 - this.angles[1] ); // Z es horizontal
				}
				if ( this.keys["d"] ) {
					walkVelocity.x += Math.cos( -Math.PI / 2 + Math.PI / 2 - this.angles[1] );
					walkVelocity.z += Math.sin( -Math.PI / 2 + Math.PI / 2 - this.angles[1] ); // Z es horizontal
				}
			}
			if ( walkVelocity.length() > 0 ) {
					walkVelocity = walkVelocity.normal();
					velocity.x = walkVelocity.x * 4; // X horizontal
					velocity.z = walkVelocity.z * 4; // Z horizontal
			} else {
				velocity.x /= this.falling ? 1.01 : 1.5;
				velocity.z /= this.falling ? 1.01 : 1.5;
			}

			// Resolve collision
			this.pos = this.resolveCollision( pos, bPos, velocity.mul( delta ) );
		}
		
		// Clamp player position to world bounds to prevent falling through
		// Keep player slightly inside bounds (0.1 margin) to avoid edge cases
		// Ejes: X y Z = horizontal, Y = vertical (altura)
		var margin = 0.1;
		if ( this.pos.x < margin ) this.pos.x = margin;
		if ( this.pos.y < margin ) this.pos.y = margin; // Y es altura
		if ( this.pos.z < margin ) this.pos.z = margin; // Z es horizontal
		if ( this.pos.x > world.sx - 1 - margin ) this.pos.x = world.sx - 1 - margin;
		if ( this.pos.y > world.sy - 1.7 - margin ) { // Y es altura
			this.pos.y = world.sy - 1.7 - margin;
			this.velocity.y = 0; // Y es altura
			this.falling = false;
		}
		if ( this.pos.z > world.sz - 1 - margin ) this.pos.z = world.sz - 1 - margin; // Z es horizontal
	}

	this.lastUpdate = new Date().getTime();
}

// resolveCollision( pos, bPos, velocity )
//
// Resolves collisions between the player and blocks on XY level for the next movement step.

Player.prototype.resolveCollision = function( pos, bPos, velocity )
{
	var world = this.world;
	
	// El sistema de colisiones original ya maneja las colisiones correctamente
	// Solo necesitamos confiar en él y no agregar verificaciones adicionales que bloqueen el movimiento
	
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// playerRect usa X y Z para colisiones horizontales
	var playerRect = { x: pos.x + velocity.x, y: pos.z + velocity.z, size: 0.25 };

	// Collect XZ collision sides (horizontal)
	var collisionCandidates = [];

	for ( var x = bPos.x - 1; x <= bPos.x + 1; x++ )
	{
		for ( var y = bPos.y; y <= bPos.y + 1; y++ ) // Y es altura
		{
			for ( var z = bPos.z - 1; z <= bPos.z + 1; z++ ) // Z es horizontal
			{
				if ( world.getBlock( x, y, z ) != BLOCK.AIR )
				{
					if ( world.getBlock( x - 1, y, z ) == BLOCK.AIR ) collisionCandidates.push( { x: x, dir: -1, y1: z, y2: z + 1 } );
					if ( world.getBlock( x + 1, y, z ) == BLOCK.AIR ) collisionCandidates.push( { x: x + 1, dir: 1, y1: z, y2: z + 1 } );
					if ( world.getBlock( x, y, z - 1 ) == BLOCK.AIR ) collisionCandidates.push( { y: z, dir: -1, x1: x, x2: x + 1 } );
					if ( world.getBlock( x, y, z + 1 ) == BLOCK.AIR ) collisionCandidates.push( { y: z + 1, dir: 1, x1: x, x2: x + 1 } );
				}
			}
		}
	}

	// Solve XZ collisions (horizontal)
	for( var i in collisionCandidates )
	{
		var side = collisionCandidates[i];

		if ( lineRectCollide( side, playerRect ) )
		{
			if ( side.x != null && velocity.x * side.dir < 0 ) {
				pos.x = side.x + playerRect.size / 2 * ( velocity.x > 0 ? -1 : 1 );
				velocity.x = 0;
			} else if ( side.y != null && velocity.z * side.dir < 0 ) {
				pos.z = side.y + playerRect.size / 2 * ( velocity.z > 0 ? -1 : 1 );
				velocity.z = 0;
			}
		}
	}

	// playerFace usa X y Z para colisiones verticales (Y es altura)
	var playerFace = { x1: pos.x + velocity.x - 0.125, y1: pos.z + velocity.z - 0.125, x2: pos.x + velocity.x + 0.125, y2: pos.z + velocity.z + 0.125 };
	var newBYLower = Math.floor( pos.y + velocity.y ); // Y es altura
	var newBYUpper = Math.floor( pos.y + 1.7 + velocity.y * 1.1 ); // Y es altura

	// Collect Y collision sides (vertical, altura)
	collisionCandidates = [];

	for ( var x = bPos.x - 1; x <= bPos.x + 1; x++ ) 
	{
		for ( var z = bPos.z - 1; z <= bPos.z + 1; z++ ) // Z es horizontal
		{
			if ( world.getBlock( x, newBYLower, z ) != BLOCK.AIR )
				collisionCandidates.push( { z: newBYLower + 1, dir: 1, x1: x, y1: z, x2: x + 1, y2: z + 1 } );
			if ( world.getBlock( x, newBYUpper, z ) != BLOCK.AIR )
				collisionCandidates.push( { z: newBYUpper, dir: -1, x1: x, y1: z, x2: x + 1, y2: z + 1 } );
		}
	}

	// Solve Y collisions (vertical, altura)
	this.falling = true;
	for ( var i in collisionCandidates )
	{
		var face = collisionCandidates[i];

		if ( rectRectCollide( face, playerFace ) && velocity.y * face.dir < 0 ) // Y es altura
		{
			if ( velocity.y < 0 ) {
				this.falling = false;
				pos.y = face.z; // face.z almacena la altura Y
				velocity.y = 0;
				this.velocity.y = 0;
			} else {
				pos.y = face.z - 1.8; // face.z almacena la altura Y
				velocity.y = 0;
				this.velocity.y = 0;
			}

			break;
		}
	}

	// Return solution
	return pos.add( velocity );
}
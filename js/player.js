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
			// Pause the game when mouse is uncaptured
			if (typeof pauseGame === 'function') {
				pauseGame();
			}
		}
	});

	document.addEventListener('mousemove', function(e) {
		if (t.pointerLocked) {
			t.onMouseMove(e.movementX, e.movementY);
		}
	});

	document.addEventListener('mousedown', function(e) {
		if (t.pointerLocked) {
			if (e.button === 0) { // Left click
				t.doBlockActionAtCenter(true); // Destroy
			} else if (e.button === 2) { // Right click
				t.doBlockActionAtCenter(false); // Place
			}
			e.preventDefault();
		}
	});
}

// setMaterialSelector( id )
//
// Sets the table with the material selectors.

Player.prototype.setMaterialSelector = function( id )
{
	var tableRow = document.getElementById( id ).getElementsByTagName( "tr" )[0];
	var texOffset = 0;

	for ( var mat in BLOCK )
	{
		if ( typeof( BLOCK[mat] ) == "object" && BLOCK[mat].spawnable == true )
		{
			var selector = document.createElement( "td" );
			selector.style.backgroundPosition = texOffset + "px 0px";

			var pl = this;
			selector.material = BLOCK[mat];
			selector.onclick = function()
			{
				this.style.opacity = "1.0";

				pl.prevSelector.style.opacity = null;
				pl.prevSelector = this;

				pl.buildMaterial = this.material;
			}

			if ( mat == "DIRT" ) {
				this.prevSelector = selector;
				selector.style.opacity = "1.0";
			}

			tableRow.appendChild( selector );
			texOffset -= 70;
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
	this.keys[key] = down;
	this.keys[keyCode] = down;

	if ( !down && key == "t" && this.eventHandlers["openChat"] ) this.eventHandlers.openChat();
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

// doBlockAction( x, y )
//
// Called to perform an action based on the player's block selection and input.

Player.prototype.doBlockAction = function( x, y, destroy )
{
	var bPos = new Vector( Math.floor( this.pos.x ), Math.floor( this.pos.y ), Math.floor( this.pos.z ) );
	var block = this.canvas.renderer.pickAt( new Vector( bPos.x - 4, bPos.y - 4, bPos.z - 4 ), new Vector( bPos.x + 4, bPos.y + 4, bPos.z + 4 ), x, y );

	if ( block != false )
	{
		var obj = this.client ? this.client : this.world;

		if ( destroy )
			obj.setBlock( block.x, block.y, block.z, BLOCK.AIR );
		else
		{
			// Calcular la posición donde se colocará el bloque
			var placeX = block.x + block.n.x;
			var placeY = block.y + block.n.y;
			var placeZ = block.z + block.n.z;
			
			// Verificar si el bloque se colocaría dentro de la hitbox del jugador
			// Hitbox del jugador: tamaño 0.25 en X e Y, altura 1.7 en Z
			var playerSize = 0.25;
			// Ejes: X y Z = horizontal, Y = vertical (altura)
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
	// En modo espectador, los ojos están en la posición del jugador (sin offset)
	if ( this.spectatorMode ) {
		return this.pos;
	}
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	return this.pos.add( new Vector( 0.0, 1.7, 0.0 ) );
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
			var walkVelocity = new Vector( 0, 0, 0 );
			if ( this.keys["w"] ) {
				walkVelocity.x += Math.cos( Math.PI / 2 - this.angles[1] );
				walkVelocity.y += Math.sin( Math.PI / 2 - this.angles[1] );
			}
			if ( this.keys["s"] ) {
				walkVelocity.x += Math.cos( Math.PI + Math.PI / 2 - this.angles[1] );
				walkVelocity.y += Math.sin( Math.PI + Math.PI / 2 - this.angles[1] );
			}
			if ( this.keys["a"] ) {
				walkVelocity.x += Math.cos( Math.PI / 2 + Math.PI / 2 - this.angles[1] );
				walkVelocity.y += Math.sin( Math.PI / 2 + Math.PI / 2 - this.angles[1] );
			}
			if ( this.keys["d"] ) {
				walkVelocity.x += Math.cos( -Math.PI / 2 + Math.PI / 2 - this.angles[1] );
				walkVelocity.y += Math.sin( -Math.PI / 2 + Math.PI / 2 - this.angles[1] );
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
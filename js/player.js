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
	this.debugKeyDown = false;
	this.buildMaterial = BLOCK.DIRT;
	this.eventHandlers = {};
	
	// Hitbox del jugador (Minecraft vanilla: 0.6 bloques de ancho, 1.8 bloques de alto)
	this.playerWidth = 0.6; // Ancho completo de la hitbox
	this.playerRadius = this.playerWidth / 2; // Radio horizontal (0.3)
	this.playerHeight = 1.8; // Altura del jugador
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

	if ( keyCode == 114 ) { // F3 key
		if ( down && !this.debugKeyDown ) {
			this.debugKeyDown = true;
			if ( typeof toggleDebugOverlay === "function" ) {
				toggleDebugOverlay();
			}
		} else if ( !down ) {
			this.debugKeyDown = false;
		}
	}

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
			// Hitbox del jugador: tamaño 0.3 en X e Y (radio), altura 1.8 en Z
			var playerRadius = this.playerRadius || 0.3;
			var playerHeight = this.playerHeight || 1.8;
			var playerMinX = this.pos.x - playerRadius;
			var playerMaxX = this.pos.x + playerRadius;
			var playerMinY = this.pos.y - playerRadius;
			var playerMaxY = this.pos.y + playerRadius;
			var playerMinZ = this.pos.z;
			var playerMaxZ = this.pos.z + playerHeight;
			
			// El bloque ocupa desde (placeX, placeY, placeZ) hasta (placeX+1, placeY+1, placeZ+1)
			var blockMinX = placeX;
			var blockMaxX = placeX + 1;
			var blockMinY = placeY;
			var blockMaxY = placeY + 1;
			var blockMinZ = placeZ;
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
	return this.pos.add( new Vector( 0.0, 0.0, this.playerHeight || 1.8 ) );
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

		// Gravity
		if ( this.falling )
			velocity.z += -0.5;

		// Jumping
		if ( this.keys[" "] && !this.falling )
			velocity.z = 8;

		// Walking
		var walkVelocity = new Vector( 0, 0, 0 );
		if ( !this.falling )
		{
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
		}
		if ( walkVelocity.length() > 0 ) {
				walkVelocity = walkVelocity.normal();
				velocity.x = walkVelocity.x * 4;
				velocity.y = walkVelocity.y * 4;
		} else {
			velocity.x /= this.falling ? 1.01 : 1.5;
			velocity.y /= this.falling ? 1.01 : 1.5;
		}

			// Resolve collision
		this.pos = this.resolveCollision( pos, bPos, velocity.mul( delta ) );
		
		// Clamp player position to world bounds to prevent falling through
		// Keep player slightly inside bounds (0.1 margin) to avoid edge cases
		var margin = 0.1;
		if ( this.pos.x < margin ) this.pos.x = margin;
		if ( this.pos.y < margin ) this.pos.y = margin;
		if ( this.pos.z < margin ) this.pos.z = margin;
		if ( this.pos.x > world.sx - 1 - margin ) this.pos.x = world.sx - 1 - margin;
		if ( this.pos.y > world.sy - 1 - margin ) this.pos.y = world.sy - 1 - margin;
		var playerHeight = this.playerHeight || 1.8;
		if ( this.pos.z > world.sz - playerHeight - margin ) {
			this.pos.z = world.sz - playerHeight - margin;
			this.velocity.z = 0;
			this.falling = false;
		}
	}

	this.lastUpdate = new Date().getTime();
}

// resolveCollision( pos, bPos, velocity )
//
// Resolves collisions between the player and blocks on XY level for the next movement step.

Player.prototype.resolveCollision = function( pos, bPos, velocity )
{
	var world = this.world;
	
	var playerRadius = this.playerRadius || 0.3;
	var playerHeight = this.playerHeight || 1.8;
	
	// Trabajar con una copia de la posición para no modificar el original
	var newPos = new Vector( pos.x, pos.y, pos.z );
	var newVelocity = new Vector( velocity.x, velocity.y, velocity.z );
	
	// Función auxiliar para verificar si una posición intersecta con bloques sólidos
	var checkBlockCollision = function( testX, testY, testZ ) {
		var testMinX = testX - playerRadius;
		var testMaxX = testX + playerRadius;
		var testMinY = testY - playerRadius;
		var testMaxY = testY + playerRadius;
		var testMinZ = testZ;
		var testMaxZ = testZ + playerHeight;
		
		for ( var x = Math.floor( testMinX ); x <= Math.floor( testMaxX ); x++ )
		{
			for ( var y = Math.floor( testMinY ); y <= Math.floor( testMaxY ); y++ )
			{
				for ( var z = Math.floor( testMinZ ); z <= Math.floor( testMaxZ ); z++ )
				{
					var block = world.getBlock( x, y, z );
					if ( block != BLOCK.AIR && !block.transparent )
					{
						var blockMinX = x;
						var blockMaxX = x + 1;
						var blockMinY = y;
						var blockMaxY = y + 1;
						var blockMinZ = z;
						var blockMaxZ = z + 1;
						
						if ( testMaxX > blockMinX && testMinX < blockMaxX &&
						     testMaxY > blockMinY && testMinY < blockMaxY &&
						     testMaxZ > blockMinZ && testMinZ < blockMaxZ )
						{
							return { collides: true, blockX: x, blockY: y, blockZ: z,
							         blockMinX: blockMinX, blockMaxX: blockMaxX,
							         blockMinY: blockMinY, blockMaxY: blockMaxY,
							         blockMinZ: blockMinZ, blockMaxZ: blockMaxZ };
						}
					}
				}
			}
		}
		return { collides: false };
	};
	
	// Primero, verificar si el jugador está dentro de un bloque y sacarlo
	var currentCollision = checkBlockCollision( newPos.x, newPos.y, newPos.z );
	if ( currentCollision.collides )
	{
		// El jugador está dentro de un bloque, empujarlo fuera
		var playerMinX = newPos.x - playerRadius;
		var playerMaxX = newPos.x + playerRadius;
		var playerMinY = newPos.y - playerRadius;
		var playerMaxY = newPos.y + playerRadius;
		var playerMinZ = newPos.z;
		var playerMaxZ = newPos.z + playerHeight;
		
		// Calcular distancias de penetración
		var distLeft = playerMaxX - currentCollision.blockMinX;
		var distRight = currentCollision.blockMaxX - playerMinX;
		var distFront = playerMaxY - currentCollision.blockMinY;
		var distBack = currentCollision.blockMaxY - playerMinY;
		
		// Encontrar la dirección de menor penetración y empujar en esa dirección
		var minDist = Math.min( distLeft, distRight, distFront, distBack );
		if ( minDist == distLeft ) {
			newPos.x = currentCollision.blockMinX - playerRadius - 0.001;
		} else if ( minDist == distRight ) {
			newPos.x = currentCollision.blockMaxX + playerRadius + 0.001;
		} else if ( minDist == distFront ) {
			newPos.y = currentCollision.blockMinY - playerRadius - 0.001;
		} else {
			newPos.y = currentCollision.blockMaxY + playerRadius + 0.001;
		}
	}
	
	// Resolver colisiones horizontales (X e Y)
	// Primero verificar colisiones en X
	if ( Math.abs( newVelocity.x ) > 0.001 )
	{
		var testPosX = newPos.x + newVelocity.x;
		var collision = checkBlockCollision( testPosX, newPos.y, newPos.z );
		
		if ( collision.collides )
		{
			// Limitar el movimiento para que se detenga justo antes del bloque
			if ( newVelocity.x > 0 )
			{
				newPos.x = collision.blockMinX - playerRadius - 0.001;
			}
			else
			{
				newPos.x = collision.blockMaxX + playerRadius + 0.001;
			}
			newVelocity.x = 0;
		}
	}
	
	// Luego verificar colisiones en Y
	if ( Math.abs( newVelocity.y ) > 0.001 )
	{
		var testPosY = newPos.y + newVelocity.y;
		var collision = checkBlockCollision( newPos.x, testPosY, newPos.z );
		
		if ( collision.collides )
		{
			// Limitar el movimiento para que se detenga justo antes del bloque
			if ( newVelocity.y > 0 )
			{
				newPos.y = collision.blockMinY - playerRadius - 0.001;
			}
			else
			{
				newPos.y = collision.blockMaxY + playerRadius + 0.001;
			}
			newVelocity.y = 0;
		}
	}
	
	// Actualizar posiciones futuras después de resolver colisiones horizontales
	var futurePlayerMinX = newPos.x + newVelocity.x - playerRadius;
	var futurePlayerMaxX = newPos.x + newVelocity.x + playerRadius;
	var futurePlayerMinY = newPos.y + newVelocity.y - playerRadius;
	var futurePlayerMaxY = newPos.y + newVelocity.y + playerRadius;
	
	// Resolver colisiones en Z (gravedad y techo)
	this.falling = true;
	var futurePlayerMinZ = newPos.z + newVelocity.z;
	var futurePlayerMaxZ = newPos.z + newVelocity.z + playerHeight;

	for ( var x = bPos.x - 1; x <= bPos.x + 1; x++ )
	{
		for ( var y = bPos.y - 1; y <= bPos.y + 1; y++ )
		{
			// Verificar bloque debajo (suelo)
			var z = Math.floor( futurePlayerMinZ );
			var block = world.getBlock( x, y, z );
			if ( block != BLOCK.AIR && !block.transparent )
			{
				var blockMinX = x;
				var blockMaxX = x + 1;
				var blockMinY = y;
				var blockMaxY = y + 1;
				var blockMinZ = z;
				var blockMaxZ = z + 1;
				
				var intersectsX = ( futurePlayerMaxX > blockMinX && futurePlayerMinX < blockMaxX );
				var intersectsY = ( futurePlayerMaxY > blockMinY && futurePlayerMinY < blockMaxY );
				var intersectsZ = ( futurePlayerMaxZ > blockMinZ && futurePlayerMinZ < blockMaxZ );
				
				if ( intersectsX && intersectsY && intersectsZ && newVelocity.z < 0 )
				{
					this.falling = false;
					newPos.z = blockMaxZ;
					newVelocity.z = 0;
					this.velocity.z = 0;
				}
			}
			
			// Verificar bloque arriba (techo)
			z = Math.floor( futurePlayerMaxZ );
			block = world.getBlock( x, y, z );
			if ( block != BLOCK.AIR && !block.transparent )
			{
				var blockMinX = x;
				var blockMaxX = x + 1;
				var blockMinY = y;
				var blockMaxY = y + 1;
				var blockMinZ = z;
				var blockMaxZ = z + 1;
				
				var intersectsX = ( futurePlayerMaxX > blockMinX && futurePlayerMinX < blockMaxX );
				var intersectsY = ( futurePlayerMaxY > blockMinY && futurePlayerMinY < blockMaxY );
				var intersectsZ = ( futurePlayerMaxZ > blockMinZ && futurePlayerMinZ < blockMaxZ );
				
				if ( intersectsX && intersectsY && intersectsZ && newVelocity.z > 0 )
				{
					newPos.z = blockMinZ - playerHeight;
					newVelocity.z = 0;
					this.velocity.z = 0;
				}
			}
		}
	}

	// Return solution
	return newPos.add( newVelocity );
}
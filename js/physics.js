// ==========================================
// Physics
//
// This class contains the code that takes care of simulating
// processes like gravity and fluid flow in the world.
// ==========================================

// Constructor()
//
// Creates a new physics simulator.

function Physics()
{
	this.lastStep = -1;
}

// setWorld( world )
//
// Assigns a world to simulate to this physics simulator.

Physics.prototype.setWorld = function( world )
{
	this.world = world;
}

// simulate()
//
// Perform one iteration of physics simulation.
// Should be called about once every second.

Physics.prototype.simulate = function()
{
	var world = this.world;
	var blocks = world.blocks;
	
	var step = Math.floor( new Date().getTime() / 100 );
	if ( step == this.lastStep ) return;
	this.lastStep = step;
	
	// Gravity
	if ( step % 1 == 0 )
	{
		for ( var x = 0; x < world.sx; x++ ) {
			for ( var y = 0; y < world.sy; y++ ) {
				for ( var z = 0; z < world.sz; z++ ) {
					// Solo procesar bloques que no están siendo animados
					var animKey = x + "," + y + "," + z;
					if ( world.blockAnimations && world.blockAnimations[animKey] ) continue;
					
					if ( blocks[x][y][z].gravity && z > 0 && blocks[x][y][z-1] == BLOCK.AIR )
					{
						// Verificar si el bloque caería sobre el jugador
						// Si es así, no permitir que caiga (evita ahogamiento en arena)
						if ( !this.checkPlayerCollision( x, y, z - 1 ) )
						{
							// Crear animación que continuará hasta detectar suelo
							var blockType = blocks[x][y][z];
							var fallSpeed = 2.0; // Bloques por segundo
							
							// Iniciar animación sin duración fija
							world.blockAnimations[animKey] = {
								fromZ: z,
								currentZ: z,
								targetZ: z - 1,
								startTime: new Date().getTime(),
								fallSpeed: fallSpeed, // Velocidad de caída en bloques/segundo
								blockType: blockType,
								lastUpdateTime: new Date().getTime()
							};
							
							// Marcar la posición original como AIR temporalmente
							// El bloque se dibujará en la posición animada
							world.setBlock( x, y, z, BLOCK.AIR );
						}
					}
				}
			}
		}
	}
	
	// Actualizar animaciones de bloques
	this.updateBlockAnimations();
	
	// Fluids
	if ( step % 10 == 0 )
	{
		// Newly spawned fluid blocks are stored so that those aren't
		// updated in the same step, creating a simulation avalanche.
		var newFluidBlocks = {};
		
		for ( var x = 0; x < world.sx; x++ ) {
			for ( var y = 0; y < world.sy; y++ ) {
				for ( var z = 0; z < world.sz; z++ ) {
					var material = blocks[x][y][z];
					if ( material.fluid && newFluidBlocks[x+","+y+","+z] == null )
					{
						if ( x > 0 && blocks[x-1][y][z] == BLOCK.AIR ) {
							world.setBlock( x - 1, y, z, material );
							newFluidBlocks[(x-1)+","+y+","+z] = true;
						}
						if ( x < world.sx - 1 && blocks[x+1][y][z] == BLOCK.AIR ) {
							world.setBlock( x + 1, y, z, material );
							newFluidBlocks[(x+1)+","+y+","+z] = true;
						}
						if ( y > 0 && blocks[x][y-1][z] == BLOCK.AIR ) {
							world.setBlock( x, y - 1, z, material );
							newFluidBlocks[x+","+(y-1)+","+z] = true;
						}
						if ( y < world.sy - 1 && blocks[x][y+1][z] == BLOCK.AIR ) {
							world.setBlock( x, y + 1, z, material );
							newFluidBlocks[x+","+(y+1)+","+z] = true;
						}
					}
				}
			}
		}
	}
}

// checkPlayerCollision( x, y, z )
//
// Verifica si un bloque en la posición (x, y, z) intersecta con el jugador local.
// Retorna true si hay intersección, false en caso contrario.

Physics.prototype.checkPlayerCollision = function( x, y, z )
{
	if ( !this.world || !this.world.localPlayer ) return false;
	
	var player = this.world.localPlayer;
	var pos = player.pos;
	
	// Hitbox del jugador: tamaño 0.3 en X e Y (radio), altura 1.8 en Z
	var playerRadius = player.playerRadius || 0.3;
	var playerHeight = player.playerHeight || 1.8;
	
	// Límites de la hitbox del jugador
	var playerMinX = pos.x - playerRadius;
	var playerMaxX = pos.x + playerRadius;
	var playerMinY = pos.y - playerRadius;
	var playerMaxY = pos.y + playerRadius;
	var playerMinZ = pos.z;
	var playerMaxZ = pos.z + playerHeight;
	
	// Límites del bloque (ocupa desde (x, y, z) hasta (x+1, y+1, z+1))
	var blockMinX = x;
	var blockMaxX = x + 1;
	var blockMinY = y;
	var blockMaxY = y + 1;
	var blockMinZ = z;
	var blockMaxZ = z + 1;
	
	// Verificar intersección entre la hitbox del jugador y el bloque
	return ( playerMaxX > blockMinX && playerMinX < blockMaxX &&
	         playerMaxY > blockMinY && playerMinY < blockMaxY &&
	         playerMaxZ > blockMinZ && playerMinZ < blockMaxZ );
}

// updateBlockAnimations()
//
// Actualiza las animaciones de bloques. Las animaciones continúan hasta que el bloque detecte suelo.

Physics.prototype.updateBlockAnimations = function()
{
	if ( !this.world ) return;
	
	var world = this.world;
	var currentTime = new Date().getTime();
	var animsToRemove = [];
	var blocks = world.blocks;
	
	for ( var key in world.blockAnimations )
	{
		var anim = world.blockAnimations[key];
		var coords = key.split( "," );
		var x = parseInt( coords[0] );
		var y = parseInt( coords[1] );
		
		// Calcular delta time desde la última actualización
		var deltaTime = ( currentTime - anim.lastUpdateTime ) / 1000.0; // Convertir a segundos
		anim.lastUpdateTime = currentTime;
		
		// Calcular nueva posición basada en la velocidad de caída
		var distanceToFall = anim.fallSpeed * deltaTime;
		var newZ = anim.currentZ - distanceToFall;
		
		// Verificar si hay suelo debajo (bloque sólido o z == 0)
		var floorZ = Math.floor( newZ );
		var hasGround = false;
		
		if ( floorZ < 0 )
		{
			// Llegó al fondo del mundo
			hasGround = true;
			newZ = 0;
		}
		else
		{
			// Verificar si hay un bloque sólido debajo
			var blockBelow = world.getBlock( x, y, floorZ );
			if ( blockBelow != BLOCK.AIR && !blockBelow.transparent )
			{
				hasGround = true;
				newZ = floorZ + 1; // Colocar justo encima del bloque
			}
			// También verificar si el bloque está ocupando el espacio donde debería estar
			else if ( floorZ >= 0 && blocks[x][y][floorZ] != BLOCK.AIR && !blocks[x][y][floorZ].transparent )
			{
				hasGround = true;
				newZ = floorZ + 1;
			}
		}
		
		// Verificar si el bloque caería sobre el jugador
		if ( !hasGround && this.checkPlayerCollision( x, y, floorZ ) )
		{
			// Detener la animación justo antes del jugador
			hasGround = true;
			newZ = Math.floor( newZ ) + 1;
		}
		
		// Actualizar posición actual
		anim.currentZ = newZ;
		
		// Si detectó suelo, completar la animación
		if ( hasGround )
		{
			var finalZ = Math.floor( newZ );
			
			// Asegurarse de que la posición final sea válida
			if ( finalZ < 0 ) finalZ = 0;
			if ( finalZ >= world.sz ) finalZ = world.sz - 1;
			
			// Verificar que la posición final esté libre
			if ( world.getBlock( x, y, finalZ ) == BLOCK.AIR )
			{
				// Mover el bloque a su posición final
				world.setBlock( x, y, finalZ, anim.blockType );
			}
			else
			{
				// Si la posición final está ocupada, intentar una posición arriba
				if ( finalZ + 1 < world.sz && world.getBlock( x, y, finalZ + 1 ) == BLOCK.AIR )
				{
					world.setBlock( x, y, finalZ + 1, anim.blockType );
				}
			}
			
			// Eliminar la animación
			animsToRemove.push( key );
		}
	}
	
	// Eliminar animaciones completadas
	for ( var i = 0; i < animsToRemove.length; i++ )
	{
		delete world.blockAnimations[animsToRemove[i]];
	}
}
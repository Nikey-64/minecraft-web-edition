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
					if ( blocks[x][y][z].gravity && z > 0 && blocks[x][y][z-1] == BLOCK.AIR )
					{
						world.setBlock( x, y, z - 1, blocks[x][y][z] );
						world.setBlock( x, y, z, BLOCK.AIR );
					}
				}
			}
		}
	}
	
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

// pushPlayerIfTrapped( player )
//
// Empuja al jugador si está atrapado debajo de bloques sólidos.
// Busca direcciones de escape (aire) en las 4 direcciones horizontales
// y empuja al jugador hacia la dirección más cercana con aire disponible.
// No empuja si todas las 4 direcciones horizontales tienen bloques sólidos.

Physics.prototype.pushPlayerIfTrapped = function( player )
{
	if ( !this.world || !player ) return;
	
	var world = this.world;
	var pos = player.pos;
	
	// Hitbox del jugador: tamaño 0.25 en X e Y, altura 1.7 en Z
	// El jugador es de 2 bloques de alto, coordenadas medidas desde los pies
	var playerSize = 0.25; // Tamaño del jugador en X e Y (radio)
	var playerHeight = 1.7; // Altura del jugador en Z
	
	// Definir los límites de la hitbox del jugador
	var playerMinX = pos.x - playerSize;
	var playerMaxX = pos.x + playerSize;
	var playerMinY = pos.y - playerSize;
	var playerMaxY = pos.y + playerSize;
	var playerMinZ = pos.z;
	var playerMaxZ = pos.z + playerHeight;
	
	// Obtener rango de bloques que podrían intersectar con la hitbox del jugador
	var minBlockX = Math.floor( playerMinX );
	var maxBlockX = Math.floor( playerMaxX );
	var minBlockY = Math.floor( playerMinY );
	var maxBlockY = Math.floor( playerMaxY );
	var minBlockZ = Math.floor( playerMinZ );
	var maxBlockZ = Math.floor( playerMaxZ );
	
	// Verificar si hay bloques sólidos que realmente intersectan con la hitbox del jugador
	var isTrapped = false;
	
	for ( var x = minBlockX; x <= maxBlockX; x++ ) {
		for ( var y = minBlockY; y <= maxBlockY; y++ ) {
			for ( var z = minBlockZ; z <= maxBlockZ; z++ ) {
				var block = world.getBlock( x, y, z );
				if ( block != BLOCK.AIR && !block.transparent ) {
					// Verificar intersección real entre la hitbox del jugador y el bloque
					// El bloque ocupa desde (x, y, z) hasta (x+1, y+1, z+1)
					var blockMinX = x;
					var blockMaxX = x + 1;
					var blockMinY = y;
					var blockMaxY = y + 1;
					var blockMinZ = z;
					var blockMaxZ = z + 1;
					
					// Verificar si hay intersección entre la hitbox del jugador y el bloque
					if ( playerMaxX > blockMinX && playerMinX < blockMaxX &&
					     playerMaxY > blockMinY && playerMinY < blockMaxY &&
					     playerMaxZ > blockMinZ && playerMinZ < blockMaxZ ) {
						isTrapped = true;
						break;
					}
				}
			}
			if ( isTrapped ) break;
		}
		if ( isTrapped ) break;
	}
	
	// Si no está atrapado (no hay bloques intersectando con la hitbox), no hacer nada
	if ( !isTrapped ) return;
	
	// Verificar las 4 direcciones horizontales para encontrar aire
	// El jugador necesita espacio desde el suelo hasta la cabeza (1.7 unidades de altura)
	var escapeDirections = [];
	
	// Función auxiliar para verificar si hay suficiente espacio vertical en una dirección
	// El jugador es de 2 bloques de alto, así que necesitamos verificar z y z+1
	var hasEnoughVerticalSpace = function( x, y, z ) {
		// Verificar desde los pies hasta el torso (z y z+1, 2 bloques de altura)
		for ( var checkZ = z; checkZ <= z + 1; checkZ++ ) {
			// Verificar un área de 2x2 bloques para cubrir el tamaño del jugador
			for ( var checkX = x; checkX <= x + 1; checkX++ ) {
				for ( var checkY = y; checkY <= y + 1; checkY++ ) {
					var block = world.getBlock( checkX, checkY, checkZ );
					if ( block != BLOCK.AIR && !block.transparent ) {
						return false;
					}
				}
			}
		}
		return true;
	};
	
	// Norte (y - 1)
	if ( hasEnoughVerticalSpace( blockX, blockY - 1, blockZ ) ) {
		escapeDirections.push( { x: 0, y: -1, distance: Math.abs( pos.y - ( blockY - 0.5 ) ) } );
	}
	
	// Sur (y + 1)
	if ( hasEnoughVerticalSpace( blockX, blockY + 1, blockZ ) ) {
		escapeDirections.push( { x: 0, y: 1, distance: Math.abs( pos.y - ( blockY + 0.5 ) ) } );
	}
	
	// Este (x + 1)
	if ( hasEnoughVerticalSpace( blockX + 1, blockY, blockZ ) ) {
		escapeDirections.push( { x: 1, y: 0, distance: Math.abs( pos.x - ( blockX + 0.5 ) ) } );
	}
	
	// Oeste (x - 1)
	if ( hasEnoughVerticalSpace( blockX - 1, blockY, blockZ ) ) {
		escapeDirections.push( { x: -1, y: 0, distance: Math.abs( pos.x - ( blockX - 0.5 ) ) } );
	}
	
	// Si no hay direcciones de escape, no empujar
	if ( escapeDirections.length === 0 ) return;
	
	// Encontrar la dirección más cercana
	var closestDirection = escapeDirections[0];
	for ( var i = 1; i < escapeDirections.length; i++ ) {
		if ( escapeDirections[i].distance < closestDirection.distance ) {
			closestDirection = escapeDirections[i];
		}
	}
	
	// Empujar al jugador hacia la dirección más cercana
	// Usar una velocidad muy suave para empujar al jugador gradualmente
	var pushSpeed = 0.05; // Velocidad de empuje reducida para evitar teletransporte
	
	// Aplicar empuje solo si no hay movimiento en esa dirección o es muy pequeño
	// Esto evita que el empuje se acumule con el movimiento del jugador
	var currentVelX = Math.abs( player.velocity.x );
	var currentVelY = Math.abs( player.velocity.y );
	
	if ( closestDirection.x != 0 ) {
		// Solo empujar en X si la velocidad actual es baja
		if ( currentVelX < 1.0 ) {
			player.velocity.x += closestDirection.x * pushSpeed;
		}
	}
	
	if ( closestDirection.y != 0 ) {
		// Solo empujar en Y si la velocidad actual es baja
		if ( currentVelY < 1.0 ) {
			player.velocity.y += closestDirection.y * pushSpeed;
		}
	}
	
	// Limitar la velocidad máxima para evitar movimientos bruscos
	var maxPushVelocity = 1.5; // Reducido de 2.0 a 1.5
	if ( Math.abs( player.velocity.x ) > maxPushVelocity ) {
		player.velocity.x = player.velocity.x > 0 ? maxPushVelocity : -maxPushVelocity;
	}
	if ( Math.abs( player.velocity.y ) > maxPushVelocity ) {
		player.velocity.y = player.velocity.y > 0 ? maxPushVelocity : -maxPushVelocity;
	}
}
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
	// Sistema de animación de bloques en caída
	// Almacena: { x, y, z, startY, targetY, startTime, duration, block }
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	this.fallingBlocks = {}; // Clave: "x,y,z" -> datos de animación
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
	
	// Gravity con animación suave
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// blocks[x][y][z] donde x=X, y=Y(altura), z=Z(horizontal)
	// Los bloques con gravedad caen hacia abajo (Y-1)
	if ( step % 1 == 0 )
	{
		// Primero, limpiar animaciones completadas
		var currentTime = new Date().getTime();
		for ( var key in this.fallingBlocks ) {
			var anim = this.fallingBlocks[key];
			if ( currentTime >= anim.startTime + anim.duration ) {
				// Animación completada, mover el bloque físicamente
				world.setBlock( anim.x, anim.targetY, anim.z, anim.block );
				world.setBlock( anim.x, anim.startY, anim.z, BLOCK.AIR );
				delete this.fallingBlocks[key];
			}
		}
		
		// Iterar de arriba hacia abajo para evitar que los bloques se salten
		for ( var x = 0; x < world.sx; x++ ) {
			for ( var z = 0; z < world.sz; z++ ) { // Z es horizontal
				for ( var y = world.sy - 1; y > 0; y-- ) { // Y es altura, iterar de arriba hacia abajo
					var block = blocks[x][y][z];
					if ( block && block.gravity && blocks[x][y-1][z] == BLOCK.AIR )
					{
						// Verificar si este bloque ya está en animación
						var animKey = x + "," + y + "," + z;
						if ( this.fallingBlocks[animKey] ) {
							continue; // Ya está cayendo, no hacer nada
						}
						
						// Calcular la distancia de caída
						var fallDistance = 1; // Empezar con 1 bloque
						for ( var checkY = y - 1; checkY >= 0; checkY-- ) {
							if ( blocks[x][checkY][z] == BLOCK.AIR ) {
								fallDistance = y - checkY;
							} else {
								break; // Encontramos un bloque sólido
							}
						}
						
						// Crear animación suave
						// Duración basada en la distancia: más distancia = más tiempo, pero con límite
						// Usar una función cuadrática para que caiga más rápido cuanto más distancia
						var baseDuration = 150; // 150ms por bloque base (más rápido para realismo)
						var duration = baseDuration * fallDistance;
						// Limitar duración máxima a 1 segundo para caídas muy largas (más rápido)
						if ( duration > 1000 ) duration = 1000;
						
						// Crear la animación
						this.fallingBlocks[animKey] = {
							x: x,
							y: y, // Posición actual (se actualizará visualmente)
							z: z,
							startY: y,
							targetY: y - fallDistance,
							startTime: currentTime,
							duration: duration,
							block: block
						};
					}
				}
			}
		}
	}
	
	// Fluids
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// blocks[x][y][z] donde x=X, y=Y(altura), z=Z(horizontal)
	// Los fluidos caen hacia abajo (Y-1) y se extienden horizontalmente (X±1, Z±1)
	if ( step % 10 == 0 )
	{
		// Newly spawned fluid blocks are stored so that those aren't
		// updated in the same step, creating a simulation avalanche.
		var newFluidBlocks = {};
		
		// Iterar de arriba hacia abajo para que los fluidos caigan correctamente
		for ( var x = 0; x < world.sx; x++ ) {
			for ( var z = 0; z < world.sz; z++ ) { // Z es horizontal
				for ( var y = world.sy - 1; y >= 0; y-- ) { // Y es altura, iterar de arriba hacia abajo
					var material = blocks[x][y][z];
					if ( material && material.fluid && newFluidBlocks[x+","+y+","+z] == null )
					{
						// Primero, caer hacia abajo (Y-1)
						if ( y > 0 && blocks[x][y-1][z] == BLOCK.AIR ) {
							world.setBlock( x, y - 1, z, material );
							newFluidBlocks[x+","+(y-1)+","+z] = true;
						}
						// Luego, extenderse horizontalmente (X±1, Z±1)
						else {
							if ( x > 0 && blocks[x-1][y][z] == BLOCK.AIR ) {
								world.setBlock( x - 1, y, z, material );
								newFluidBlocks[(x-1)+","+y+","+z] = true;
							}
							if ( x < world.sx - 1 && blocks[x+1][y][z] == BLOCK.AIR ) {
								world.setBlock( x + 1, y, z, material );
								newFluidBlocks[(x+1)+","+y+","+z] = true;
							}
							if ( z > 0 && blocks[x][y][z-1] == BLOCK.AIR ) {
								world.setBlock( x, y, z - 1, material );
								newFluidBlocks[x+","+y+","+(z-1)] = true;
							}
							if ( z < world.sz - 1 && blocks[x][y][z+1] == BLOCK.AIR ) {
								world.setBlock( x, y, z + 1, material );
								newFluidBlocks[x+","+y+","+(z+1)] = true;
							}
						}
					}
				}
			}
		}
	}
}

// updateAnimations()
//
// Actualiza las animaciones de bloques en caída cada frame.
// Debe llamarse cada frame para obtener las posiciones interpoladas actuales.

Physics.prototype.updateAnimations = function()
{
	var currentTime = new Date().getTime();
	var updatedAnimations = {};
	
	for ( var key in this.fallingBlocks ) {
		var anim = this.fallingBlocks[key];
		var elapsed = currentTime - anim.startTime;
		var progress = Math.min( elapsed / anim.duration, 1.0 ); // 0.0 a 1.0
		
		// Usar una función de easing que simule aceleración por gravedad
		// easeInQuad: t^2 - acelera hacia el final (como la gravedad real)
		// Esto hace que el bloque caiga más rápido al final, como en la física real
		var easedProgress = progress * progress;
		
		// Calcular posición Y interpolada
		var currentY = anim.startY - ( anim.startY - anim.targetY ) * easedProgress;
		
		// Actualizar la posición Y en la animación
		anim.currentY = currentY;
		updatedAnimations[key] = anim;
	}
	
	return updatedAnimations;
}

// getBlockAnimationOffset( x, y, z )
//
// Devuelve el offset Y (altura) para un bloque en animación, o 0 si no está animado.
// Ejes: X y Z = horizontal, Y = vertical (altura)

Physics.prototype.getBlockAnimationOffset = function( x, y, z )
{
	var key = x + "," + y + "," + z;
	var anim = this.fallingBlocks[key];
	if ( anim && anim.currentY !== undefined ) {
		// Devolver el offset desde la posición original
		return anim.currentY - anim.startY;
	}
	return 0;
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
	
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// Hitbox del jugador: tamaño 0.25 en X y Z (horizontal), altura 1.7 en Y
	// El jugador es de 1.7 bloques de alto, coordenadas medidas desde los pies
	var playerSize = 0.25; // Tamaño del jugador en X y Z (radio horizontal)
	var playerHeight = 1.7; // Altura del jugador en Y
	
	// Definir los límites de la hitbox del jugador
	var playerMinX = pos.x - playerSize;
	var playerMaxX = pos.x + playerSize;
	var playerMinY = pos.y; // Y es altura, los pies están en pos.y
	var playerMaxY = pos.y + playerHeight;
	var playerMinZ = pos.z - playerSize; // Z es horizontal
	var playerMaxZ = pos.z + playerSize;
	
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
		for ( var z = minBlockZ; z <= maxBlockZ; z++ ) { // Z es horizontal
			for ( var y = minBlockY; y <= maxBlockY; y++ ) { // Y es altura
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
	// El jugador necesita espacio desde el suelo hasta la cabeza (1.7 unidades de altura en Y)
	var escapeDirections = [];
	var blockX = Math.floor( pos.x );
	var blockZ = Math.floor( pos.z ); // Z es horizontal
	var blockY = Math.floor( pos.y ); // Y es altura
	
	// Función auxiliar para verificar si hay suficiente espacio vertical en una dirección
	// El jugador es de 1.7 bloques de alto, así que necesitamos verificar desde y hasta y+1
	var hasEnoughVerticalSpace = function( x, z ) {
		// Verificar desde los pies hasta la cabeza (y hasta y+1, aproximadamente 2 bloques de altura)
		for ( var checkY = blockY; checkY <= blockY + 1; checkY++ ) {
			// Verificar un área de 2x2 bloques para cubrir el tamaño del jugador
			for ( var checkX = x; checkX <= x + 1; checkX++ ) {
				for ( var checkZ = z; checkZ <= z + 1; checkZ++ ) {
					var block = world.getBlock( checkX, checkY, checkZ );
					if ( block != BLOCK.AIR && !block.transparent ) {
						return false;
					}
				}
			}
		}
		return true;
	};
	
	// Norte (z - 1, horizontal)
	if ( hasEnoughVerticalSpace( blockX, blockZ - 1 ) ) {
		escapeDirections.push( { x: 0, z: -1, distance: Math.abs( pos.z - ( blockZ - 0.5 ) ) } );
	}
	
	// Sur (z + 1, horizontal)
	if ( hasEnoughVerticalSpace( blockX, blockZ + 1 ) ) {
		escapeDirections.push( { x: 0, z: 1, distance: Math.abs( pos.z - ( blockZ + 0.5 ) ) } );
	}
	
	// Este (x + 1)
	if ( hasEnoughVerticalSpace( blockX + 1, blockZ ) ) {
		escapeDirections.push( { x: 1, z: 0, distance: Math.abs( pos.x - ( blockX + 0.5 ) ) } );
	}
	
	// Oeste (x - 1)
	if ( hasEnoughVerticalSpace( blockX - 1, blockZ ) ) {
		escapeDirections.push( { x: -1, z: 0, distance: Math.abs( pos.x - ( blockX - 0.5 ) ) } );
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
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	var currentVelX = Math.abs( player.velocity.x );
	var currentVelZ = Math.abs( player.velocity.z ); // Z es horizontal
	
	if ( closestDirection.x != 0 ) {
		// Solo empujar en X si la velocidad actual es baja
		if ( currentVelX < 1.0 ) {
			player.velocity.x += closestDirection.x * pushSpeed;
		}
	}
	
	if ( closestDirection.z != 0 ) {
		// Solo empujar en Z si la velocidad actual es baja (Z es horizontal)
		if ( currentVelZ < 1.0 ) {
			player.velocity.z += closestDirection.z * pushSpeed;
		}
	}
	
	// Limitar la velocidad máxima para evitar movimientos bruscos
	var maxPushVelocity = 1.5; // Reducido de 2.0 a 1.5
	if ( Math.abs( player.velocity.x ) > maxPushVelocity ) {
		player.velocity.x = player.velocity.x > 0 ? maxPushVelocity : -maxPushVelocity;
	}
	if ( Math.abs( player.velocity.z ) > maxPushVelocity ) {
		player.velocity.z = player.velocity.z > 0 ? maxPushVelocity : -maxPushVelocity;
	}
}
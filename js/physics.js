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

// simulate(deltaTime)
//
// Perform one iteration of physics simulation.
// deltaTime: time elapsed since last frame in seconds

Physics.prototype.simulate = function(deltaTime)
{
	var world = this.world;
	var blocks = world.blocks;

	// Initialize accumulators if not set
	if (this.gravityAccumulator === undefined) this.gravityAccumulator = 0;
	if (this.fluidAccumulator === undefined) this.fluidAccumulator = 0;

	// Fixed time step for physics updates (120 Hz = ~8.33ms = 0.00833 seconds)
	// Increased from 60 Hz for more responsive and accurate physics
	var fixedTimeStep = 1/120; // 120 Hz physics updates
	
	// Gravity con animación suave
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// blocks[x][y][z] donde x=X, y=Y(altura), z=Z(horizontal)
	// Los bloques con gravedad caen hacia abajo (Y-1)
	this.gravityAccumulator += deltaTime;
	if (this.gravityAccumulator >= fixedTimeStep)
	{
		this.gravityAccumulator -= fixedTimeStep;
		// Primero, limpiar animaciones completadas
		for ( var key in this.fallingBlocks ) {
			var anim = this.fallingBlocks[key];
			// Initialize elapsedTime if not set
			if (anim.elapsedTime === undefined) anim.elapsedTime = 0;

			var gravity = 20;
			var fallDistance = anim.startY - anim.targetY;
			var currentFall = 0.5 * gravity * anim.elapsedTime * anim.elapsedTime;

			if ( currentFall >= fallDistance ) {
				// Animación completada, restaurar el bloque original en su nueva posición
				// El bloque animado ya estaba en anim.x, anim.startY, anim.z, ahora lo reemplazamos con AIR
				world.setBlock( anim.x, anim.startY, anim.z, BLOCK.AIR );
				// Mover el bloque original a su nueva posición (recuperar propiedades del original)
				world.setBlock( anim.x, anim.targetY, anim.z, anim.block );
				delete this.fallingBlocks[key];
			}
		}
		
		// OPTIMIZACIÓN: Solo procesar bloques en chunks cargados (no todo el mundo 256x256x256)
		// Esto reduce drásticamente el costo de la simulación de física
		var renderer = world.renderer;
		var loadedChunks = renderer && renderer.loadedChunks;
		
		// Si no hay chunks cargados o no hay renderer, no procesar física
		if ( !loadedChunks || loadedChunks.size === 0 ) return;
		
		// OPTIMIZACIÓN: Procesar chunks incrementalmente para distribuir la carga
		// Procesar solo algunos chunks por frame para evitar picos de latencia
		if ( !this._physicsChunkIndex ) this._physicsChunkIndex = 0;
		var chunksArray = Array.from(loadedChunks);
		var maxChunksPerFrame = Math.max(1, Math.ceil(chunksArray.length / 4)); // Procesar 1/4 de chunks por frame
		var startIndex = this._physicsChunkIndex;
		var endIndex = Math.min(startIndex + maxChunksPerFrame, chunksArray.length);
		this._physicsChunkIndex = endIndex >= chunksArray.length ? 0 : endIndex;
		
		// Procesar solo bloques en chunks cargados
		var chunkSize = renderer.chunkSize || 8;
		var processedCoords = {}; // Evitar procesar el mismo bloque múltiples veces
		
		// OPTIMIZACIÓN: Limitar altura de búsqueda para bloques con gravedad
		// La mayoría de bloques con gravedad están cerca de la superficie, no a 256 bloques de altura
		var maxGravitySearchY = Math.min(world.sy - 1, 128); // Solo buscar hasta altura 128
		
		for ( var chunkIdx = startIndex; chunkIdx < endIndex; chunkIdx++ ) {
			var chunkKey = chunksArray[chunkIdx];
			// Parsear chunk key: "cx|cz|cy"
			var parts = chunkKey.split('|');
			var cx = parseInt(parts[0]);
			var cz = parseInt(parts[1]);
			
			// Calcular rango de bloques para este chunk
			var startX = cx * chunkSize;
			var startZ = cz * chunkSize;
			var endX = Math.min(world.sx, startX + chunkSize);
			var endZ = Math.min(world.sz, startZ + chunkSize);
			
			for ( var x = startX; x < endX; x++ ) {
				if ( !blocks[x] ) continue;
				
				for ( var z = startZ; z < endZ; z++ ) {
					// OPTIMIZACIÓN: Iterar solo desde una altura razonable hacia abajo
					// La mayoría de bloques con gravedad están cerca de la superficie
					var searchStartY = Math.min(maxGravitySearchY, world.sy - 1);
					for ( var y = searchStartY; y > 0; y-- ) {
						// OPTIMIZACIÓN: Verificar acceso directo a blocks antes de getBlock
						if ( !blocks[x] || !blocks[x][y] || !blocks[x][y][z] ) {
							// Si no hay bloque, saltar rápidamente
							if ( y < 10 ) break; // Si estamos bajo y no hay bloques, no hay más abajo
							continue;
						}
						
						// Acceso directo al bloque (más rápido que getBlock)
						var block = blocks[x][y][z];
						if ( !block || !block.gravity ) continue;
						
						// Verificar que el bloque de abajo es AIR (acceso directo)
						if ( y > 0 ) {
							if ( blocks[x][y-1] && blocks[x][y-1][z] && blocks[x][y-1][z] !== BLOCK.AIR ) {
								continue; // Bloque de abajo no es AIR
							}
						}
						
						// Verificar si este bloque ya está en animación
						var animKey = x + "," + y + "," + z;
						if ( this.fallingBlocks[animKey] ) {
							continue; // Ya está cayendo, no hacer nada
						}
						
						// OPTIMIZACIÓN: Calcular distancia de caída con límite razonable
						var fallDistance = 1;
						var maxFallCheck = Math.max(0, y - 32); // Limitar búsqueda a 32 bloques hacia abajo
						for ( var checkY = y - 1; checkY >= maxFallCheck; checkY-- ) {
							// Acceso directo (más rápido)
							if ( !blocks[x] || !blocks[x][checkY] || !blocks[x][checkY][z] || blocks[x][checkY][z] === BLOCK.AIR ) {
								fallDistance = y - checkY;
							} else {
								break; // Encontramos un bloque sólido
							}
						}
						
						// Crear animación suave con física realista
						// Usar aceleración gravitacional constante: g = 20 bloques/seg²
						// Tiempo de caída: t = sqrt(2 * h / g), donde h = fallDistance
						var gravity = 20; // Aceleración gravitacional en bloques/seg²
						var duration = Math.sqrt(2 * fallDistance / gravity) * 1000; // Convertir a ms
						// Limitar duración máxima a 1 segundo para caídas muy largas
						if ( duration > 1000 ) duration = 1000;
						
						// Crear un bloque animado con las propiedades del bloque original
						// Este bloque animado mantendrá las propiedades del original para recuperarlas después
						var animatedBlock = BLOCK.createAnimatedBlock( block );
						
						// Reemplazar temporalmente el bloque original por el bloque animado en el array del mundo
						// Esto permite que el bloque animado "tome el lugar" del bloque original durante la animación
						world.setBlock( x, y, z, animatedBlock );
						
						// Crear la animación
						this.fallingBlocks[animKey] = {
							x: x,
							y: y, // Posición actual (se actualizará visualmente)
							z: z,
							startY: y,
							targetY: y - fallDistance,
							block: block, // Bloque original (para recuperar propiedades después)
							animatedBlock: animatedBlock // Bloque animado (ya está en el array del mundo)
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
	this.fluidAccumulator += deltaTime;
	if (this.fluidAccumulator >= fixedTimeStep * 60) // Update fluids every 60 physics steps (every 1 second at 60 Hz)
	{
		this.fluidAccumulator -= fixedTimeStep * 60;
		// OPTIMIZACIÓN: Solo procesar fluidos en chunks cargados
		var renderer = world.renderer;
		var loadedChunks = renderer && renderer.loadedChunks;
		
		// Si no hay chunks cargados, no procesar fluidos
		if ( !loadedChunks || loadedChunks.size === 0 ) return;
		
		// Newly spawned fluid blocks are stored so that those aren't
		// updated in the same step, creating a simulation avalanche.
		var newFluidBlocks = {};
		
		// OPTIMIZACIÓN: Solo procesar fluidos en chunks cargados
		var chunkSize = renderer.chunkSize || 8;
		var chunksArray = Array.from(loadedChunks);
		
		for ( var chunkIdx = 0; chunkIdx < chunksArray.length; chunkIdx++ ) {
			var chunkKey = chunksArray[chunkIdx];
			var parts = chunkKey.split('|');
			var cx = parseInt(parts[0]);
			var cz = parseInt(parts[1]);
			
			var startX = cx * chunkSize;
			var startZ = cz * chunkSize;
			var endX = Math.min(world.sx, startX + chunkSize);
			var endZ = Math.min(world.sz, startZ + chunkSize);
			
			// Iterar de arriba hacia abajo para que los fluidos caigan correctamente
			for ( var x = startX; x < endX; x++ ) {
				if ( !blocks[x] ) continue;
				for ( var z = startZ; z < endZ; z++ ) { // Z es horizontal
					// OPTIMIZACIÓN: Limitar altura de búsqueda de fluidos
					var maxFluidSearchY = Math.min(world.sy - 1, 128);
					for ( var y = maxFluidSearchY; y >= 0; y-- ) { // Y es altura, iterar de arriba hacia abajo
						// OPTIMIZACIÓN: Acceso directo a blocks en lugar de getBlock
						if ( !blocks[x] || !blocks[x][y] || !blocks[x][y][z] ) continue;
						var material = blocks[x][y][z];
						if ( !material || !material.fluid || newFluidBlocks[x+","+y+","+z] != null ) continue;
					
					// Primero, caer hacia abajo (Y-1)
					if ( y > 0 ) {
						// OPTIMIZACIÓN: Acceso directo
						var blockBelow = (blocks[x] && blocks[x][y-1] && blocks[x][y-1][z]) || BLOCK.AIR;
						if ( blockBelow == BLOCK.AIR ) {
							world.setBlock( x, y - 1, z, material );
							newFluidBlocks[x+","+(y-1)+","+z] = true;
							continue; // Ya se movió hacia abajo, no extender horizontalmente
						}
					}
					
					// Luego, extenderse horizontalmente (X±1, Z±1)
					if ( x > 0 ) {
						var blockLeft = (blocks[x-1] && blocks[x-1][y] && blocks[x-1][y][z]) || BLOCK.AIR;
						if ( blockLeft == BLOCK.AIR ) {
							world.setBlock( x - 1, y, z, material );
							newFluidBlocks[(x-1)+","+y+","+z] = true;
						}
					}
					if ( x < world.sx - 1 ) {
						var blockRight = (blocks[x+1] && blocks[x+1][y] && blocks[x+1][y][z]) || BLOCK.AIR;
						if ( blockRight == BLOCK.AIR ) {
							world.setBlock( x + 1, y, z, material );
							newFluidBlocks[(x+1)+","+y+","+z] = true;
						}
					}
					if ( z > 0 ) {
						var blockBack = (blocks[x] && blocks[x][y] && blocks[x][y][z-1]) || BLOCK.AIR;
						if ( blockBack == BLOCK.AIR ) {
							world.setBlock( x, y, z - 1, material );
							newFluidBlocks[x+","+y+","+(z-1)] = true;
						}
					}
					if ( z < world.sz - 1 ) {
						var blockFront = (blocks[x] && blocks[x][y] && blocks[x][y][z+1]) || BLOCK.AIR;
						if ( blockFront == BLOCK.AIR ) {
							world.setBlock( x, y, z + 1, material );
							newFluidBlocks[x+","+y+","+(z+1)] = true;
						}
					}
					}
				}
			}
		}
	}
};

// updateAnimations(deltaTime)
//
// Actualiza las animaciones de bloques en caída cada frame.
// Debe llamarse cada frame para obtener las posiciones interpoladas actuales.
// deltaTime: tiempo transcurrido desde el último frame en segundos

Physics.prototype.updateAnimations = function(deltaTime)
{
	// Initialize animation time accumulator if not set
	if (this.animationTimeAccumulator === undefined) this.animationTimeAccumulator = 0;

	// Accumulate time for smooth animations
	this.animationTimeAccumulator += deltaTime;

	var updatedAnimations = {};

	for ( var key in this.fallingBlocks ) {
		var anim = this.fallingBlocks[key];

		// Initialize animation elapsed time if not set
		if (anim.elapsedTime === undefined) anim.elapsedTime = 0;

		// Accumulate time for this animation
		anim.elapsedTime += deltaTime;

		// Usar física real: posición = 0.5 * g * t^2
		var gravity = 20; // Aceleración gravitacional en bloques/seg²
		var fallDistance = anim.startY - anim.targetY;
		var currentFall = 0.5 * gravity * anim.elapsedTime * anim.elapsedTime;

		// Asegurar que no exceda la distancia total
		if (currentFall > fallDistance) {
			currentFall = fallDistance;
		}

		// Calcular posición Y actual
		var currentY = anim.startY - currentFall;

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
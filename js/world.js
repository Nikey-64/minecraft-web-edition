// ==========================================
// World container
//
// This class contains the elements that make up the game world.
// Other modules retrieve information from the world or alter it
// using this class.
// ==========================================

// Constructor( sx, sy, sz )
//
// Creates a new world container with the specified world size.
// Up and down should always be aligned with the Z-direction.
//
// sx - World size in the X-direction.
// sy - World size in the Y-direction.
// sz - World size in the Z-direction.

function World( sx, sy, sz )
{
	// DO NOT initialize the entire world array in memory!
	// Instead, use lazy initialization - only create arrays when needed
	// This prevents loading entire worlds (e.g., 256x256x256) into RAM
	this.blocks = new Array( sx ); // Only create the first dimension
	// Don't initialize blocks[x][y][z] - they will be created on demand
	this.sx = sx;
	this.sy = sy;
	this.sz = sz;
	
	this.players = {};
	
	// Entity system
	this.entities = {}; // id -> Entity
	this.entityUpdateInterval = null; // For entity update loop
	this.lastEntityUpdate = 0;
	
	// Tamaño de chunks: 8x8x256 (8x8 horizontal, 256 vertical completo)
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// Esto optimiza el almacenamiento de aire ya que cada chunk cubre toda la altura
	this.chunkSize = 8; // Tamaño horizontal (X, Z)
	this.chunkSizeY = 256; // Tamaño vertical (Y) - cubre toda la altura del mundo
	this.chunkStates = {};
	
	// World ID for IndexedDB storage
	this.worldId = null; // Set when world is loaded/created
	this.flatHeight = 4; // Default flat world height (can be set from world metadata)
	
	// Terrain generator (Perlin noise)
	this.terrainGenerator = null; // Se inicializa cuando se crea el mundo
	this.usePerlinTerrain = false; // Flag para usar terreno Perlin o plano
	
	// Cache for chunks loaded from IndexedDB (since readChunkFromStorage is synchronous)
	// Key: chunk key, Value: chunk data string or null (if checked and not found)
	this.indexedDBCache = {};
	
	// Pending IndexedDB loads: chunks that are being loaded asynchronously
	// Key: chunk key, Value: true (loading in progress)
	this.pendingIndexedDBLoads = {};
}

// createFlatWorld()
//
// Sets up the world so that the bottom half is filled with dirt
// and the top half with air.

World.prototype.createFlatWorld = function( height )
{
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// spawn = [x, y, z] donde y es altura
	// blocks[x][y][z] donde x=X, y=Y(altura), z=Z(horizontal)
	this.spawn = new Vector( this.sx / 2 + 0.5, height, this.sz / 2 + 0.5 );
	
	// DO NOT generate the entire world here!
	// Terrain will be generated on-demand when chunks are loaded via ensureChunkLoaded
	// This prevents loading huge worlds (e.g., 256x256x256 = 16M blocks) into RAM
	this.flatHeight = height;
	this.usePerlinTerrain = false;
	this.terrainGenerator = null;
}

// createPerlinWorld()
//
// Configura el mundo para usar generación de terreno con ruido Perlin
//
// seed - Semilla para el generador (opcional, se genera aleatoria si no se proporciona)
// options - Opciones de configuración del terreno:
//   - baseHeight: Altura base del terreno (default: 64)
//   - heightVariation: Variación de altura (default: 32)
//   - noiseScale: Escala del ruido (default: 0.05)
//   - octaves: Número de octavas (default: 6)
//   - persistence: Persistencia del ruido (default: 0.5)

World.prototype.createPerlinWorld = function( seed, options )
{
	// Crear generador de terreno con ruido Perlin
	if (typeof TerrainGenerator === "undefined") {
		console.error("TerrainGenerator no está disponible. Asegúrate de que perlin.js esté cargado.");
		// Fallback a terreno plano
		this.createFlatWorld(64);
		return;
	}
	
	// Usar semilla aleatoria si no se proporciona
	if (seed === undefined || seed === null) {
		seed = Math.floor(Math.random() * 2147483647);
	}
	
	this.terrainGenerator = new TerrainGenerator(seed, options);
	this.usePerlinTerrain = true;
	
	// Calcular altura de spawn basada en el centro del mapa
	// Buscar una posición válida para el spawn (sobre el terreno, en aire)
	var spawnX = this.sx / 2;
	var spawnZ = this.sz / 2;
	var spawnHeight = this.terrainGenerator.getHeightAt(spawnX, spawnZ);
	
	// Asegurar que el spawn esté al menos 2 bloques por encima del terreno
	// y verificar que haya espacio suficiente (el jugador tiene ~2 bloques de altura)
	var spawnY = spawnHeight + 3; // 3 bloques por encima del terreno para estar seguro
	
	// Verificar que la posición de spawn esté dentro de los límites del mundo
	if (spawnY < 0) spawnY = 1;
	if (spawnY >= this.sy) spawnY = this.sy - 1;
	
	this.spawn = new Vector( spawnX + 0.5, spawnY, spawnZ + 0.5 );
	
	console.log("Mundo Perlin creado con semilla:", seed);
	console.log("Altura del terreno en spawn:", spawnHeight, "Spawn Y:", spawnY);
}

// createFromString( str )
//
// Creates a world from a string representation.
// This is the opposite of toNetworkString().
//
// NOTE: The world must have already been created
// with the appropriate size!

World.prototype.createFromString = function( str )
{
	var i = 0;

	for ( var x = 0; x < this.sx; x++ ) {
		for ( var y = 0; y < this.sy; y++ ) {
			for ( var z = 0; z < this.sz; z++ ) {
				this.blocks[x][y][z] = BLOCK.fromId( str.charCodeAt( i ) - 97 );
				i = i + 1;
			}
		}
	}
}

// createChunkFromString( cx, cy, cz, str )
//
// Creates a chunk from a string representation.
// Assumes chunk size is 16x16x16 and world size is multiple of 16.
//
// cx, cy, cz - Chunk coordinates.
// str - String representation of the chunk.

World.prototype.createChunkFromString = function( cx, cz, cy, str )
{
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// cx, cz = coordenadas horizontales, cy = siempre 0 (un solo chunk vertical)
	var i = 0;
	var chunkSize = this.chunkSize || 8;
	var chunkSizeY = this.chunkSizeY || 256;

	for ( var x = cx * chunkSize; x < (cx + 1) * chunkSize; x++ ) {
		for ( var z = cz * chunkSize; z < (cz + 1) * chunkSize; z++ ) {
			for ( var y = cy * chunkSizeY; y < (cy + 1) * chunkSizeY; y++ ) {
				if ( i >= str.length ) return;
				this.blocks[x][y][z] = BLOCK.fromId( str.charCodeAt( i ) - 97 );
				i = i + 1;
			}
		}
	}
}

// toChunkString( cx, cy, cz, chunkSize )
//
// Returns a string representation of the chunk at (cx, cy, cz).

World.prototype.toChunkString = function( cx, cz, cy, chunkSize, chunkSizeY )
{
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// cx, cz = coordenadas horizontales, cy = siempre 0 (un solo chunk vertical)
	// Estructura del array: blocks[x][y][z] donde x=X, y=Y (altura), z=Z
	var blockArray = [];
	var sizeX = chunkSize || this.chunkSize;
	var sizeZ = chunkSize || this.chunkSize;
	var sizeY = chunkSizeY || this.chunkSizeY;
	for ( var x = cx * sizeX; x < (cx + 1) * sizeX; x++ )
	{
		// Verificar límites y que el array existe
		if ( x < 0 || x >= this.sx || !this.blocks[x] ) {
			// Rellenar con AIR si está fuera de límites
			for ( var z = cz * sizeZ; z < (cz + 1) * sizeZ; z++ )
				for ( var y = cy * sizeY; y < (cy + 1) * sizeY; y++ )
					blockArray.push( String.fromCharCode( 97 + BLOCK.AIR.id ) );
			continue;
		}
		
		for ( var z = cz * sizeZ; z < (cz + 1) * sizeZ; z++ )
		{
			for ( var y = cy * sizeY; y < (cy + 1) * sizeY; y++ )
			{
				// Verificar límites y que el bloque existe
				// Estructura: blocks[x][y][z]
				if ( y < 0 || y >= this.sy || z < 0 || z >= this.sz ) {
					blockArray.push( String.fromCharCode( 97 + BLOCK.AIR.id ) );
				} else if ( !this.blocks[x][y] || !this.blocks[x][y][z] ) {
					blockArray.push( String.fromCharCode( 97 + BLOCK.AIR.id ) );
				} else {
					blockArray.push( String.fromCharCode( 97 + this.blocks[x][y][z].id ) );
				}
			}
		}
	}
	
	return blockArray.join( "" );
}

// getBlock( x, y, z )
//
// Get the type of the block at the specified position.
// Mostly for neatness, since accessing the array
// directly is easier and faster.

World.prototype.getBlock = function( x, y, z )
{
	if ( x < 0 || y < 0 || z < 0 || x > this.sx - 1 || y > this.sy - 1 || z > this.sz - 1 ) return BLOCK.AIR;
	if ( !this.blocks[x] || !this.blocks[x][y] || this.blocks[x][y][z] === undefined ) return BLOCK.AIR;
	return this.blocks[x][y][z];
}

// setBlock( x, y, z )

World.prototype.setBlock = function( x, y, z, type )
{
	// Verificar límites
	if ( x < 0 || y < 0 || z < 0 || x >= this.sx || y >= this.sy || z >= this.sz ) return;
	
	// Asegurarse de que los arrays existen
	if ( !this.blocks[x] ) {
		this.blocks[x] = new Array( this.sy );
	}
	if ( !this.blocks[x][y] ) {
		this.blocks[x][y] = new Array( this.sz );
	}
	
	// Ahora podemos asignar de forma segura
	this.blocks[x][y][z] = type;
	if ( this.renderer != null ) this.renderer.onBlockChanged( x, y, z );
}

World.prototype.setChunking = function( chunkSize, chunkSizeY )
{
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	if ( chunkSize ) this.chunkSize = chunkSize;
	if ( chunkSizeY !== undefined ) this.chunkSizeY = chunkSizeY;
	else if ( !this.chunkSizeY ) this.chunkSizeY = 256; // Default: cubrir toda la altura
	if ( !this.chunkStates ) this.chunkStates = {};
}

World.prototype.getChunkKeyFromCoords = function( x, y, z )
{
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// Retorna clave como "cx|cz|cy" donde cy siempre es 0 (un solo chunk vertical)
	var cx = Math.floor( x / this.chunkSize );
	var cz = Math.floor( z / this.chunkSize );
	var cy = 0; // Siempre 0 porque solo hay un chunk vertical (cubre toda la altura Y)
	return cx + "|" + cz + "|" + cy;
}

World.prototype.getChunkKeyFromChunk = function( chunk )
{
	return this.getChunkKeyFromCoords( chunk.start[0], chunk.start[1], chunk.start[2] );
}

World.prototype.ensureChunkLoaded = function( chunk, chunkSize, chunkSizeY )
{
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	if ( !chunk ) return;
	var size = chunkSize || this.chunkSize;
	var sizeY = chunkSizeY || this.chunkSizeY;
	var key = this.getChunkKeyFromChunk( chunk );
	
	// Verificar si el chunk está realmente cargado en memoria
	// No confiar solo en chunkStates porque puede estar desactualizado después de unloadChunk
	var isActuallyLoaded = false;
	if ( chunk.start && this.blocks ) {
		var startX = chunk.start[0];
		var startZ = chunk.start[2];
		var startY = 0;
		// Verificar si hay bloques en memoria para este chunk
		if ( this.blocks[startX] && this.blocks[startX][startY] && this.blocks[startX][startY][startZ] !== undefined ) {
			isActuallyLoaded = true;
		}
	}
	
	// Solo retornar temprano si está marcado como loaded Y realmente tiene datos en memoria
	if ( this.chunkStates && this.chunkStates[key] === "loaded" && isActuallyLoaded ) return;
	
	// Intentar cargar desde storage
	var data = this.readChunkFromStorage( key );
	
	// Si hay una carga pendiente de IndexedDB, esperar antes de generar
	if ( !data && this.pendingIndexedDBLoads && this.pendingIndexedDBLoads[key] ) {
		// Chunk está cargando de IndexedDB, verificar si ya terminó
		// Si ya está en cache después de la carga, usarlo
		if ( this.indexedDBCache[key] !== undefined ) {
			data = this.indexedDBCache[key];
		} else {
			// Todavía cargando, no generar todavía - se reintentará cuando IndexedDB termine
			// El callback de IndexedDB aplicará los datos o generará el chunk si no existe
			return;
		}
	}
	
	if ( data )
	{
		this.applyChunkString( chunk.start, size, sizeY, data );
		// Marcar chunk como "clean" ya que se cargó desde almacenamiento (no modificado)
		chunk.dirty = false;
		if ( chunk.needsSave !== undefined ) {
			chunk.needsSave = false;
		}
		if ( !this.chunkStates ) this.chunkStates = {};
		this.chunkStates[key] = "loaded";
	}
	else
	{
		// Si no hay datos y no hay una carga pendiente, generar el chunk INMEDIATAMENTE
		// Esto evita huecos cuando el chunk no existe en IndexedDB
		if ( !this.pendingIndexedDBLoads || !this.pendingIndexedDBLoads[key] ) {
			// No hay carga pendiente - generar el chunk ahora usando la misma estructura que generateAndSaveAllChunks
			console.log("Chunk not in cache, generating immediately:", key);
			var flatHeight = this.flatHeight || 4;
			
			// Usar la misma estructura de arrays que generateAndSaveAllChunks
			// IMPORTANTE: blocks[x][y][z] donde x=X, y=Y(altura), z=Z(horizontal)
			var startX = chunk.start[0];
			var startZ = chunk.start[2];
			var startY = 0;
			var endX = Math.min( this.sx, startX + size );
			var endZ = Math.min( this.sz, startZ + size );
			var endY = Math.min( this.sy, startY + sizeY );
			
			for ( var x = startX; x < endX; x++ ) {
				if ( x < 0 ) continue;
				if ( !this.blocks[x] ) {
					this.blocks[x] = new Array( this.sy );
				}
				for ( var z = startZ; z < endZ; z++ ) {
					if ( z < 0 ) continue;
					for ( var y = startY; y < endY; y++ ) {
						if ( !this.blocks[x][y] ) {
							this.blocks[x][y] = new Array( this.sz );
						}
					// Generar terreno (Perlin o plano)
					var blockType;
					if (this.usePerlinTerrain && this.terrainGenerator) {
						blockType = this.terrainGenerator.getBlockAt(x, y, z);
					} else {
						// Terreno plano
						if ( y >= flatHeight ) {
							blockType = BLOCK.AIR;
						} else if ( y === flatHeight - 1 ) {
							blockType = BLOCK.GRASS;
						} else {
							blockType = BLOCK.DIRT;
						}
					}
					this.blocks[x][y][z] = blockType;
					}
				}
			}
			
			if ( !this.chunkStates ) this.chunkStates = {};
			this.chunkStates[key] = "loaded";
			chunk.dirty = true; // Marcar para reconstruir
			if ( chunk.needsSave !== undefined ) {
				chunk.needsSave = true; // Marcar para guardar
			}
		} else {
			// Hay una carga pendiente - esperar a que IndexedDB termine
			// PERO si IndexedDB retorna null, se generará en el callback
			console.log("Chunk loading from IndexedDB, waiting:", key);
			return; // Esperar a que IndexedDB termine
		}
	}
}

// generateAndSaveAllChunks()
//
// Genera todos los chunks base (flatworld) y los guarda en IndexedDB.
// Esto se hace una sola vez al crear el mundo.
// Los chunks modificados sobrescribirán estos chunks base más tarde.

World.prototype.generateAndSaveAllChunks = function()
{
	if ( !this.worldId || typeof worldManager === "undefined" || !worldManager ) {
		console.warn("Cannot generate chunks: worldId or worldManager not available");
		return Promise.resolve();
	}
	
	var self = this;
	var chunkSize = this.chunkSize || 8;
	var chunkSizeY = this.chunkSizeY || 256;
	var flatHeight = this.flatHeight || 4;
	
	console.log("Generating all base chunks for world:", this.worldId, "size:", this.sx, "x", this.sy, "x", this.sz);
	
	// Calcular número total de chunks
	var numChunksX = Math.ceil( this.sx / chunkSize );
	var numChunksZ = Math.ceil( this.sz / chunkSize );
	var totalChunks = numChunksX * numChunksZ;
	var savedChunks = 0;
	
	// Función para generar y guardar un chunk
	function generateAndSaveChunk( cx, cz ) {
		var startX = cx * chunkSize;
		var startZ = cz * chunkSize;
		var startY = 0; // Y siempre empieza en 0 (altura)
		var endX = Math.min( self.sx, startX + chunkSize );
		var endZ = Math.min( self.sz, startZ + chunkSize );
		var endY = Math.min( self.sy, startY + chunkSizeY );
		
		// Generar bloques del chunk
		// IMPORTANTE: blocks[x][y][z] donde x=X, y=Y(altura), z=Z(horizontal)
		for ( var x = startX; x < endX; x++ ) {
			if ( !self.blocks[x] ) {
				self.blocks[x] = new Array( self.sy );
			}
			for ( var z = startZ; z < endZ; z++ ) {
				for ( var y = startY; y < endY; y++ ) {
					if ( !self.blocks[x][y] ) {
						self.blocks[x][y] = new Array( self.sz );
					}
					// Generar terreno (Perlin o plano)
					var blockType;
					if (self.usePerlinTerrain && self.terrainGenerator) {
						blockType = self.terrainGenerator.getBlockAt(x, y, z);
					} else {
						// Terreno plano
						if ( y >= flatHeight ) {
							blockType = BLOCK.AIR;
						} else if ( y === flatHeight - 1 ) {
							blockType = BLOCK.GRASS;
						} else {
							blockType = BLOCK.DIRT;
						}
					}
					self.blocks[x][y][z] = blockType;
				}
			}
		}
		
		// Serializar chunk
		var cy = 0; // Siempre 0
		var key = cx + "|" + cz + "|" + cy;
		var serialized = self.toChunkString( cx, cz, cy, chunkSize, chunkSizeY );
		
		// Guardar en IndexedDB
		return worldManager.saveChunk( self.worldId, key, serialized ).then(function() {
			savedChunks++;
			if ( savedChunks % 10 === 0 || savedChunks === totalChunks ) {
				console.log("Saved", savedChunks, "of", totalChunks, "chunks");
			}
		}).catch(function(e) {
			console.error("Failed to save chunk", key, ":", e);
		});
	}
	
	// Generar y guardar todos los chunks (en lotes para no bloquear)
	var promises = [];
	for ( var cx = 0; cx < numChunksX; cx++ ) {
		for ( var cz = 0; cz < numChunksZ; cz++ ) {
			promises.push( generateAndSaveChunk( cx, cz ) );
		}
	}
	
	console.log("Generating and saving", totalChunks, "chunks...");
	return Promise.all( promises ).then(function() {
		console.log("All base chunks generated and saved!");
		// Limpiar bloques de memoria después de guardar
		self.blocks = new Array( self.sx );
	}).catch(function(e) {
		console.error("Error generating chunks:", e);
	});
}

World.prototype.persistChunk = function( chunk, chunkSize, chunkSizeY, forceSave )
{
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	if ( !chunk ) return Promise.resolve();
	var size = chunkSize || this.chunkSize;
	var sizeY = chunkSizeY || this.chunkSizeY;
	var key = this.getChunkKeyFromChunk( chunk );
	
	// Asegurarse de que needsSave esté inicializado
	if ( chunk.needsSave === undefined ) {
		chunk.needsSave = false;
	}
	
	// Solo guardar chunks que han sido modificados (needsSave = true)
	// forceSave solo se usa al salir del mundo
	if ( !forceSave && !chunk.needsSave ) {
		return Promise.resolve();
	}
	
	// chunk.start = [x, y, z] donde y es altura
	var cx = Math.floor( chunk.start[0] / size );
	var cz = Math.floor( chunk.start[2] / size );
	var cy = 0; // Siempre 0
	var serialized = this.toChunkString( cx, cz, cy, size, sizeY );
	
	// Verificar que haya worldId y worldManager
	if ( !this.worldId || typeof worldManager === "undefined" || !worldManager ) {
		console.warn("Cannot save chunk: worldId or worldManager not available", key);
		return Promise.resolve();
	}
	
	// Actualizar cache
	this.indexedDBCache[key] = serialized;
	
	var self = this;
	
	// Retornar la promesa de guardado
	return worldManager.saveChunk(this.worldId, key, serialized).then(function() {
		if ( !self.chunkStates ) self.chunkStates = {};
		self.chunkStates[key] = "stored";
		chunk.needsSave = false;
		console.log("Chunk saved:", key);
	}).catch(function(e) {
		console.error("Failed to save chunk:", key, e);
	});
}

// saveAllLoadedChunks()
//
// Guarda todos los chunks modificados antes de salir del mundo.
// Retorna una promesa que se resuelve cuando todos los chunks se hayan guardado.
// IMPORTANTE: Este es el ÚNICO momento en que se guardan los chunks.

World.prototype.saveAllLoadedChunks = function()
{
	if ( !this.renderer || !this.renderer.chunks ) {
		console.warn("Cannot save chunks: renderer or chunks not available");
		return Promise.resolve(0);
	}
	
	var chunks = this.renderer.chunks;
	var chunksToSave = [];
	
	// Identificar TODOS los chunks que necesitan guardarse (cargados o no)
	// Un chunk puede estar descargado visualmente pero tener datos modificados en RAM
	for ( var i = 0; i < chunks.length; i++ ) {
		var chunk = chunks[i];
		if ( !chunk ) continue;
		
		// Inicializar needsSave si no existe
		if ( chunk.needsSave === undefined ) {
			chunk.needsSave = false;
		}
		
		// Guardar cualquier chunk que haya sido modificado
		if ( chunk.needsSave ) {
			chunksToSave.push(chunk);
		}
	}
	
	console.log("Found " + chunksToSave.length + " modified chunks to save");
	
	if ( chunksToSave.length === 0 ) {
		return Promise.resolve(0);
	}
	
	// Guardar todos los chunks en paralelo
	var self = this;
	var savePromises = chunksToSave.map(function(chunk) {
		return self.persistChunk( chunk, self.renderer.chunkSize, self.renderer.chunkSizeY, true );
	});
	
	return Promise.all(savePromises).then(function() {
		console.log("Saved " + chunksToSave.length + " modified chunks");
		return chunksToSave.length;
	}).catch(function(e) {
		console.error("Error saving chunks:", e);
		return 0;
	});
}

World.prototype.clearChunkInMemory = function( start, chunkSize, chunkSizeY )
{
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// start = [x, y, z] donde y es altura
	// IMPORTANTE: Eliminar completamente los arrays para liberar memoria
	// Solo limpiamos bloques que fueron modificados (no AIR por defecto)
	var sizeX = chunkSize || this.chunkSize;
	var sizeZ = chunkSize || this.chunkSize;
	var sizeY = chunkSizeY || this.chunkSizeY;
	
	for ( var x = start[0]; x < start[0] + sizeX && x < this.sx; x++ )
	{
		if ( !this.blocks[x] ) continue;
		
		for ( var z = start[2]; z < start[2] + sizeZ && z < this.sz; z++ )
		{
			for ( var y = start[1]; y < start[1] + sizeY && y < this.sy; y++ )
			{
				if ( this.blocks[x] && this.blocks[x][y] && this.blocks[x][y][z] !== undefined )
				{
					// Delete the block to free memory
					delete this.blocks[x][y][z];
				}
			}
			
			// Check if the Z column (all Y values for this X,Z) is empty
			if ( this.blocks[x] ) {
				var zColumnEmpty = true;
				for ( var y = start[1]; y < start[1] + sizeY && y < this.sy; y++ ) {
					if ( this.blocks[x][y] && this.blocks[x][y][z] !== undefined ) {
						zColumnEmpty = false;
						break;
					}
				}
				// If Z column is empty, we can delete the Y array for this Z
				// But we need to check if other Z values in this X column have data
			}
		}
		
		// Check if the entire X column is empty
		if ( this.blocks[x] ) {
			var xColumnEmpty = true;
			for ( var y = 0; y < this.sy; y++ ) {
				if ( !this.blocks[x][y] ) continue;
				for ( var z = 0; z < this.sz; z++ ) {
					if ( this.blocks[x][y][z] !== undefined ) {
						xColumnEmpty = false;
						break;
					}
				}
				if ( !xColumnEmpty ) break;
			}
			if ( xColumnEmpty ) {
				// Delete the entire X column
				delete this.blocks[x];
			}
		}
	}
}

World.prototype.applyChunkString = function( start, chunkSize, chunkSizeY, data )
{
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// start = [x, y, z] donde y es altura
	if ( !data ) return;
	var i = 0;
	var sizeX = chunkSize || this.chunkSize;
	var sizeZ = chunkSize || this.chunkSize;
	var sizeY = chunkSizeY || this.chunkSizeY;
	// Iterar en el mismo orden que toChunkString: x, z, y
	for ( var x = start[0]; x < start[0] + sizeX; x++ )
	{
		// Verificar límites
		if ( x < 0 || x >= this.sx ) {
			// Saltar bloques fuera de límites
			for ( var z = start[2]; z < start[2] + sizeZ; z++ )
				for ( var y = start[1]; y < start[1] + sizeY; y++ )
					i++;
			continue;
		}
		
		// Asegurarse de que blocks[x] existe
		if ( !this.blocks[x] ) {
			this.blocks[x] = new Array( this.sy );
		}
		
		for ( var z = start[2]; z < start[2] + sizeZ; z++ )
		{
			// Verificar límites
			if ( z < 0 || z >= this.sz ) {
				// Saltar bloques fuera de límites
				for ( var y = start[1]; y < start[1] + sizeY; y++ )
					i++;
				continue;
			}
			
			for ( var y = start[1]; y < start[1] + sizeY; y++ )
			{
				// Verificar límites
				if ( y < 0 || y >= this.sy ) {
					i++;
					continue;
				}
				
				if ( i >= data.length ) return;
				
				// Asegurarse de que blocks[x][y] existe
				if ( !this.blocks[x][y] ) {
					this.blocks[x][y] = new Array( this.sz );
				}
				
				// Ahora podemos asignar de forma segura
				this.blocks[x][y][z] = BLOCK.fromId( data.charCodeAt( i ) - 97 );
				i++;
			}
		}
	}
}

World.prototype.readChunkFromStorage = function( key )
{
	// PRIORIDAD: Intentar leer de IndexedDB cache primero (chunks cargados previamente)
	if ( this.indexedDBCache[key] ) {
		return this.indexedDBCache[key];
	}
	
	// Si no está en cache, intentar cargar de IndexedDB de forma asíncrona
	// IMPORTANTE: Retornar null por ahora, pero iniciar la carga asíncrona
	// El chunk se generará si no existe, o se aplicará cuando IndexedDB termine de cargar
	if ( this.worldId && typeof worldManager !== "undefined" && worldManager && !this.pendingIndexedDBLoads[key] ) {
		// Marcar como cargando para evitar múltiples solicitudes
		this.pendingIndexedDBLoads[key] = true;
		
		// Cargar de IndexedDB de forma asíncrona y cachear el resultado
		var self = this;
		worldManager.loadChunk(this.worldId, key).then(function(data) {
			delete self.pendingIndexedDBLoads[key];
			// Cachear el resultado (puede ser null si no existe)
			self.indexedDBCache[key] = data || null;
			
			// Si hay un renderer, aplicar los datos cuando IndexedDB termine de cargar
			if ( self.renderer && data ) {
				var chunk = self.renderer.chunkLookup[key];
				if ( chunk ) {
					// Aplicar los datos del chunk cargado desde IndexedDB
					// Esto sobrescribe cualquier generación previa
					var size = self.chunkSize || 8;
					var sizeY = self.chunkSizeY || 256;
					self.applyChunkString( chunk.start, size, sizeY, data );
					chunk.dirty = true; // Marcar para reconstruir
					if ( chunk.needsSave !== undefined ) {
						chunk.needsSave = false; // Chunk cargado desde storage, no modificado
					}
					console.log("Chunk loaded from IndexedDB and applied:", key);
					
					// Si el chunk no estaba cargado, cargarlo ahora
					if ( !chunk.loaded && self.renderer.loadChunk ) {
						self.renderer.loadChunk( chunk );
					}
				}
			} else if ( self.renderer && !data ) {
				// Chunk no existe en IndexedDB - generarlo INMEDIATAMENTE
				console.log("Chunk not found in IndexedDB, generating now:", key);
				var chunk = self.renderer.chunkLookup[key];
				if ( chunk ) {
					// Asegurar que no haya marca de carga pendiente para forzar generación inmediata
					if ( self.pendingIndexedDBLoads ) {
						delete self.pendingIndexedDBLoads[key];
					}
					// Generar inmediatamente (ensureChunkLoaded detectará que no hay datos ni carga pendiente)
					if ( self.ensureChunkLoaded ) {
						self.ensureChunkLoaded( chunk, self.chunkSize, self.chunkSizeY );
					}
				}
			}
		}).catch(function(e) {
			delete self.pendingIndexedDBLoads[key];
			// Marcar como no encontrado en cache
			self.indexedDBCache[key] = null;
			console.warn("Failed to load chunk from IndexedDB:", key, e);
		});
	}
	
	return null; // Chunk no encontrado en cache, se generará nuevo o se cargará desde IndexedDB
}

World.prototype.writeChunkToStorage = function( key, data )
{
	// Usar IndexedDB como único almacenamiento para chunks
	if ( !this.worldId || typeof worldManager === "undefined" || !worldManager ) {
		console.warn("Cannot save chunk: worldId or worldManager not available", key);
		return false;
	}
	
	// Actualizar cache cuando se guarda
	this.indexedDBCache[key] = data;
	
	// Guardar en IndexedDB (async, fire and forget)
	var self = this;
	console.log("Saving chunk to IndexedDB:", key, "worldId:", this.worldId, "data length:", data ? data.length : 0);
	worldManager.saveChunk(this.worldId, key, data).then(function() {
		// Chunk guardado exitosamente en IndexedDB
		console.log("Chunk saved successfully to IndexedDB:", key);
	}).catch(function(e) {
		console.error("Failed to save chunk to IndexedDB:", key, e);
		// Si falla IndexedDB, no hay fallback - el chunk se perderá
		// Esto es intencional para forzar el uso de IndexedDB
	});
	
	return true; // Consideramos que se guardó exitosamente en IndexedDB
}

// toNetworkString()
//
// Returns a string representation of this world.

World.prototype.toNetworkString = function()
{
	var blockArray = [];
	
	for ( var x = 0; x < this.sx; x++ )
		for ( var y = 0; y < this.sy; y++ )
			for ( var z = 0; z < this.sz; z++ )
				blockArray.push( String.fromCharCode( 97 + this.blocks[x][y][z].id ) );
	
	return blockArray.join( "" );
}

// Entity Management Methods

// addEntity( entity )
//
// Adds an entity to the world.

World.prototype.addEntity = function(entity) {
	if (!entity || !entity.id) {
		console.warn("Cannot add entity without id");
		return false;
	}
	
	entity.world = this;
	this.entities[entity.id] = entity;
	
	// Start entity update loop if not already running
	if (!this.entityUpdateInterval && typeof window !== 'undefined') {
		this.startEntityUpdateLoop();
	}
	
	return true;
};

// removeEntity( entityId )
//
// Removes an entity from the world.

World.prototype.removeEntity = function(entityId) {
	if (this.entities[entityId]) {
		delete this.entities[entityId];
		return true;
	}
	return false;
};

// getEntity( entityId )
//
// Gets an entity by ID.

World.prototype.getEntity = function(entityId) {
	return this.entities[entityId] || null;
};

// getAllEntities()
//
// Gets all entities in the world.

World.prototype.getAllEntities = function() {
	var all = [];
	for (var id in this.entities) {
		if (this.entities.hasOwnProperty(id)) {
			all.push(this.entities[id]);
		}
	}
	return all;
};

// getEntitiesInRange( pos, radius )
//
// Gets all entities within a certain radius of a position.

World.prototype.getEntitiesInRange = function(pos, radius) {
	var entities = [];
	var radiusSq = radius * radius;
	
	for (var id in this.entities) {
		if (this.entities.hasOwnProperty(id)) {
			var entity = this.entities[id];
			var dx = entity.pos.x - pos.x;
			var dy = entity.pos.y - pos.y;
			var dz = entity.pos.z - pos.z;
			var distSq = dx * dx + dy * dy + dz * dz;
			
			if (distSq <= radiusSq) {
				entities.push(entity);
			}
		}
	}
	
	return entities;
};

// startEntityUpdateLoop()
//
// Starts the entity update loop (called every frame).

World.prototype.startEntityUpdateLoop = function() {
	// Check if already running using a proper flag
	if (this._entityLoopRunning) return;
	this._entityLoopRunning = true;
	
	var world = this;
	var lastTime = Date.now();
	
	function updateEntities() {
		// Check if loop was stopped
		if (!world._entityLoopRunning) return;
		
		var currentTime = Date.now();
		var deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
		lastTime = currentTime;
		
		// Cap delta time to prevent large jumps
		if (deltaTime > 0.1) deltaTime = 0.1;
		
		// Update all entities
		for (var id in world.entities) {
			if (world.entities.hasOwnProperty(id)) {
				var entity = world.entities[id];
				try {
					entity.update(deltaTime);
					
					// Remove dead entities
					if (entity.dead) {
						world.removeEntity(id);
					}
				} catch (e) {
					console.error("Error updating entity " + id + ":", e);
				}
			}
		}
		
		// Continue loop if there are entities and loop is still running
		if (world._entityLoopRunning && Object.keys(world.entities).length > 0) {
			requestAnimationFrame(updateEntities);
		} else {
			world._entityLoopRunning = false;
		}
	}
	
	// Start the loop
	requestAnimationFrame(updateEntities);
};

// stopEntityUpdateLoop()
//
// Stops the entity update loop.

World.prototype.stopEntityUpdateLoop = function() {
	this._entityLoopRunning = false;
};

// spawnMob( mobType, x, y, z )
//
// Spawns a mob at the specified position.

World.prototype.spawnMob = function(mobType, x, y, z) {
	if (typeof Mob === 'undefined') {
		console.warn("Mob class not loaded, cannot spawn mob");
		return null;
	}
	
	var mob = new Mob(null, mobType, this);
	mob.pos = new Vector(x, y, z);
	mob.spawnPos = new Vector(x, y, z);
	
	if (this.addEntity(mob)) {
		return mob;
	}
	
	return null;
};

// Export to node.js
if ( typeof( exports ) != "undefined" )
{
	// loadFromFile( filename )
	//
	// Load a world from a file previously saved with saveToFile().
	// The world must have already been allocated with the
	// appropriate dimensions.
	
	World.prototype.loadFromFile = function( filename )
	{
		var fs = require( "fs" );
		try {
			fs.lstatSync( filename );
			var data = fs.readFileSync( filename, "utf8" ).split( "," );
			this.createFromString( data[3] );
			this.spawn = new Vector( parseInt( data[0] ), parseInt( data[1] ), parseInt( data[2] ) );
			return true;
		} catch ( e ) {
			return false;
		}
	}
	
	// saveToFile( filename )
	//
	// Saves a world and the spawn point to a file.
	// The world can be loaded from it afterwards with loadFromFile().
	
	World.prototype.saveToFile = function( filename )
	{
		var data = this.spawn.x + "," + this.spawn.y + "," + this.spawn.z + "," + this.toNetworkString();
		require( "fs" ).writeFileSync( filename, data );	
	}
	
	exports.World = World;
}
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
	// Initialise world array
	this.blocks = new Array( sx );
	for ( var x = 0; x < sx; x++ )
	{
		this.blocks[x] = new Array( sy );
		for ( var y = 0; y < sy; y++ )
		{
			this.blocks[x][y] = new Array( sz );
		}
	}
	this.sx = sx;
	this.sy = sy;
	this.sz = sz;
	
	this.players = {};
	// Tamaño de chunks: 8x8x256 (8x8 horizontal, 256 vertical completo)
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// Esto optimiza el almacenamiento de aire ya que cada chunk cubre toda la altura
	this.chunkSize = 8; // Tamaño horizontal (X, Z)
	this.chunkSizeY = 256; // Tamaño vertical (Y) - cubre toda la altura del mundo
	this.chunkStates = {};
	this.chunkStoragePrefix = "minecraft_chunk_";
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
	
	for ( var x = 0; x < this.sx; x++ )
		for ( var z = 0; z < this.sz; z++ )
			for ( var y = 0; y < this.sy; y++ )
				this.blocks[x][y][z] = y < height ? BLOCK.DIRT : BLOCK.AIR;
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
	if ( this.chunkStates && this.chunkStates[key] === "loaded" ) return;
	
	// Intentar cargar desde storage
	var data = this.readChunkFromStorage( key );
	if ( data )
	{
		this.applyChunkString( chunk.start, size, sizeY, data );
	}
		else
		{
			// Si no está en storage, generar terreno usando createFlatWorld para esta región
			// O simplemente inicializar bloques como AIR (se generarán con terreno después)
			var startX = chunk.start[0];
			var startY = chunk.start[1]; // Y es vertical (altura)
			var startZ = chunk.start[2];
			var endX = Math.min( this.sx, startX + size );
			var endY = Math.min( this.sy, startY + sizeY ); // Y es vertical (altura)
			var endZ = Math.min( this.sz, startZ + size );
			
			// Inicializar bloques si no están inicializados
			// IMPORTANTE: Asegurarse de que todos los bloques del chunk estén inicializados
			// Ejes: X y Z = horizontal, Y = vertical (altura)
			// blocks[x][y][z] donde x=X, y=Y(altura), z=Z(horizontal)
			var flatHeight = 4; // Altura por defecto para terreno plano (en Y)
			for ( var x = startX; x < endX; x++ )
			{
				// Asegurarse de que el array existe
				if ( !this.blocks[x] ) {
					if ( x >= 0 && x < this.sx ) {
						this.blocks[x] = new Array( this.sy );
					} else {
						continue; // Fuera de límites
					}
				}
				
				for ( var z = startZ; z < endZ; z++ ) // Z es horizontal
				{
					for ( var y = startY; y < endY; y++ ) // Y es altura
					{
						// Asegurarse de que el array existe
						if ( !this.blocks[x][y] ) {
							if ( y >= 0 && y < this.sy ) {
								this.blocks[x][y] = new Array( this.sz );
							} else {
								continue; // Fuera de límites
							}
						}
						
						// Solo inicializar si el bloque es undefined
						if ( this.blocks[x][y][z] === undefined )
						{
							// Generar terreno plano: DIRT hasta flatHeight, AIR arriba
							// Esto asegura que los chunks nuevos tengan terreno visible
							// Y es altura
							this.blocks[x][y][z] = y < flatHeight ? BLOCK.DIRT : BLOCK.AIR;
						}
					}
				}
			}
		}
	
	if ( !this.chunkStates ) this.chunkStates = {};
	this.chunkStates[key] = "loaded";
}

World.prototype.persistChunk = function( chunk, chunkSize, chunkSizeY )
{
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	if ( !chunk ) return;
	var size = chunkSize || this.chunkSize;
	var sizeY = chunkSizeY || this.chunkSizeY;
	var key = this.getChunkKeyFromChunk( chunk );
	// chunk.start = [x, y, z] donde y es altura
	var cx = Math.floor( chunk.start[0] / size );
	var cz = Math.floor( chunk.start[2] / size );
	var cy = 0; // Siempre 0
	var serialized = this.toChunkString( cx, cz, cy, size, sizeY );
	var stored = this.writeChunkToStorage( key, serialized );
	if ( stored )
	{
		this.clearChunkInMemory( chunk.start, size, sizeY );
		if ( !this.chunkStates ) this.chunkStates = {};
		this.chunkStates[key] = "stored";
	}
}

World.prototype.clearChunkInMemory = function( start, chunkSize, chunkSizeY )
{
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// start = [x, y, z] donde y es altura
	var sizeX = chunkSize || this.chunkSize;
	var sizeZ = chunkSize || this.chunkSize;
	var sizeY = chunkSizeY || this.chunkSizeY;
	for ( var x = start[0]; x < start[0] + sizeX; x++ )
	{
		for ( var z = start[2]; z < start[2] + sizeZ; z++ )
		{
			for ( var y = start[1]; y < start[1] + sizeY; y++ )
			{
				if ( this.blocks[x] && this.blocks[x][y] && this.blocks[x][y][z] !== undefined )
				{
					this.blocks[x][y][z] = BLOCK.AIR;
				}
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
	if ( typeof localStorage === "undefined" ) return null;
	return localStorage.getItem( this.chunkStoragePrefix + key );
}

World.prototype.writeChunkToStorage = function( key, data )
{
	if ( typeof localStorage === "undefined" ) return false;
	try
	{
		localStorage.setItem( this.chunkStoragePrefix + key, data );
		return true;
	}
	catch ( e )
	{
		console.warn( "Failed to store chunk", key, e );
		return false;
	}
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
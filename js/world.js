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
	this.chunkSize = 16;
	this.chunkStates = {};
	this.chunkStoragePrefix = "minecraft_chunk_";
}

// createFlatWorld()
//
// Sets up the world so that the bottom half is filled with dirt
// and the top half with air.

World.prototype.createFlatWorld = function( height )
{
	this.spawn = new Vector( this.sx / 2 + 0.5, this.sy / 2 + 0.5, height );
	
	for ( var x = 0; x < this.sx; x++ )
		for ( var y = 0; y < this.sy; y++ )
			for ( var z = 0; z < this.sz; z++ )
				this.blocks[x][y][z] = z < height ? BLOCK.DIRT : BLOCK.AIR;
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

World.prototype.createChunkFromString = function( cx, cy, cz, str )
{
	var i = 0;
	var chunkSize = 16;

	for ( var x = cx * chunkSize; x < (cx + 1) * chunkSize; x++ ) {
		for ( var y = cy * chunkSize; y < (cy + 1) * chunkSize; y++ ) {
			for ( var z = cz * chunkSize; z < (cz + 1) * chunkSize; z++ ) {
				this.blocks[x][y][z] = BLOCK.fromId( str.charCodeAt( i ) - 97 );
				i = i + 1;
			}
		}
	}
}

// toChunkString( cx, cy, cz, chunkSize )
//
// Returns a string representation of the chunk at (cx, cy, cz).

World.prototype.toChunkString = function( cx, cy, cz, chunkSize )
{
	var blockArray = [];
	for ( var x = cx; x < cx + chunkSize; x++ )
		for ( var y = cy; y < cy + chunkSize; y++ )
			for ( var z = cz; z < cz + chunkSize; z++ )
				blockArray.push( String.fromCharCode( 97 + this.blocks[x][y][z].id ) );
	
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
	return this.blocks[x][y][z];
}

// setBlock( x, y, z )

World.prototype.setBlock = function( x, y, z, type )
{
	this.blocks[x][y][z] = type;
	if ( this.renderer != null ) this.renderer.onBlockChanged( x, y, z );
}

World.prototype.setChunking = function( chunkSize )
{
	if ( chunkSize ) this.chunkSize = chunkSize;
	if ( !this.chunkStates ) this.chunkStates = {};
}

World.prototype.getChunkKeyFromCoords = function( x, y, z )
{
	var cx = Math.floor( x / this.chunkSize );
	var cy = Math.floor( y / this.chunkSize );
	var cz = Math.floor( z / this.chunkSize );
	return cx + "|" + cy + "|" + cz;
}

World.prototype.getChunkKeyFromChunk = function( chunk )
{
	return this.getChunkKeyFromCoords( chunk.start[0], chunk.start[1], chunk.start[2] );
}

World.prototype.ensureChunkLoaded = function( chunk, chunkSize )
{
	if ( !chunk ) return;
	var size = chunkSize || this.chunkSize;
	var key = this.getChunkKeyFromChunk( chunk );
	if ( this.chunkStates && this.chunkStates[key] === "loaded" ) return;
	var data = this.readChunkFromStorage( key );
	if ( data )
	{
		this.applyChunkString( chunk.start, size, data );
	}
	if ( !this.chunkStates ) this.chunkStates = {};
	this.chunkStates[key] = "loaded";
}

World.prototype.persistChunk = function( chunk, chunkSize )
{
	if ( !chunk ) return;
	var size = chunkSize || this.chunkSize;
	var key = this.getChunkKeyFromChunk( chunk );
	var serialized = this.toChunkString( chunk.start[0], chunk.start[1], chunk.start[2], size );
	var stored = this.writeChunkToStorage( key, serialized );
	if ( stored )
	{
		this.clearChunkInMemory( chunk.start, size );
		if ( !this.chunkStates ) this.chunkStates = {};
		this.chunkStates[key] = "stored";
	}
}

World.prototype.clearChunkInMemory = function( start, chunkSize )
{
	for ( var x = start[0]; x < start[0] + chunkSize; x++ )
	{
		for ( var y = start[1]; y < start[1] + chunkSize; y++ )
		{
			for ( var z = start[2]; z < start[2] + chunkSize; z++ )
			{
				this.blocks[x][y][z] = BLOCK.AIR;
			}
		}
	}
}

World.prototype.applyChunkString = function( start, chunkSize, data )
{
	if ( !data ) return;
	var i = 0;
	for ( var x = start[0]; x < start[0] + chunkSize; x++ )
	{
		for ( var y = start[1]; y < start[1] + chunkSize; y++ )
		{
			for ( var z = start[2]; z < start[2] + chunkSize; z++ )
			{
				if ( i >= data.length ) return;
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
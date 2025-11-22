// ==========================================
// Block types
//
// This file contains all available block types and their properties.
// ==========================================

// Direction enumeration
var DIRECTION = {};
DIRECTION.UP = 1;
DIRECTION.DOWN = 2;
DIRECTION.LEFT = 3;
DIRECTION.RIGHT = 4;
DIRECTION.FORWARD = 5;
DIRECTION.BACK = 6;

// Ensure BLOCK is global
if ( typeof BLOCK === 'undefined' ) {
	BLOCK = {};
}

BLOCK.PICK_PASS_POSITION = 0;
BLOCK.PICK_PASS_DEPTH = 1;
BLOCK.pickingPass = BLOCK.PICK_PASS_POSITION;

// Define setPickingPass function explicitly - use BLOCK directly instead of this
BLOCK.setPickingPass = function( pass )
{
	if ( !BLOCK.pickingPass ) {
		BLOCK.pickingPass = BLOCK.PICK_PASS_POSITION;
	}
	BLOCK.pickingPass = ( pass === BLOCK.PICK_PASS_DEPTH ) ? BLOCK.PICK_PASS_DEPTH : BLOCK.PICK_PASS_POSITION;
}

// Ensure it's available on window object for browser context
if ( typeof window !== 'undefined' ) {
	window.BLOCK = BLOCK;
	// Also ensure the function is directly accessible
	if ( !window.BLOCK.setPickingPass ) {
		window.BLOCK.setPickingPass = BLOCK.setPickingPass;
	}
}

BLOCK.getPickingColor = function( x, y, z, faceId )
{
	var pass = BLOCK.pickingPass || BLOCK.PICK_PASS_POSITION;
	if ( pass === BLOCK.PICK_PASS_POSITION )
	{
		var xLow = x & 0xFF;
		var xHigh = ( x >> 8 ) & 0xFF;
		var yLow = y & 0xFF;
		var yHigh = ( y >> 8 ) & 0xFF;
		return [
			xLow / 255,
			xHigh / 255,
			yLow / 255,
			yHigh / 255
		];
	}
	else
	{
		var zLow = z & 0xFF;
		var zHigh = ( z >> 8 ) & 0xFF;
		return [
			zLow / 255,
			zHigh / 255,
			( faceId || 0 ) / 255,
			0
		];
	}
}

// Air
BLOCK.AIR = {
	id: 0,
	spawnable: false,
	transparent: true
};

// Bedrock
BLOCK.BEDROCK = {
	id: 1,
	spawnable: false,
	transparent: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 1/16, 1/16, 2/16, 2/16 ]; }
};

// Dirt
BLOCK.DIRT = {
	id: 2,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	useGrassColor: true, // Flag to indicate this block uses grass color filtering
	texture: function( world, lightmap, lit, x, y, z, dir )
	{
		if ( dir == DIRECTION.UP && lit )
			// Grass top texture - posición (0, 0) en el atlas de texturas
			return [ 0/16, 0/16, 1/16, 1/16 ];
		else if ( dir == DIRECTION.DOWN || !lit ) 
			// Dirt texture - posición (2, 0) en el atlas de texturas
			return [ 2/16, 0/16, 3/16, 1/16 ];
		else
			// Grass side texture - posición (3, 0) en el atlas de texturas
			return [ 3/16, 0/16, 4/16, 1/16 ];
	}
};

// Wood
BLOCK.WOOD = {
	id: 3,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir )
	{
		if ( dir == DIRECTION.UP || dir == DIRECTION.DOWN )
			return [ 5/16, 1/16, 6/16, 2/16 ];
		else
			return [ 4/16, 1/16, 5/16, 2/16 ];
	}
};

// TNT
BLOCK.TNT = {
	id: 4,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir )
	{
		if ( dir == DIRECTION.UP || dir == DIRECTION.DOWN )
			return [ 10/16, 0/16, 11/16, 1/16 ];
		else
			return [ 8/16, 0/16, 9/16, 1/16 ];
	}
};

// Bookcase
BLOCK.BOOKCASE = {
	id: 5,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir )
	{
		if ( dir == DIRECTION.FORWARD || dir == DIRECTION.BACK )
			return [ 3/16, 2/16, 4/16, 3/16 ];
		else
			return [ 4/16, 0/16, 5/16, 1/16 ];
	}
};

// Lava
BLOCK.LAVA = {
	id: 6,
	spawnable: false,
	transparent: true,
	selflit: true,
	gravity: true,
	fluid: true,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 13/16, 14/16, 14/16, 15/16 ]; }
};

// Plank
BLOCK.PLANK = {
	id: 7,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 4/16, 0/16, 5/16, 1/16 ]; }
};

// Cobblestone
BLOCK.COBBLESTONE = {
	id: 8,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 0/16, 1/16, 1/16, 2/16 ]; }
};

// Concrete
BLOCK.CONCRETE = {
	id: 9,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 1/16, 0/16, 2/16, 1/16 ]; }
};

// Brick
BLOCK.BRICK = {
	id: 10,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 7/16, 0/16, 8/16, 1/16 ]; }
};

// Sand
BLOCK.SAND = {
	id: 11,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: true,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 2/16, 1/16, 3/16, 2/16 ]; }
};

// Gravel
BLOCK.GRAVEL = {
	id: 12,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: true,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 3/16, 1/16, 4/16, 2/16 ]; }
};

// Iron
BLOCK.IRON = {
	id: 13,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 6/16, 1/16, 7/16, 2/16 ]; }
};

// Gold
BLOCK.GOLD = {
	id: 14,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 7/16, 1/16, 8/16, 2/16 ]; }
};

// Diamond
BLOCK.DIAMOND = {
	id: 15,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 8/16, 1/16, 9/16, 2/16 ]; }
};

// Obsidian
BLOCK.OBSIDIAN = {
	id: 16,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 5/16, 2/16, 6/16, 3/16 ]; }
};

// Glass
BLOCK.GLASS = {
	id: 17,
	spawnable: true,
	transparent: true,
	selflit: false,
	gravity: false,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 1/16, 3/16, 2/16, 4/16 ]; }
};

// Sponge
BLOCK.SPONGE = {
	id: 18,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 0/16, 3/16, 1/16, 4/16 ]; }
};

// fromId( id )
//
// Returns a block structure for the given id.

BLOCK.fromId = function( id )
{
	for ( var mat in BLOCK )
		if ( typeof( BLOCK[mat] ) == "object" && BLOCK[mat].id == id )
			return BLOCK[mat];
	return null;
}

// pushVertices( vertices, world, lightmap, x, y, z )
//
// Pushes the vertices necessary for rendering a
// specific block into the array.

BLOCK.pushVertices = function( vertices, world, lightmap, x, y, z )
{
	var blocks = world.blocks;
	var blockLit = z >= lightmap[x][y];
	var block = blocks[x][y][z];
	
	// Use getBlock() to safely check adjacent blocks (handles out-of-bounds and unloaded chunks)
	var blockTop = world.getBlock( x, y, z + 1 );
	var blockBottom = world.getBlock( x, y, z - 1 );
	var blockFront = world.getBlock( x, y - 1, z );
	var blockBack = world.getBlock( x, y + 1, z );
	var blockLeft = world.getBlock( x - 1, y, z );
	var blockRight = world.getBlock( x + 1, y, z );
	
	// Small offset to eliminate gaps between blocks (texture bleeding)
	// This extends blocks slightly to cover any precision gaps
	var OFFSET = 0.001;
	
	var bH = block.fluid && ( z == world.sz - 1 || !blockTop.fluid ) ? 0.9 : 1.0;
	
	// Top - only render if adjacent block is transparent or doesn't exist (AIR)
	if ( z == world.sz - 1 || blockTop.transparent || block.fluid )
	{
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.UP );
		
		var lightMultiplier = z >= lightmap[x][y] ? 1.0 : 0.6;
		if ( block.selflit ) lightMultiplier = 1.0;
		
		// Apply grass color filter if this is a grass block top face
		var grassColor = [ 1.0, 1.0, 1.0 ]; // Default white
		if ( block.useGrassColor && blockLit && world.renderer ) {
			// Use integer block coordinates for consistent coloring
			// All blocks at the same (x, y) will have the same color
			grassColor = world.renderer.getGrassColor( x, y );
		}
		
		// Multiply grass color with light multiplier
		var r = grassColor[0] * lightMultiplier;
		var g = grassColor[1] * lightMultiplier;
		var b = grassColor[2] * lightMultiplier;
		
		pushQuad(
			vertices,
			[ x - OFFSET, y - OFFSET, z + bH, c[0], c[1], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, y - OFFSET, z + bH, c[2], c[1], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, y + 1.0 + OFFSET, z + bH, c[2], c[3], r, g, b, 1.0 ],
			[ x - OFFSET, y + 1.0 + OFFSET, z + bH, c[0], c[3], r, g, b, 1.0 ]
		);
	}
	
	// Bottom - only render if adjacent block is transparent or doesn't exist (AIR)
	if ( z == 0 || blockBottom.transparent )
	{
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.DOWN );
		
		var lightMultiplier = block.selflit ? 1.0 : 0.6;
		
		pushQuad(
			vertices,							
			[ x - OFFSET, y + 1.0 + OFFSET, z, c[0], c[3], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x + 1.0 + OFFSET, y + 1.0 + OFFSET, z, c[2], c[3], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x + 1.0 + OFFSET, y - OFFSET, z, c[2], c[1], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x - OFFSET, y - OFFSET, z, c[0], c[1], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ]
		);
	}
	
	// Front - only render if adjacent block is transparent or doesn't exist (AIR)
	if ( y == 0 || blockFront.transparent )
	{
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.FORWARD );
		
		var lightMultiplier = ( y == 0 || z >= lightmap[x][y-1] ) ? 1.0 : 0.6;
		if ( block.selflit ) lightMultiplier = 1.0;
		
		pushQuad(
			vertices,
			[ x - OFFSET, y - OFFSET, z, c[0], c[3], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x + 1.0 + OFFSET, y - OFFSET, z, c[2], c[3], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x + 1.0 + OFFSET, y - OFFSET, z + bH, c[2], c[1], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x - OFFSET, y - OFFSET, z + bH, c[0], c[1], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ]
		);
	}
	
	// Back - only render if adjacent block is transparent or doesn't exist (AIR)
	if ( y == world.sy - 1 || blockBack.transparent )
	{
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.BACK );
		
		var lightMultiplier = block.selflit ? 1.0 : 0.6;
		
		pushQuad(
			vertices,
			[ x - OFFSET, y + 1.0 + OFFSET, z + bH, c[2], c[1], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x + 1.0 + OFFSET, y + 1.0 + OFFSET, z + bH, c[0], c[1], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x + 1.0 + OFFSET, y + 1.0 + OFFSET, z, c[0], c[3], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x - OFFSET, y + 1.0 + OFFSET, z, c[2], c[3], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ]
		);
	}
	
	// Left - only render if adjacent block is transparent or doesn't exist (AIR)
	if ( x == 0 || blockLeft.transparent )
	{
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.LEFT );
		
		var lightMultiplier = block.selflit ? 1.0 : 0.6;
		
		pushQuad(
			vertices,
			[ x - OFFSET, y - OFFSET, z + bH, c[2], c[1], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x - OFFSET, y + 1.0 + OFFSET, z + bH, c[0], c[1], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x - OFFSET, y + 1.0 + OFFSET, z, c[0], c[3], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x - OFFSET, y - OFFSET, z, c[2], c[3], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ]
		);
	}
	
	// Right - only render if adjacent block is transparent or doesn't exist (AIR)
	if ( x == world.sx - 1 || blockRight.transparent )
	{
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.RIGHT );
		
		var lightMultiplier = ( x == world.sx - 1 || z >= lightmap[x+1][y] ) ? 1.0 : 0.6;
		if ( block.selflit ) lightMultiplier = 1.0;
		
		pushQuad(
			vertices,
			[ x + 1.0 + OFFSET, y - OFFSET, z, c[0], c[3], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x + 1.0 + OFFSET, y + 1.0 + OFFSET, z, c[2], c[3], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x + 1.0 + OFFSET, y + 1.0 + OFFSET, z + bH, c[2], c[1], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ],
			[ x + 1.0 + OFFSET, y - OFFSET, z + bH, c[0], c[1], lightMultiplier, lightMultiplier, lightMultiplier, 1.0 ]
		);
	}
}

// pushPickingVertices( vertices, x, y, z )
//
// Pushes vertices with the data needed for picking.

BLOCK.pushPickingVertices = function( vertices, x, y, z )
{
	// Top
	var colorTop = BLOCK.getPickingColor( x, y, z, 1 );
	pushQuad(
		vertices,
		[ x, y, z + 1, 0, 0, colorTop[0], colorTop[1], colorTop[2], colorTop[3] ],
		[ x + 1, y, z + 1, 1, 0, colorTop[0], colorTop[1], colorTop[2], colorTop[3] ],
		[ x + 1, y + 1, z + 1, 1, 1, colorTop[0], colorTop[1], colorTop[2], colorTop[3] ],
		[ x, y + 1, z + 1, 0, 0, colorTop[0], colorTop[1], colorTop[2], colorTop[3] ]
	);
	
	// Bottom
	var colorBottom = BLOCK.getPickingColor( x, y, z, 2 );
	pushQuad(
		vertices,
		[ x, y + 1, z, 0, 0, colorBottom[0], colorBottom[1], colorBottom[2], colorBottom[3] ],
		[ x + 1, y + 1, z, 1, 0, colorBottom[0], colorBottom[1], colorBottom[2], colorBottom[3] ],
		[ x + 1, y, z, 1, 1, colorBottom[0], colorBottom[1], colorBottom[2], colorBottom[3] ],
		[ x, y, z, 0, 0, colorBottom[0], colorBottom[1], colorBottom[2], colorBottom[3] ]
	);
	
	// Front
	var colorFront = BLOCK.getPickingColor( x, y, z, 3 );
	pushQuad(
		vertices,
		[ x, y, z, 0, 0, colorFront[0], colorFront[1], colorFront[2], colorFront[3] ],
		[ x + 1, y, z, 1, 0, colorFront[0], colorFront[1], colorFront[2], colorFront[3] ],
		[ x + 1, y, z + 1, 1, 1, colorFront[0], colorFront[1], colorFront[2], colorFront[3] ],
		[ x, y, z + 1, 0, 0, colorFront[0], colorFront[1], colorFront[2], colorFront[3] ]
	);
	
	// Back
	var colorBack = BLOCK.getPickingColor( x, y, z, 4 );
	pushQuad(
		vertices,
		[ x, y + 1, z + 1, 0, 0, colorBack[0], colorBack[1], colorBack[2], colorBack[3] ],
		[ x + 1, y + 1, z + 1, 1, 0, colorBack[0], colorBack[1], colorBack[2], colorBack[3] ],
		[ x + 1, y + 1, z, 1, 1, colorBack[0], colorBack[1], colorBack[2], colorBack[3] ],
		[ x, y + 1, z, 0, 0, colorBack[0], colorBack[1], colorBack[2], colorBack[3] ]
	);
	
	// Left
	var colorLeft = BLOCK.getPickingColor( x, y, z, 5 );
	pushQuad(
		vertices,
		[ x, y, z + 1, 0, 0, colorLeft[0], colorLeft[1], colorLeft[2], colorLeft[3] ],
		[ x, y + 1, z + 1, 1, 0, colorLeft[0], colorLeft[1], colorLeft[2], colorLeft[3] ],
		[ x, y + 1, z, 1, 1, colorLeft[0], colorLeft[1], colorLeft[2], colorLeft[3] ],
		[ x, y, z, 0, 0, colorLeft[0], colorLeft[1], colorLeft[2], colorLeft[3] ]
	);
	
	// Right
	var colorRight = BLOCK.getPickingColor( x, y, z, 6 );
	pushQuad(
		vertices,
		[ x + 1, y, z, 0, 0, colorRight[0], colorRight[1], colorRight[2], colorRight[3] ],
		[ x + 1, y + 1, z, 1, 0, colorRight[0], colorRight[1], colorRight[2], colorRight[3] ],
		[ x + 1, y + 1, z + 1, 1, 1, colorRight[0], colorRight[1], colorRight[2], colorRight[3] ],
		[ x + 1, y, z + 1, 0, 0, colorRight[0], colorRight[1], colorRight[2], colorRight[3] ]
	);
}

// Export to node.js
if ( typeof( exports ) != "undefined" )
{
	exports.BLOCK = BLOCK;
}

// Final verification - ensure setPickingPass is defined
if ( typeof BLOCK.setPickingPass !== 'function' ) {
	console.error( 'BLOCK.setPickingPass was not defined correctly!' );
	BLOCK.setPickingPass = function( pass ) {
		BLOCK.pickingPass = ( pass === BLOCK.PICK_PASS_DEPTH ) ? BLOCK.PICK_PASS_DEPTH : BLOCK.PICK_PASS_POSITION;
	};
}

// Ensure it's available globally one more time
if ( typeof window !== 'undefined' ) {
	window.BLOCK = BLOCK;
}
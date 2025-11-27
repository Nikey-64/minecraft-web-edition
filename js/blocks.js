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
	id: 22,
	spawnable: false,
	transparent: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 1/16, 1/16, 2/16, 2/16 ]; }
};

BLOCK.GRASS = {
	id: 23,
	spawnable: true,
	transparent: false,
	useGrassColor: true,
	texture: function( world, lightmap, lit, x, y, z, dir )
	 { if ( dir == DIRECTION.UP && lit )
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
// Dirt
BLOCK.DIRT = {
	id: 2,
	spawnable: true,
	item: true,
	itemdrop: 2,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 2/16, 0/16, 3/16, 1/16 ]; }
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
	solid: true,
	flammable: true,
	explosive: true,
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
	solid: true,
	flammable: true,
	explosive: false,
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
	solid: false,
	flammable: true,
	explosive: true,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 13/16, 14/16, 14/16, 15/16 ]; }
};

// Water
BLOCK.WATER = {
	id: 1,
	spawnable: false,
	transparent: true,
	selflit: false,
	gravity: true,
	fluid: true,
	solid: false,
	flammable: false,
	explosive: false,
	// Water texture is at position (15, 12) in the 16x16 texture atlas
	// Format: [u_min, v_min, u_max, v_max] in normalized coordinates
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 15/16, 12/16, 16/16, 13/16 ]; }
};

// Plank
BLOCK.PLANK = {
	id: 7,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	solid: true,
	flammable: true,
	explosive: false,
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
	solid: true,
	flammable: true,
	explosive: false,
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
	solid: true,
	flammable: true,
	explosive: false,
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
	solid: true,
	flammable: true,
	explosive: false,
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
	solid: true,
	flammable: true,
	explosive: false,
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
	solid: true,
	flammable: true,
	explosive: false,
	breakable: true, breaktime: 10000, /* 10 seconds to break */ requiredtool: "shovel", tooltime: 5000, /* 5 seconds to break */
	toollevel: 1,
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
	solid: true,
	flammable: true,
	explosive: false,
	breakable: true, breaktime: 20000, /* 20 seconds to break */ requiredtool: "iron_pickaxe", tooltime: 5000, /* 5 seconds to break */
	toollevel: 2,
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
	solid: true,
	flammable: true,
	explosive: false,
	breakable: true, breaktime: 10000, /* 10 seconds to break */ requiredtool: "iron_pickaxe", tooltime: 5000, /* 5 seconds to break */
	toollevel: 2,
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
	solid: true,
	flammable: true,
	explosive: false,
	breakable: true, breaktime: 20000, /* 30 seconds to break */ requiredtool: "iron_pickaxe", tooltime: 10000, /* 10 seconds to break */
	toollevel: 2,
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
	solid: true,
	flammable: true,
	explosive: false,
	breakable: true, breaktime: 30000, // 30 seconds to break
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
	solid: true,
	flammable: true,
	explosive: false,
	breakable: true,
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
	solid: true,
	flammable: true,
	explosive: false,
	breakable: true,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 0/16, 3/16, 1/16, 4/16 ]; }
};

// Leaves 
BLOCK.LEAVES = {
	id: 19,
	spawnable: true,
	transparent: true,
	solid: true,
	flammable: true,
	explosive: false,
	breakable: true,
	useFoliageColor: true, // Flag to indicate this block uses foliage color filtering on all faces
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 4/16, 3/16, 5/16, 4/16 ]; }
};

// wool
BLOCK.WHITE_WOOL = {
	id: 25, 
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	solid: true,
	getcolor: true,
	explosive: false,
	breakable: true,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 0/16, 4/16, 1/16, 5/16 ]; }
};

// planks.stairs
// Stairs block - requires special handling for orientation and collision
BLOCK.PLANKS_STAIRS = {
	id: 24,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	solid: true,
	flammable: true,
	explosive: false,
	bloctype: "stairs",
	breakable: true,
	requiredtool: "axe",
	tooltime: 5000,
	toollevel: 1,
	breaktime: 10000, /* 10 seconds to break */
	// Stairs need orientation data (stored in block metadata)
	// For now, use simple texture - can be enhanced later with orientation support
	texture: function( world, lightmap, lit, x, y, z, dir ) { 
		// Use plank texture for stairs
		return [ 4/16, 0/16, 5/16, 1/16 ]; 
	},
	// Stairs are special blocks that need custom collision and rendering
	// TODO: Add orientation support (facing direction)
	// TODO: Add custom collision box (half block height on one side)
	isStairs: true
};

BLOCK.WATER = {
	id: 26,
	spawnable: false,
	transparent: true,
	gravity: false,
	fluid: true,
	solid: false,
	breakable: false,
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 0/16, 1/16, 1/16, 2/16 ]; }
};

// ANIMATED_BLOCKS posibilities (not allways animated) this is a list of wich blocks can be animated
var ANIMATED_BLOCKS = [ BLOCK.TNT, BLOCK.LAVA, BLOCK.SAND, BLOCK.GRAVEL];

// BLOCK.ANIMATED es una plantilla/base que indica propiedades comunes de bloques animados
// No se usa directamente, sino como referencia para crear bloques animados dinámicamente
// IMPORTANTE: Este bloque NO se invoca constantemente, es solo una referencia/base o un valor global
// Las propiedades se toman del bloque original cuando se crea con createAnimatedBlock
// const: false indica que no es un bloque permanente (se crea dinámicamente)
BLOCK.ANIMATED = {
	id: 20,
	spawnable: false,
	// transparent: true,
	// NOTA: transparent NO se define bajo la misma variable aquí porque debe tomarse del bloque original para poder devolver la propiedad original del bloque cuando termine la animación
	// Cada bloque animado mantiene su transparencia original para poder devolverla después
	const: false,
};

BLOCK.BARRIER = {
	id: 21,
	spawnable: false,
	transparent: true,
	gravity: false,
	fluid: false,
	solid: true,
	breakable: false,
	// Barrier no tiene textura visible (es transparente pero sólido)
	texture: function( world, lightmap, lit, x, y, z, dir ) { 
		// Retornar coordenadas vacías o transparentes - no se renderizará visualmente
		// pero será sólido para colisiones
		return [ 0, 0, 0, 0 ]; 
	}
};




// createAnimatedBlock( originalBlock )
//
// Crea un bloque animado basado en un bloque original.
// El bloque animado mantiene todas las propiedades del original (textura, etc.)
// pero se comporta como si estuviera en el aire (siempre muestra todas sus caras).
//
// originalBlock - El bloque original del cual se creará el bloque animado

BLOCK.createAnimatedBlock = function( originalBlock )
{
	if ( !originalBlock || originalBlock == BLOCK.AIR ) {
		return BLOCK.AIR;
	}
	
	// Verificar que el bloque original tiene la función texture
	if ( typeof originalBlock.texture !== 'function' ) {
		console.warn("createAnimatedBlock: originalBlock doesn't have texture function");
		return BLOCK.AIR;
	}
	
	// Crear un nuevo objeto que copia todas las propiedades del bloque original
	var animatedBlock = {};
	for ( var prop in originalBlock ) {
		if ( originalBlock.hasOwnProperty( prop ) ) {
			animatedBlock[prop] = originalBlock[prop];
		}
	}
	
	// Marcar como bloque animado
	animatedBlock.isAnimated = true;
	animatedBlock.originalBlock = originalBlock;
	
	// Asegurarse de que la función texture esté presente (copiada del original)
	if ( typeof originalBlock.texture === 'function' ) {
		animatedBlock.texture = originalBlock.texture;
	}
	
	// IMPORTANTE: Mantener la transparencia original del bloque
	// No sobrescribir transparent porque necesitamos preservar las propiedades del original
	// para poder devolverlas más adelante cuando termine la animación
	
	// El bloque animado siempre se comporta como si estuviera en el aire
	// (todas las caras se renderizan, independientemente de bloques adyacentes)
	// Esto se maneja en pushVertices con isAnimated = true
	
	return animatedBlock;
}


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

BLOCK.pushVertices = function( vertices, world, lightmap, x, y, z, yOffset, animatedBlockOverride )
{
	// Ejes del mundo: X y Z = horizontal, Y = vertical (altura)
	// blocks[x][y][z] donde x=X, y=Y(altura), z=Z(horizontal)
	// yOffset: offset adicional en Y para animaciones (por defecto 0)
	// animatedBlockOverride: bloque animado opcional (si viene del sistema de física)
	yOffset = yOffset || 0;
	var blocks = world.blocks;
	
	// Si hay un offset (bloque en animación), el bloque se comporta como si estuviera en el aire
	// Los bloques animados siempre muestran todas sus caras porque están cayendo
	var isAnimated = yOffset != 0;
	var checkY = isAnimated ? Math.floor( y + yOffset ) : y;
	
	// lightmap[x][z] almacena la altura Y del bloque más alto no transparente en la columna (x, z)
	var blockLit = y >= (lightmap[x] && lightmap[x][z] !== undefined ? lightmap[x][z] : -1);
	var block = blocks[x][y][z];
	
	// Si se proporciona un bloque animado override (del sistema de física), usarlo
	// Esto asegura que usamos el bloque animado con las propiedades del original
	if ( animatedBlockOverride && animatedBlockOverride.isAnimated ) {
		block = animatedBlockOverride;
		isAnimated = true;
	}
	// Verificar que el bloque existe, no es AIR y tiene la función texture
	if ( !block || block == BLOCK.AIR ) {
		return; // Skip rendering if block is invalid or AIR
	}
	
	// Verificar que el bloque tiene la función texture
	if ( typeof block.texture !== 'function' ) {
		return; // Skip rendering if block doesn't have texture function
	}
	
	// Si el bloque ya es un bloque animado (viene del sistema de física), usarlo directamente
	// Esto asegura que mantiene las propiedades del bloque original
	if ( block.isAnimated && block.originalBlock ) {
		// Ya es un bloque animado, mantenerlo
		isAnimated = true;
	}
	// Bloques que siempre deben comportarse como animados (permanente):
	// - Agua y lava (fluid: true) siempre están en movimiento, por lo que siempre se renderizan como animados
	// Bloques que solo se animan cuando están cayendo (temporal):
	// - Arena, grava, TNT solo cuando tienen yOffset (están cayendo)
	else {
		var isPermanentlyAnimated = block.fluid === true; // Agua y lava siempre animados
		var shouldAnimate = isAnimated || isPermanentlyAnimated;
		
		// Si el bloque debe comportarse como animado, crear un bloque animado especial
		if ( shouldAnimate && block != BLOCK.AIR ) {
			block = BLOCK.createAnimatedBlock( block );
			// Verify the animated block has texture function
			if ( typeof block.texture !== 'function' ) {
				return; // Skip rendering if animated block doesn't have texture function
			}
			isAnimated = true; // Actualizar flag para que las verificaciones de bloques adyacentes funcionen
		}
	}
	
	// Use getBlock() to safely check adjacent blocks (handles out-of-bounds and unloaded chunks)
	// En el mundo: Y es altura, Z es horizontal
	// Si el bloque está animado, verificar bloques adyacentes en la posición animada
	// Si NO está animado, verificar en la posición original
	var blockTop = isAnimated ? BLOCK.AIR : world.getBlock( x, checkY + 1, z );      // Arriba: Y+1
	var blockBottom = isAnimated ? BLOCK.AIR : world.getBlock( x, checkY - 1, z );  // Abajo: Y-1
	var blockFront = isAnimated ? BLOCK.AIR : world.getBlock( x, checkY, z - 1 );   // Frente: Z-1 (horizontal)
	var blockBack = isAnimated ? BLOCK.AIR : world.getBlock( x, checkY, z + 1 );    // Atrás: Z+1 (horizontal)
	var blockLeft = isAnimated ? BLOCK.AIR : world.getBlock( x - 1, checkY, z );     // Izquierda: X-1
	var blockRight = isAnimated ? BLOCK.AIR : world.getBlock( x + 1, checkY, z );    // Derecha: X+1
	
	// Small offset to eliminate gaps between blocks (texture bleeding)
	// This extends blocks slightly to cover any precision gaps
	var OFFSET = 0.001;
	
	// Texture coordinate offset to prevent texture bleeding
	// terrain.png is a 256x256 texture atlas with 16x16 block textures (16x16 grid)
	// Each texture occupies 1/16 of the atlas (16/256 = 0.0625)
	// With CLAMP_TO_EDGE in the renderer, we use a distance-based offset
	// Only apply offset at far distances to avoid visual artifacts up close
	var MAX_TEX_OFFSET = 0.5 / 256; // Maximum offset (half pixel) for far distances
	var MIN_DISTANCE = 16.0; // Distance at which offset starts applying (in blocks)
	var MAX_DISTANCE = 64.0; // Distance at which offset reaches maximum (in blocks)
	
	// Helper function to adjust texture coordinates to prevent bleeding based on distance
	// This moves the texture coordinates slightly inward to avoid sampling adjacent textures
	// The offset increases with distance to prevent bleeding at far distances
	var adjustTexCoords = function( texCoords, distance ) {
		// Calculate distance-based offset factor (0 at close range, 1 at far range)
		var distanceFactor = 0;
		if ( distance > MIN_DISTANCE ) {
			if ( distance >= MAX_DISTANCE ) {
				distanceFactor = 1.0; // Full offset at max distance
			} else {
				// Smooth interpolation between MIN_DISTANCE and MAX_DISTANCE
				distanceFactor = ( distance - MIN_DISTANCE ) / ( MAX_DISTANCE - MIN_DISTANCE );
			}
		}
		
		// Apply offset only if we're at a distance where it's needed
		var texOffset = MAX_TEX_OFFSET * distanceFactor;
		
		// Ensure coordinates stay within valid range [0, 1]
		var u_min = Math.max( 0, texCoords[0] + texOffset );
		var v_min = Math.max( 0, texCoords[1] + texOffset );
		var u_max = Math.min( 1, texCoords[2] - texOffset );
		var v_max = Math.min( 1, texCoords[3] - texOffset );
		
		return [ u_min, v_min, u_max, v_max ];
	};
	
	// Calculate distance from camera to block center
	// Ejes del mundo: X y Z = horizontal, Y = vertical (altura)
	// camPos viene como [x, y, z] donde y es altura
	var blockDistance = 0;
	if ( world.renderer && world.renderer.camPos ) {
		var camPos = world.renderer.camPos;
		// Block center position: [x + 0.5, y + 0.5, z + 0.5]
		var dx = ( x + 0.5 ) - camPos[0];
		var dy = ( y + 0.5 ) - camPos[1]; // Y es altura
		var dz = ( z + 0.5 ) - camPos[2];
		// Calculate 3D distance
		blockDistance = Math.sqrt( dx * dx + dy * dy + dz * dz );
	}
	
	// Y es altura, Z es horizontal
	var bH = block.fluid && ( y == world.sy - 1 || !blockTop.fluid ) ? 0.9 : 1.0;
	
	// Helper function to determine if a face should be rendered based on transparency rules
	// Rules:
	// 1. All faces adjacent to AIR must be rendered
	// 2. If two transparent blocks of the same type are adjacent, their adjacent faces are NOT rendered
	// 3. If two transparent blocks of different types are adjacent, their adjacent faces are rendered based on viewing angle
	// 4. If two solid non-transparent blocks are adjacent, their adjacent faces are NOT rendered
	var shouldRenderFaceBetweenBlocks = function( currentBlock, adjacentBlock, currentX, currentY, currentZ, adjacentX, adjacentY, adjacentZ ) {
		// Rule 1: Always render faces adjacent to AIR
		if ( !adjacentBlock || adjacentBlock == BLOCK.AIR ) {
			return true;
		}
		
		// Rule 4: If both blocks are solid and non-transparent, don't render
		if ( !currentBlock.transparent && !adjacentBlock.transparent ) {
			return false;
		}
		
		// If current block is transparent and adjacent is not, render
		if ( currentBlock.transparent && !adjacentBlock.transparent ) {
			return true;
		}
		
		// If current block is not transparent and adjacent is, render
		if ( !currentBlock.transparent && adjacentBlock.transparent ) {
			return true;
		}
		
		// Both blocks are transparent
		if ( currentBlock.transparent && adjacentBlock.transparent ) {
			// Rule 2: Same type - don't render
			if ( currentBlock.id === adjacentBlock.id ) {
				return false;
			}
			
			// Rule 3: Different types - render only ONE face based on viewing angle
			// Render the face of the block FARTHER from camera
			// Example: if camera is on leaves side, show inner face of glass (glass is farther)
			// If camera is on glass side, show face of leaves (leaves is farther)
			if ( world.renderer && world.renderer.camPos ) {
				var camPos = world.renderer.camPos;
				// Distance from camera to current block center
				var dx1 = ( currentX + 0.5 ) - camPos[0];
				var dy1 = ( currentY + 0.5 ) - camPos[1];
				var dz1 = ( currentZ + 0.5 ) - camPos[2];
				var dist1 = Math.sqrt( dx1 * dx1 + dy1 * dy1 + dz1 * dz1 );
				// Distance from camera to adjacent block center
				var dx2 = ( adjacentX + 0.5 ) - camPos[0];
				var dy2 = ( adjacentY + 0.5 ) - camPos[1];
				var dz2 = ( adjacentZ + 0.5 ) - camPos[2];
				var dist2 = Math.sqrt( dx2 * dx2 + dy2 * dy2 + dz2 * dz2 );
				// Render face if current block is FARTHER from camera (only one face is rendered)
				return ( dist1 > dist2 );
			} else {
				// If no camera position, don't render face (fallback)
				return false;
			}
		}
		
		// Default: render
		return true;
	};
	
	// Top - only render if adjacent block is transparent or doesn't exist (AIR)
	// Top es Y+1 (arriba)
	// Si el bloque está animado, siempre mostrar la cara superior (está en el aire)
	var shouldRenderTop = shouldRenderFaceBetweenBlocks( block, blockTop, x, y, z, x, y + 1, z );
	if ( shouldRenderTop && ( yOffset != 0 || y == world.sy - 1 || !blockTop || blockTop == BLOCK.AIR || blockTop.transparent || block.fluid ) )
	{
		if ( !block || typeof block.texture !== 'function' ) return;
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.UP );
		c = adjustTexCoords( c, blockDistance ); // Ajustar coordenadas de textura para evitar bleeding (solo a distancia)
		
		// lightmap[x][z] almacena la altura Y del bloque más alto no transparente
		var lightMultiplier = (lightmap[x] && lightmap[x][z] !== undefined && y >= lightmap[x][z]) ? 1.0 : 0.6;
		if ( block.selflit ) lightMultiplier = 1.0;
		
		// Apply grass color filter if this is a grass block top face
		// Apply foliage color filter if this is a leaves block (all faces)
		var grassColor = [ 1.0, 1.0, 1.0 ]; // Default white
		var foliageColor = [ 1.0, 1.0, 1.0 ]; // Default white
		if ( block.useGrassColor && world.renderer ) {
			// Use integer block coordinates for consistent coloring
			// getGrassColor espera (x, y) donde y es la coordenada horizontal
			// En el mundo: x=X, y=Y(altura), z=Z(horizontal)
			// Por lo tanto, pasamos (x, z) donde z es horizontal
			grassColor = world.renderer.getGrassColor( x, z );
		}
		if ( block.useFoliageColor && world.renderer ) {
			// Use integer block coordinates for consistent coloring
			// getFoliageColor espera (x, y) donde y es la coordenada horizontal
			// En el mundo: x=X, y=Y(altura), z=Z(horizontal)
			// Por lo tanto, pasamos (x, z) donde z es horizontal
			foliageColor = world.renderer.getFoliageColor( x, z );
		}
		
		// Apply color and light multiplier
		// For grass blocks, use grassColor; for leaves blocks, use foliageColor
		// The color from the texture is multiplied with the texture color in the shader
		// The light multiplier is applied to simulate lighting
		// White (1.0, 1.0, 1.0) preserves original texture color
		var useFoliage = block.useFoliageColor;
		var color = useFoliage ? foliageColor : grassColor;
		var r = color[0] * lightMultiplier;
		var g = color[1] * lightMultiplier;
		var b = color[2] * lightMultiplier;
		
		// Coordenadas: x, y (altura), z (horizontal)
		// El shader espera: x, y (horizontal), z (altura)
		// Por lo tanto, intercambiamos y y z: [x, z, y]
		// Aplicar yOffset para animaciones
		var renderY = y + yOffset;
		pushQuad(
			vertices,
			[ x - OFFSET, z - OFFSET, renderY + bH, c[0], c[1], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, z - OFFSET, renderY + bH, c[2], c[1], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, z + 1.0 + OFFSET, renderY + bH, c[2], c[3], r, g, b, 1.0 ],
			[ x - OFFSET, z + 1.0 + OFFSET, renderY + bH, c[0], c[3], r, g, b, 1.0 ]
		);
	}
	
	// Bottom - only render if adjacent block is transparent or doesn't exist (AIR)
	// Bottom es Y-1 (abajo)
	// Si el bloque está animado, siempre mostrar la cara inferior (está en el aire)
	var shouldRenderBottom = shouldRenderFaceBetweenBlocks( block, blockBottom, x, y, z, x, y - 1, z );
	if ( shouldRenderBottom && ( yOffset != 0 || y == 0 || !blockBottom || blockBottom == BLOCK.AIR || blockBottom.transparent ) )
	{
		if ( !block || typeof block.texture !== 'function' ) return;
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.DOWN );
		c = adjustTexCoords( c, blockDistance ); // Ajustar coordenadas de textura para evitar bleeding (solo a distancia)
		
		var lightMultiplier = block.selflit ? 1.0 : 0.6;
		
		// Apply foliage color if this is a leaves block
		var foliageColor = [ 1.0, 1.0, 1.0 ]; // Default white
		if ( block.useFoliageColor && world.renderer ) {
			foliageColor = world.renderer.getFoliageColor( x, z );
		}
		
		// Apply color and light multiplier
		var useFoliage = block.useFoliageColor;
		var color = useFoliage ? foliageColor : [1.0, 1.0, 1.0];
		var r = color[0] * lightMultiplier;
		var g = color[1] * lightMultiplier;
		var b = color[2] * lightMultiplier;
		
		// Coordenadas: x, y (altura), z (horizontal)
		// El shader espera: x, y (horizontal), z (altura)
		// Por lo tanto, intercambiamos y y z: [x, z, y]
		// Aplicar yOffset para animaciones
		var renderY = y + yOffset;
		pushQuad(
			vertices,							
			[ x - OFFSET, z + 1.0 + OFFSET, renderY, c[0], c[3], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, z + 1.0 + OFFSET, renderY, c[2], c[3], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, z - OFFSET, renderY, c[2], c[1], r, g, b, 1.0 ],
			[ x - OFFSET, z - OFFSET, renderY, c[0], c[1], r, g, b, 1.0 ]
		);
	}
	
	// Front - only render if adjacent block is transparent or doesn't exist (AIR)
	// Front es Z-1 (hacia -Z, horizontal)
	// Si el bloque está animado, siempre mostrar las caras laterales (está en el aire)
	var shouldRenderFront = shouldRenderFaceBetweenBlocks( block, blockFront, x, y, z, x, y, z - 1 );
	if ( shouldRenderFront && ( yOffset != 0 || z == 0 || !blockFront || blockFront == BLOCK.AIR || blockFront.transparent ) )
	{
		if ( !block || typeof block.texture !== 'function' ) return;
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.FORWARD );
		c = adjustTexCoords( c, blockDistance ); // Ajustar coordenadas de textura para evitar bleeding (solo a distancia)
		
		// Verificar iluminación del bloque adyacente
		var adjLightY = (lightmap[x] && lightmap[x][z-1] !== undefined) ? lightmap[x][z-1] : -1;
		var lightMultiplier = ( z == 0 || y >= adjLightY ) ? 1.0 : 0.6;
		if ( block.selflit ) lightMultiplier = 1.0;
		
		// Apply foliage color if this is a leaves block
		var foliageColor = [ 1.0, 1.0, 1.0 ]; // Default white
		if ( block.useFoliageColor && world.renderer ) {
			foliageColor = world.renderer.getFoliageColor( x, z );
		}
		
		// Apply color and light multiplier
		var useFoliage = block.useFoliageColor;
		var color = useFoliage ? foliageColor : [1.0, 1.0, 1.0];
		var r = color[0] * lightMultiplier;
		var g = color[1] * lightMultiplier;
		var b = color[2] * lightMultiplier;
		
		// Coordenadas: x, y (altura), z (horizontal)
		// El shader espera: x, y (horizontal), z (altura)
		// Por lo tanto, intercambiamos y y z: [x, z, y]
		// Aplicar yOffset para animaciones
		var renderY = y + yOffset;
		pushQuad(
			vertices,
			[ x - OFFSET, z - OFFSET, renderY, c[0], c[3], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, z - OFFSET, renderY, c[2], c[3], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, z - OFFSET, renderY + bH, c[2], c[1], r, g, b, 1.0 ],
			[ x - OFFSET, z - OFFSET, renderY + bH, c[0], c[1], r, g, b, 1.0 ]
		);
	}
	
	// Back - only render if adjacent block is transparent or doesn't exist (AIR)
	// Back es Z+1 (hacia +Z, horizontal)
	// Si el bloque está animado, siempre mostrar las caras laterales (está en el aire)
	var shouldRenderBack = shouldRenderFaceBetweenBlocks( block, blockBack, x, y, z, x, y, z + 1 );
	if ( shouldRenderBack && ( yOffset != 0 || z == world.sz - 1 || !blockBack || blockBack == BLOCK.AIR || blockBack.transparent ) )
	{
		if ( !block || typeof block.texture !== 'function' ) return;
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.BACK );
		c = adjustTexCoords( c, blockDistance ); // Ajustar coordenadas de textura para evitar bleeding (solo a distancia)
		
		var lightMultiplier = block.selflit ? 1.0 : 0.6;
		
		// Apply foliage color if this is a leaves block
		var foliageColor = [ 1.0, 1.0, 1.0 ]; // Default white
		if ( block.useFoliageColor && world.renderer ) {
			foliageColor = world.renderer.getFoliageColor( x, z );
		}
		
		// Apply color and light multiplier
		var useFoliage = block.useFoliageColor;
		var color = useFoliage ? foliageColor : [1.0, 1.0, 1.0];
		var r = color[0] * lightMultiplier;
		var g = color[1] * lightMultiplier;
		var b = color[2] * lightMultiplier;
		
		// Coordenadas: x, y (altura), z (horizontal)
		// El shader espera: x, y (horizontal), z (altura)
		// Por lo tanto, intercambiamos y y z: [x, z, y]
		// Aplicar yOffset para animaciones
		var renderY = y + yOffset;
		pushQuad(
			vertices,
			[ x - OFFSET, z + 1.0 + OFFSET, renderY + bH, c[2], c[1], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, z + 1.0 + OFFSET, renderY + bH, c[0], c[1], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, z + 1.0 + OFFSET, renderY, c[0], c[3], r, g, b, 1.0 ],
			[ x - OFFSET, z + 1.0 + OFFSET, renderY, c[2], c[3], r, g, b, 1.0 ]
		);
	}
	
	// Left - only render if adjacent block is transparent or doesn't exist (AIR)
	// Left es X-1
	// Si el bloque está animado, siempre mostrar las caras laterales (está en el aire)
	var shouldRenderLeft = shouldRenderFaceBetweenBlocks( block, blockLeft, x, y, z, x - 1, y, z );
	if ( shouldRenderLeft && ( yOffset != 0 || x == 0 || !blockLeft || blockLeft == BLOCK.AIR || blockLeft.transparent ) )
	{
		if ( !block || typeof block.texture !== 'function' ) return;
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.LEFT );
		c = adjustTexCoords( c, blockDistance ); // Ajustar coordenadas de textura para evitar bleeding (solo a distancia)
		
		var lightMultiplier = block.selflit ? 1.0 : 0.6;
		
		// Apply foliage color if this is a leaves block
		var foliageColor = [ 1.0, 1.0, 1.0 ]; // Default white
		if ( block.useFoliageColor && world.renderer ) {
			foliageColor = world.renderer.getFoliageColor( x, z );
		}
		
		// Apply color and light multiplier
		var useFoliage = block.useFoliageColor;
		var color = useFoliage ? foliageColor : [1.0, 1.0, 1.0];
		var r = color[0] * lightMultiplier;
		var g = color[1] * lightMultiplier;
		var b = color[2] * lightMultiplier;
		
		// Coordenadas: x, y (altura), z (horizontal)
		// El shader espera: x, y (horizontal), z (altura)
		// Por lo tanto, intercambiamos y y z: [x, z, y]
		// Aplicar yOffset para animaciones
		var renderY = y + yOffset;
		pushQuad(
			vertices,
			[ x - OFFSET, z - OFFSET, renderY + bH, c[2], c[1], r, g, b, 1.0 ],
			[ x - OFFSET, z + 1.0 + OFFSET, renderY + bH, c[0], c[1], r, g, b, 1.0 ],
			[ x - OFFSET, z + 1.0 + OFFSET, renderY, c[0], c[3], r, g, b, 1.0 ],
			[ x - OFFSET, z - OFFSET, renderY, c[2], c[3], r, g, b, 1.0 ]
		);
	}
	
	// Right - only render if adjacent block is transparent or doesn't exist (AIR)
	// Right es X+1
	// Si el bloque está animado, siempre mostrar las caras laterales (está en el aire)
	var shouldRenderRight = shouldRenderFaceBetweenBlocks( block, blockRight, x, y, z, x + 1, y, z );
	if ( shouldRenderRight && ( yOffset != 0 || x == world.sx - 1 || !blockRight || blockRight == BLOCK.AIR || blockRight.transparent ) )
	{
		if ( !block || typeof block.texture !== 'function' ) return;
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.RIGHT );
		c = adjustTexCoords( c, blockDistance ); // Ajustar coordenadas de textura para evitar bleeding (solo a distancia)
		
		// Verificar iluminación del bloque adyacente
		var adjLightY = (lightmap[x+1] && lightmap[x+1][z] !== undefined) ? lightmap[x+1][z] : -1;
		var lightMultiplier = ( x == world.sx - 1 || y >= adjLightY ) ? 1.0 : 0.6;
		if ( block.selflit ) lightMultiplier = 1.0;
		
		// Apply foliage color if this is a leaves block
		var foliageColor = [ 1.0, 1.0, 1.0 ]; // Default white
		if ( block.useFoliageColor && world.renderer ) {
			foliageColor = world.renderer.getFoliageColor( x, z );
		}
		
		// Apply color and light multiplier
		var useFoliage = block.useFoliageColor;
		var color = useFoliage ? foliageColor : [1.0, 1.0, 1.0];
		var r = color[0] * lightMultiplier;
		var g = color[1] * lightMultiplier;
		var b = color[2] * lightMultiplier;
		
		// Coordenadas: x, y (altura), z (horizontal)
		// El shader espera: x, y (horizontal), z (altura)
		// Por lo tanto, intercambiamos y y z: [x, z, y]
		// Aplicar yOffset para animaciones
		var renderY = y + yOffset;
		pushQuad(
			vertices,
			[ x + 1.0 + OFFSET, z - OFFSET, renderY, c[0], c[3], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, z + 1.0 + OFFSET, renderY, c[2], c[3], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, z + 1.0 + OFFSET, renderY + bH, c[2], c[1], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, z - OFFSET, renderY + bH, c[0], c[1], r, g, b, 1.0 ]
		);
	}
}

// pushPickingVertices( vertices, x, y, z )
//
// Pushes vertices with the data needed for picking.

BLOCK.pushPickingVertices = function( vertices, x, y, z )
{
	// Ejes del mundo: X y Z = horizontal, Y = vertical (altura)
	// blocks[x][y][z] donde x=X, y=Y(altura), z=Z(horizontal)
	// El shader espera: x, y (horizontal), z (altura)
	// Por lo tanto, intercambiamos y y z: [x, z, y] donde z es altura para el shader
	
	// Top (Y+1, arriba)
	var colorTop = BLOCK.getPickingColor( x, y, z, 1 );
	pushQuad(
		vertices,
		[ x, z, y + 1, 0, 0, colorTop[0], colorTop[1], colorTop[2], colorTop[3] ],
		[ x + 1, z, y + 1, 1, 0, colorTop[0], colorTop[1], colorTop[2], colorTop[3] ],
		[ x + 1, z + 1, y + 1, 1, 1, colorTop[0], colorTop[1], colorTop[2], colorTop[3] ],
		[ x, z + 1, y + 1, 0, 0, colorTop[0], colorTop[1], colorTop[2], colorTop[3] ]
	);
	
	// Bottom (Y-1, abajo)
	var colorBottom = BLOCK.getPickingColor( x, y, z, 2 );
	pushQuad(
		vertices,
		[ x, z + 1, y, 0, 0, colorBottom[0], colorBottom[1], colorBottom[2], colorBottom[3] ],
		[ x + 1, z + 1, y, 1, 0, colorBottom[0], colorBottom[1], colorBottom[2], colorBottom[3] ],
		[ x + 1, z, y, 1, 1, colorBottom[0], colorBottom[1], colorBottom[2], colorBottom[3] ],
		[ x, z, y, 0, 0, colorBottom[0], colorBottom[1], colorBottom[2], colorBottom[3] ]
	);
	
	// Front (Z-1, hacia -Z, horizontal)
	var colorFront = BLOCK.getPickingColor( x, y, z, 3 );
	pushQuad(
		vertices,
		[ x, z, y, 0, 0, colorFront[0], colorFront[1], colorFront[2], colorFront[3] ],
		[ x + 1, z, y, 1, 0, colorFront[0], colorFront[1], colorFront[2], colorFront[3] ],
		[ x + 1, z, y + 1, 1, 1, colorFront[0], colorFront[1], colorFront[2], colorFront[3] ],
		[ x, z, y + 1, 0, 0, colorFront[0], colorFront[1], colorFront[2], colorFront[3] ]
	);
	
	// Back (Z+1, hacia +Z, horizontal)
	var colorBack = BLOCK.getPickingColor( x, y, z, 4 );
	pushQuad(
		vertices,
		[ x, z + 1, y + 1, 0, 0, colorBack[0], colorBack[1], colorBack[2], colorBack[3] ],
		[ x + 1, z + 1, y + 1, 1, 0, colorBack[0], colorBack[1], colorBack[2], colorBack[3] ],
		[ x + 1, z + 1, y, 1, 1, colorBack[0], colorBack[1], colorBack[2], colorBack[3] ],
		[ x, z + 1, y, 0, 0, colorBack[0], colorBack[1], colorBack[2], colorBack[3] ]
	);
	
	// Left (X-1)
	var colorLeft = BLOCK.getPickingColor( x, y, z, 5 );
	pushQuad(
		vertices,
		[ x, z + 1, y, 0, 0, colorLeft[0], colorLeft[1], colorLeft[2], colorLeft[3] ],
		[ x, z + 1, y + 1, 1, 0, colorLeft[0], colorLeft[1], colorLeft[2], colorLeft[3] ],
		[ x, z, y + 1, 1, 1, colorLeft[0], colorLeft[1], colorLeft[2], colorLeft[3] ],
		[ x, z, y, 0, 0, colorLeft[0], colorLeft[1], colorLeft[2], colorLeft[3] ]
	);
	
	// Right (X+1)
	var colorRight = BLOCK.getPickingColor( x, y, z, 6 );
	pushQuad(
		vertices,
		[ x + 1, z, y, 0, 0, colorRight[0], colorRight[1], colorRight[2], colorRight[3] ],
		[ x + 1, z + 1, y, 1, 0, colorRight[0], colorRight[1], colorRight[2], colorRight[3] ],
		[ x + 1, z + 1, y + 1, 1, 1, colorRight[0], colorRight[1], colorRight[2], colorRight[3] ],
		[ x + 1, z, y + 1, 0, 0, colorRight[0], colorRight[1], colorRight[2], colorRight[3] ]
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

// break( progress, dir )
//
// Returns the break/crack texture coordinates for the given progress (0-1) and direction.
// Progress is a value between 0 (not broken) and 1 (fully broken).
// In terrain.png, break textures are typically in the top rows:
// - Row 15 (0-15): break stage 0-9 (0%, 10%, 20%, ..., 90%)
// Each break texture is 16x16 pixels, arranged in a row from left to right.
// Coordinates format: [u_min, v_min, u_max, v_max] in normalized [0-1] range.

BLOCK.break = function( progress, dir )
{
	if ( progress <= 0 ) return null; // No break texture if not breaking
	
	// Clamp progress to [0, 1]
	progress = Math.max( 0, Math.min( 1, progress ) );
	
	// Calculate break stage (0-9, representing 0%, 10%, 20%, ..., 90%)
	// Stage 0 = 0-10%, Stage 1 = 10-20%, etc.
	var stage = Math.floor( progress * 10 );
	// Cap at stage 9 (90% broken)
	if ( stage >= 10 ) stage = 9;
	
	// Break textures in terrain.png are typically in row 15 (y = 15/16 = 0.9375)
	// Each stage is 16 pixels wide, starting at x = stage * 16
	// In a 256x256 texture with 16x16 grid: each cell is 1/16 of texture
	var texX = stage / 16; // X position in normalized coordinates (0-1)
	var texY = 15 / 16;    // Y position (row 15, 0-indexed)
	
	// Return texture coordinates [u_min, v_min, u_max, v_max]
	// Each break texture is 16x16 pixels (1/16 of texture)
	return [
		texX,           // u_min: left edge
		texY,           // v_min: top edge
		texX + 1/16,    // u_max: right edge
		texY + 1/16     // v_max: bottom edge
	];
}

// Ensure it's available globally one more time
if ( typeof window !== 'undefined' ) {
	window.BLOCK = BLOCK;
}
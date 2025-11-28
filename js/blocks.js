// ==========================================
// Block types
//
// This file contains all available block types and their properties.
// ========================================== 

// Direction enumeration
var DIRECTION = {};
// Directions for block faces (outside the block)
DIRECTION.UP = 1;
DIRECTION.DOWN = 2;
DIRECTION.LEFT = 3;
DIRECTION.RIGHT = 4;
DIRECTION.FORWARD = 5;
DIRECTION.BACK = 6;
// Direction for interior faces (inside the block) for only on block types that need it (like ladders)
// This direction should be used only when rendering ladder faces against walls
DIRECTION.INSIDE = 7;

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
	transparent: true,
	solid: false,
	gravity: false,
	fluid: false,
	flammable: false,
	explosive: false,
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
	itemdrop: 2,
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
	spawnable: true,
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
	spawnable: true,
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
BLOCK.STONE = {
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
	// Texture function returns different textures based on face direction (like Minecraft vanilla)
	texture: function( world, lightmap, lit, x, y, z, dir ) { 
		// Base plank texture coordinates
		var plankTex = [ 4/16, 0/16, 5/16, 1/16 ];
		
		// For stairs, different faces use different parts of the texture
		// In Minecraft vanilla, stairs have:
		// - Top face: uses top texture (same as plank top)
		// - Bottom face: uses bottom texture (same as plank bottom)
		// - Side faces: use side texture (same as plank side)
		if ( dir == DIRECTION.UP ) {
			// Top face - uses plank top texture
			return plankTex;
		} else if ( dir == DIRECTION.DOWN ) {
			// Bottom face - uses plank bottom texture
			return plankTex;
		} else {
			// Side faces (LEFT, RIGHT, FORWARD, BACK) - uses plank side texture
			return plankTex;
		}
	},
	// Stairs are special blocks that need custom collision and rendering
	// TODO: Add orientation support (facing direction)
	// TODO: Add custom collision box (half block height on one side)
	isStairs: true
};

// cobblestone.stairs
// Cobblestone stairs block
BLOCK.COBBLESTONE_STAIRS = {
	id: 25,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	solid: true,
	flammable: false,
	explosive: false,
	bloctype: "stairs",
	breakable: true,
	requiredtool: "pickaxe",
	tooltime: 5000,
	toollevel: 1,
	breaktime: 10000,
	// Texture function returns different textures based on face direction (like Minecraft vanilla)
	texture: function( world, lightmap, lit, x, y, z, dir ) { 
		// Base cobblestone texture coordinates
		var cobbleTex = [ 0/16, 1/16, 1/16, 2/16 ];
		
		// For stairs, different faces use different parts of the texture
		if ( dir == DIRECTION.UP ) {
			// Top face - uses cobblestone top texture
			return cobbleTex;
		} else if ( dir == DIRECTION.DOWN ) {
			// Bottom face - uses cobblestone bottom texture
			return cobbleTex;
		} else {
			// Side faces (LEFT, RIGHT, FORWARD, BACK) - uses cobblestone side texture
			return cobbleTex;
		}
	},
	isStairs: true
};

// .ladder
// Ladder block (can be placed only on walls) onwall: true, onfloor:false,
// Only renders the face against the block it's attached to (is not happening yet)
// Acts as transparent block to avoid collision bugs
BLOCK.LADDER = {
	id: 28,
	spawnable: true,
	bloctype: "ladder",
	onfloor: false, // it means that the ladder cannot be on the floor
	onwall: true, // it means that the ladder cannot be on the wall
	transparent: true, // Transparent to avoid collision bugs
	selflit: false,
	gravity: false,
	fluid: false,
	solid: false, // Not solid to avoid collision issues
	flammable: false,
	explosive: false,
	breakable: true,
	requiredtool: "none",
	tooltime: 5000,
	toollevel: 1,
	breaktime: 10000,
	texture: function( world, lightmap, lit, x, y, z, dir ) { 
		// Ladder texture in terrain.png - based on thumbnails/ladder.png reference
		// In Minecraft vanilla, ladder texture is typically at position (3, 5) in the 16x16 texture atlas
		// Format: [u_min, v_min, u_max, v_max] in normalized coordinates [0-1]
		// Position (3, 5) means: x = 3/16, y = 5/16, width = 1/16, height = 1/16
		// This matches the wooden ladder texture with vertical stiles and horizontal rungs
		return [ 3/16, 5/16, 4/16, 6/16 ]; 
	},
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

// Crafting Table
BLOCK.CRAFTING_TABLE = {
	id: 27,
	spawnable: true,
	transparent: false,
	selflit: false,
	gravity: false,
	fluid: false,
	solid: true,
	interactive: true, // Can be right-clicked to open GUI
	interaction: "crafting_table", // Interaction type (crafting table, chest, etc.)
	interactionData: {
		type: "crafting_table",
		slots: 9,
		rows: 3,
		columns: 3,
		outputSlots: 1, // 1 slot for crafting output 
		showInventory: true, // shows the inventory integration under the crafting table gui
	},
	breakable: true,
	requiredtool: "axe",
	tooltime: 3000,
	breaktime: 7500,
	texture: function( world, lightmap, lit, x, y, z, dir ) {
		// Crafting table texture - top uses crafting table texture, bottom uses planks, sides use crafting table texture
		// En terrain.png: top = crafting table (11,3), bottom = planks (4,0), sides = crafting table (11,3)
		if ( dir == DIRECTION.UP ) {
			return [ 11/16, 3/16, 12/16, 4/16 ]; // Top texture (crafting table with tools pattern)
		} else if ( dir == DIRECTION.DOWN ) {
			return [ 4/16, 0/16, 5/16, 1/16 ]; // Bottom texture (planks)
		} else {
			return [ 11/16, 3/16, 12/16, 4/16 ]; // Side texture (crafting table)
		}
	}
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
	// 5. Special rule for wall stairs and ladders: render ONLY the face OPPOSITE to solid block
	// Helper function to get ladder wall direction (which side has the solid block)
	var getLadderWallDirection = function( currentX, currentY, currentZ, world ) {
		// Check all 4 horizontal directions to find which side has a solid block
		var blockLeft = world.getBlock( currentX - 1, currentY, currentZ );
		var blockRight = world.getBlock( currentX + 1, currentY, currentZ );
		var blockFront = world.getBlock( currentX, currentY, currentZ - 1 );
		var blockBack = world.getBlock( currentX, currentY, currentZ + 1 );
		
		// Determine which side has the solid block (the wall)
		if ( blockLeft && blockLeft != BLOCK.AIR && blockLeft.solid !== false ) {
			return "left"; // Wall is on left (x-1)
		} else if ( blockRight && blockRight != BLOCK.AIR && blockRight.solid !== false ) {
			return "right"; // Wall is on right (x+1)
		} else if ( blockFront && blockFront != BLOCK.AIR && blockFront.solid !== false ) {
			return "front"; // Wall is on front (z-1)
		} else if ( blockBack && blockBack != BLOCK.AIR && blockBack.solid !== false ) {
			return "back"; // Wall is on back (z+1)
		}
		return null; // No solid wall found
	};
	
	var shouldRenderFaceBetweenBlocks = function( currentBlock, adjacentBlock, currentX, currentY, currentZ, adjacentX, adjacentY, adjacentZ ) {
		// Special rule for ladders: render ONLY the face that is AGAINST the solid block
		if ( currentBlock.bloctype === "ladder" ) {
			// Determine which face we're checking based on adjacent block position
			var checkingFace = null;
			if ( adjacentX < currentX ) {
				checkingFace = "left"; // Checking left face (x-1)
			} else if ( adjacentX > currentX ) {
				checkingFace = "right"; // Checking right face (x+1)
			} else if ( adjacentZ < currentZ ) {
				checkingFace = "front"; // Checking front face (z-1)
			} else if ( adjacentZ > currentZ ) {
				checkingFace = "back"; // Checking back face (z+1)
			} else {
				// Vertical face (top or bottom) - never render for ladders
				return false;
			}
			
			// Check if the adjacent block (the one we're checking against) is solid
			// For ladders, we render the face that is AGAINST a solid block
			// So if adjacentBlock is solid, we should render this face
			if ( adjacentBlock && adjacentBlock != BLOCK.AIR && adjacentBlock.solid !== false ) {
				// The adjacent block is solid, so render this face (it's against the wall)
				return true;
			}
			
			// If adjacent block is not solid, don't render this face
			return false;
		}
		
		// Special rule for wall stairs (keep existing logic)
		if ( currentBlock.isWallStairs ) {
			// If adjacent block is solid (not transparent), don't render this face (it's against the wall)
			if ( adjacentBlock && adjacentBlock != BLOCK.AIR && !adjacentBlock.transparent ) {
				return false; // Don't render faces against solid blocks
			}
			// If adjacent block is air or transparent, render this face (it's visible to the player)
			return true;
		}
		
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
		
		// Special handling for stairs: top face is only half the block (like Minecraft vanilla)
		// Stairs have the flat part on the top half of the block
		var isStairs = (block && block.isStairs);
		if ( isStairs ) {
			// For stairs, render only the top half of the block (the flat part)
			// The top face should be at y + 0.5 (half block height) instead of y + 1.0
			// Default orientation: stairs face forward (Z-1), so the flat part is in the back half (Z+0.5 to Z+1.0)
			// For now, use default orientation (facing forward/back)
			// TODO: Use actual block orientation when metadata is implemented
			var stairsTopHeight = 0.5; // Half block height for stairs top
			var stairsTopZStart = 0.5; // Start at middle of block (default: back half)
			var stairsTopZEnd = 1.0; // End at back edge
			
			// Render the top face of the stairs (only the flat part)
			pushQuad(
				vertices,
				[ x - OFFSET, z + stairsTopZStart - OFFSET, renderY + stairsTopHeight, c[0], c[1], r, g, b, 1.0 ],
				[ x + 1.0 + OFFSET, z + stairsTopZStart - OFFSET, renderY + stairsTopHeight, c[2], c[1], r, g, b, 1.0 ],
				[ x + 1.0 + OFFSET, z + stairsTopZEnd + OFFSET, renderY + stairsTopHeight, c[2], c[3], r, g, b, 1.0 ],
				[ x - OFFSET, z + stairsTopZEnd + OFFSET, renderY + stairsTopHeight, c[0], c[3], r, g, b, 1.0 ]
			);
		} else {
			// Normal block: render full top face
			pushQuad(
				vertices,
				[ x - OFFSET, z - OFFSET, renderY + bH, c[0], c[1], r, g, b, 1.0 ],
				[ x + 1.0 + OFFSET, z - OFFSET, renderY + bH, c[2], c[1], r, g, b, 1.0 ],
				[ x + 1.0 + OFFSET, z + 1.0 + OFFSET, renderY + bH, c[2], c[3], r, g, b, 1.0 ],
				[ x - OFFSET, z + 1.0 + OFFSET, renderY + bH, c[0], c[3], r, g, b, 1.0 ]
			);
		}
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
	// Exception: ladders render against solid blocks, so allow rendering even if adjacent block is solid
	var shouldRenderFront = shouldRenderFaceBetweenBlocks( block, blockFront, x, y, z, x, y, z - 1 );
	// For ladders: if shouldRenderFaceBetweenBlocks says to render, always render (even against solid blocks)
	// This is a special case - ladders need to render against solid walls
	var isLadder = (block && block.bloctype === "ladder");
	var isLadderFace = (isLadder && shouldRenderFront);
	if ( shouldRenderFront && ( yOffset != 0 || z == 0 || !blockFront || blockFront == BLOCK.AIR || blockFront.transparent || isLadderFace ) )
	{
		if ( !block || typeof block.texture !== 'function' ) return;
		// For ladders against walls, use DIRECTION.INSIDE instead of normal direction
		var textureDir = (isLadderFace) ? DIRECTION.INSIDE : DIRECTION.FORWARD;
		var c = block.texture( world, lightmap, blockLit, x, y, z, textureDir );
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
		
		// For ladders: apply offset to render face slightly away from wall (1/16 block = 1 pixel)
		// Use variable direction to determine wall side and apply offset accordingly
		var ladderOffsetX = 0;
		var ladderOffsetZ = 0;
		if ( block.bloctype === "ladder" ) {
			var wallDir = getLadderWallDirection( x, y, z, world );
			// Ladder face should be 1/16 block (0.0625) away from the wall, towards the inside
			// If wall is on left (x-1), offset towards -X (inside)
			// If wall is on right (x+1), offset towards +X (inside)
			// If wall is on front (z-1), offset towards -Z (inside)
			// If wall is on back (z+1), offset towards +Z (inside)
			if ( wallDir === "left" ) {
				// Wall at x-1, face at x - OFFSET, move to x - 1 + 1/16 = x - 15/16
				ladderOffsetX = -(1.0 - 1.0/16.0) + OFFSET;
			} else if ( wallDir === "right" ) {
				// Wall at x+1, face at x + 1 + OFFSET, move to x + 1 - 1/16 = x + 15/16
				ladderOffsetX = (1.0 - 1.0/16.0) - OFFSET;
			} else if ( wallDir === "front" ) {
				// Wall at z-1, face at z - OFFSET, move to z - 1 + 1/16 = z - 15/16
				ladderOffsetZ = -(1.0 - 1.0/16.0) + OFFSET;
			} else if ( wallDir === "back" ) {
				// Wall at z+1, face at z + 1 + OFFSET, move to z + 1 - 1/16 = z + 15/16
				ladderOffsetZ = (1.0 - 1.0/16.0) - OFFSET;
			}
		}
		
		pushQuad(
			vertices,
			[ x - OFFSET + ladderOffsetX, z - OFFSET + ladderOffsetZ, renderY, c[0], c[3], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET + ladderOffsetX, z - OFFSET + ladderOffsetZ, renderY, c[2], c[3], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET + ladderOffsetX, z - OFFSET + ladderOffsetZ, renderY + bH, c[2], c[1], r, g, b, 1.0 ],
			[ x - OFFSET + ladderOffsetX, z - OFFSET + ladderOffsetZ, renderY + bH, c[0], c[1], r, g, b, 1.0 ]
		);
	}
	
	// Back - only render if adjacent block is transparent or doesn't exist (AIR)
	// Back es Z+1 (hacia +Z, horizontal)
	// Si el bloque está animado, siempre mostrar las caras laterales (está en el aire)
	// Exception: ladders render against solid blocks, so allow rendering even if adjacent block is solid
	var shouldRenderBack = shouldRenderFaceBetweenBlocks( block, blockBack, x, y, z, x, y, z + 1 );
	// For ladders: if shouldRenderFaceBetweenBlocks says to render, always render (even against solid blocks)
	var isLadder = (block && block.bloctype === "ladder");
	var isLadderFace = (isLadder && shouldRenderBack);
	if ( shouldRenderBack && ( yOffset != 0 || z == world.sz - 1 || !blockBack || blockBack == BLOCK.AIR || blockBack.transparent || isLadderFace ) )
	{
		if ( !block || typeof block.texture !== 'function' ) return;
		// For ladders against walls, use DIRECTION.INSIDE instead of normal direction
		var textureDir = (isLadderFace) ? DIRECTION.INSIDE : DIRECTION.BACK;
		var c = block.texture( world, lightmap, blockLit, x, y, z, textureDir );
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
		
		// For ladders: apply offset to render face slightly away from wall (1/16 block = 1 pixel)
		var ladderOffset = 0;
		if ( block.bloctype === "ladder" ) {
			// Ladder face should be offset 1/16 block (0.0625) away from the wall
			// Back face (z+1) - wall is at z+1, we want ladder face 1/16 away from wall
			// Position: z + 1 - 1/16 = z + 15/16 = z + 0.9375
			// Current face position: z + 1.0 + OFFSET (where OFFSET ≈ 0.001, so ≈ z + 1.001)
			// We need: z + 1.001 + ladderOffset = z + 0.9375
			// Therefore: ladderOffset = 0.9375 - 1.001 = -0.0635
			// But we want: z + 1.0 + OFFSET + ladderOffset = z + 1 - 1/16 = z + 15/16
			// So: ladderOffset = 15/16 - 1 - OFFSET = -1/16 - OFFSET ≈ -1/16
			// Actually simpler: we want face at z + 15/16, current is z + 1 + OFFSET
			// So: ladderOffset = 15/16 - 1 - OFFSET = -1/16 - OFFSET
			ladderOffset = -(1.0/16.0) - OFFSET; // Move towards +Z (towards wall, but 1/16 away from it)
		}
		
		pushQuad(
			vertices,
			[ x - OFFSET, z + 1.0 + OFFSET + ladderOffset, renderY + bH, c[2], c[1], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, z + 1.0 + OFFSET + ladderOffset, renderY + bH, c[0], c[1], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET, z + 1.0 + OFFSET + ladderOffset, renderY, c[0], c[3], r, g, b, 1.0 ],
			[ x - OFFSET, z + 1.0 + OFFSET + ladderOffset, renderY, c[2], c[3], r, g, b, 1.0 ]
		);
	}
	
	// Left - only render if adjacent block is transparent or doesn't exist (AIR)
	// Left es X-1
	// Si el bloque está animado, siempre mostrar las caras laterales (está en el aire)
	// Exception: ladders render against solid blocks, so allow rendering even if adjacent block is solid
	var shouldRenderLeft = shouldRenderFaceBetweenBlocks( block, blockLeft, x, y, z, x - 1, y, z );
	// For ladders: if shouldRenderFaceBetweenBlocks says to render, always render (even against solid blocks)
	var isLadder = (block && block.bloctype === "ladder");
	var isLadderFace = (isLadder && shouldRenderLeft);
	if ( shouldRenderLeft && ( yOffset != 0 || x == 0 || !blockLeft || blockLeft == BLOCK.AIR || blockLeft.transparent || isLadderFace ) )
	{
		if ( !block || typeof block.texture !== 'function' ) return;
		// For ladders against walls, use DIRECTION.INSIDE instead of normal direction
		var textureDir = (isLadderFace) ? DIRECTION.INSIDE : DIRECTION.LEFT;
		var c = block.texture( world, lightmap, blockLit, x, y, z, textureDir );
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
		
		// For ladders: apply offset to render face slightly away from wall (1/16 block = 1 pixel)
		var ladderOffset = 0;
		if ( block.bloctype === "ladder" ) {
			// Ladder face should be offset 1/16 block (0.0625) away from the wall
			// Left face (x-1) - wall is at x-1, we want ladder face 1/16 away from wall
			// Position: x - 1 + 1/16 = x - 15/16 = x - 0.9375
			// Current face position: x - OFFSET (where OFFSET ≈ 0.001, so ≈ x - 0.001)
			// We need: x - 0.001 + ladderOffset = x - 0.9375
			// Therefore: ladderOffset = -0.9375 + 0.001 = -0.9365
			// Actually, we want the face to be 1/16 away from x-1, so at x - 1 + 1/16 = x - 15/16
			// Since face is at x - OFFSET, we need: ladderOffset = -(1 - 1/16) + OFFSET ≈ -(1 - 1/16)
			ladderOffset = -(1.0 - 1.0/16.0) + OFFSET; // = -15/16 + 0.001 = -0.9365
		}
		
		pushQuad(
			vertices,
			[ x - OFFSET + ladderOffset, z - OFFSET, renderY + bH, c[2], c[1], r, g, b, 1.0 ],
			[ x - OFFSET + ladderOffset, z + 1.0 + OFFSET, renderY + bH, c[0], c[1], r, g, b, 1.0 ],
			[ x - OFFSET + ladderOffset, z + 1.0 + OFFSET, renderY, c[0], c[3], r, g, b, 1.0 ],
			[ x - OFFSET + ladderOffset, z - OFFSET, renderY, c[2], c[3], r, g, b, 1.0 ]
		);
	}
	
	// Right - only render if adjacent block is transparent or doesn't exist (AIR)
	// Right es X+1
	// Si el bloque está animado, siempre mostrar las caras laterales (está en el aire)
	// Exception: ladders render against solid blocks, so allow rendering even if adjacent block is solid
	var shouldRenderRight = shouldRenderFaceBetweenBlocks( block, blockRight, x, y, z, x + 1, y, z );
	// For ladders: if shouldRenderFaceBetweenBlocks says to render, always render (even against solid blocks)
	var isLadder = (block && block.bloctype === "ladder");
	var isLadderFace = (isLadder && shouldRenderRight);
	if ( shouldRenderRight && ( yOffset != 0 || x == world.sx - 1 || !blockRight || blockRight == BLOCK.AIR || blockRight.transparent || isLadderFace ) )
	{
		if ( !block || typeof block.texture !== 'function' ) return;
		// For ladders against walls, use DIRECTION.INSIDE instead of normal direction
		var textureDir = (isLadderFace) ? DIRECTION.INSIDE : DIRECTION.RIGHT;
		var c = block.texture( world, lightmap, blockLit, x, y, z, textureDir );
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
		
		// For ladders: apply offset to render face slightly away from wall (1/16 block = 1 pixel)
		var ladderOffset = 0;
		if ( block.bloctype === "ladder" ) {
			// Ladder face should be offset 1/16 block (0.0625) away from the wall
			// Right face (x+1) - wall is at x+1, we want ladder face 1/16 away from wall
			// Position: x + 1 - 1/16 = x + 15/16 = x + 0.9375
			// Current face position: x + 1.0 + OFFSET (where OFFSET ≈ 0.001, so ≈ x + 1.001)
			// We need: x + 1.001 + ladderOffset = x + 0.9375
			// Therefore: ladderOffset = 0.9375 - 1.001 = -0.0635
			// But we want: x + 1.0 + OFFSET + ladderOffset = x + 1 - 1/16 = x + 15/16
			// So: ladderOffset = 15/16 - 1 - OFFSET = -1/16 - OFFSET ≈ -1/16
			ladderOffset = -(1.0/16.0) - OFFSET; // Move towards +X (towards wall, but 1/16 away from it)
		}
		
		pushQuad(
			vertices,
			[ x + 1.0 + OFFSET + ladderOffset, z - OFFSET, renderY, c[0], c[3], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET + ladderOffset, z + 1.0 + OFFSET, renderY, c[2], c[3], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET + ladderOffset, z + 1.0 + OFFSET, renderY + bH, c[2], c[1], r, g, b, 1.0 ],
			[ x + 1.0 + OFFSET + ladderOffset, z - OFFSET, renderY + bH, c[0], c[1], r, g, b, 1.0 ]
		);
	}
	
	// Inner face for stairs - vertical face opposite to the stairs orientation
	// This is the face that connects the flat top part (y+0.5) with the bottom (y+0.0)
	// In Minecraft vanilla, this is a vertical face, not sloped
	var isStairs = (block && block.isStairs);
	if ( isStairs ) {
		// Default orientation: stairs face forward (Z-1), so inner face is on the opposite side (FORWARD/Z-1)
		// The inner face is a vertical face that goes from y=0 to y=0.5
		// It covers the full width (x=0 to x=1) and is on the front side (Z-1) where the stairs face
		// TODO: Use actual block orientation when metadata is implemented
		var stairsInnerZ = -1.0; // Inner face is on the front side (Z-1), opposite to where flat part is
		var stairsInnerYBottom = 0.0; // Bottom of inner face
		var stairsInnerYTop = 0.5; // Top of inner face (where flat part ends)
		
		// Check if inner face should be rendered (only if adjacent block is transparent or AIR)
		// Inner face is on front side (Z-1), so check blockFront
		var shouldRenderInnerFace = shouldRenderFaceBetweenBlocks( block, blockFront, x, y, z, x, y, z - 1 );
		
		if ( shouldRenderInnerFace && ( yOffset != 0 || z == 0 || !blockFront || blockFront == BLOCK.AIR || blockFront.transparent ) ) {
			// Get texture for inner face (forward direction, opposite to back where flat part is)
			if ( !block || typeof block.texture !== 'function' ) return;
			var cInner = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.FORWARD );
			cInner = adjustTexCoords( cInner, blockDistance );
			
			// Light multiplier for inner face
			var lightMultiplierInner = block.selflit ? 1.0 : 0.6;
			
			// Apply foliage color if needed
			var foliageColorInner = [ 1.0, 1.0, 1.0 ];
			if ( block.useFoliageColor && world.renderer ) {
				foliageColorInner = world.renderer.getFoliageColor( x, z );
			}
			
			var useFoliageInner = block.useFoliageColor;
			var colorInner = useFoliageInner ? foliageColorInner : [1.0, 1.0, 1.0];
			var rInner = colorInner[0] * lightMultiplierInner;
			var gInner = colorInner[1] * lightMultiplierInner;
			var bInner = colorInner[2] * lightMultiplierInner;
			
			// Render the inner face (vertical, from y=0 to y=0.5, on front side z-1.0)
			// The face is at the edge of the block (z-1.0), opposite to where the flat part is
			// It connects the flat top part (y+0.5) with the bottom (y+0.0)
			// Coordenadas: x, y (altura), z (horizontal)
			// El shader espera: x, y (horizontal), z (altura)
			var renderY = y + yOffset;
			// Inner face is at z-1.0 (the front edge), use +OFFSET to keep it at the block edge, not inside adjacent block
			// Face faces outward (away from the center of the block)
			// Use same vertex order as FRONT face (bottom-left → bottom-right → top-right → top-left) for correct front-facing
			// This ensures the face is front-facing (CCW) and visible from outside the block
			pushQuad(
				vertices,
				[ x - OFFSET, z + stairsInnerZ + OFFSET, renderY + stairsInnerYBottom, cInner[0], cInner[3], rInner, gInner, bInner, 1.0 ],
				[ x + 1.0 + OFFSET, z + stairsInnerZ + OFFSET, renderY + stairsInnerYBottom, cInner[2], cInner[3], rInner, gInner, bInner, 1.0 ],
				[ x + 1.0 + OFFSET, z + stairsInnerZ + OFFSET, renderY + stairsInnerYTop, cInner[2], cInner[1], rInner, gInner, bInner, 1.0 ],
				[ x - OFFSET, z + stairsInnerZ + OFFSET, renderY + stairsInnerYTop, cInner[0], cInner[1], rInner, gInner, bInner, 1.0 ]
			);
			
			// Render the sloped face (inclined face) - this is the key face that makes stairs look like stairs
			// In Minecraft vanilla, stairs have a sloped face that connects:
			// - The flat top part (y+0.5, from z+0.5 to z+1.0) 
			// - With the bottom (y+0.0, from z+0.0 to z+0.5)
			// This creates the characteristic "step" appearance
			// The sloped face is a quadrilateral that slopes from high to low
			var stairsSlopeZStart = 0.0; // Start at front edge (where bottom is)
			var stairsSlopeZEnd = 0.5; // End at middle (where flat part starts)
			var stairsSlopeYBottom = 0.0; // Bottom height
			var stairsSlopeYTop = 0.5; // Top height (where flat part is)
			
			// Get texture for sloped face (use UP direction for the sloped surface)
			var cSlope = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.UP );
			cSlope = adjustTexCoords( cSlope, blockDistance );
			
			// Light multiplier for sloped face
			var lightMultiplierSlope = block.selflit ? 1.0 : 0.6;
			
			// Apply foliage color if needed
			var foliageColorSlope = [ 1.0, 1.0, 1.0 ];
			if ( block.useFoliageColor && world.renderer ) {
				foliageColorSlope = world.renderer.getFoliageColor( x, z );
			}
			
			var useFoliageSlope = block.useFoliageColor;
			var colorSlope = useFoliageSlope ? foliageColorSlope : [1.0, 1.0, 1.0];
			var rSlope = colorSlope[0] * lightMultiplierSlope;
			var gSlope = colorSlope[1] * lightMultiplierSlope;
			var bSlope = colorSlope[2] * lightMultiplierSlope;
			
			// Render the sloped face (inclined quadrilateral)
			// Bottom edge: from (z+0.0, y+0.0) to (z+0.5, y+0.0)
			// Top edge: from (z+0.0, y+0.5) to (z+0.5, y+0.5)
			// This creates a sloped surface that connects the bottom with the flat top part
			pushQuad(
				vertices,
				[ x - OFFSET, z + stairsSlopeZStart - OFFSET, renderY + stairsSlopeYBottom, cSlope[0], cSlope[3], rSlope, gSlope, bSlope, 1.0 ],
				[ x + 1.0 + OFFSET, z + stairsSlopeZStart - OFFSET, renderY + stairsSlopeYBottom, cSlope[2], cSlope[3], rSlope, gSlope, bSlope, 1.0 ],
				[ x + 1.0 + OFFSET, z + stairsSlopeZEnd - OFFSET, renderY + stairsSlopeYTop, cSlope[2], cSlope[1], rSlope, gSlope, bSlope, 1.0 ],
				[ x - OFFSET, z + stairsSlopeZEnd - OFFSET, renderY + stairsSlopeYTop, cSlope[0], cSlope[1], rSlope, gSlope, bSlope, 1.0 ]
			);
		}
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
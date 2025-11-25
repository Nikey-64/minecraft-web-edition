// ==========================================
// Block types
//
// This file contains all available block types and their properties.
// ========================================== arregla esto XD

// Direction enumeration (esta mal, pero funciona , funciona mal!)
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
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 0/16, 3/16, 1/16, 4/16 ]; }
};

// Leaves (not implemented yet)
BLOCK.LEAVES = {
	id: 19,
	spawnable: true,
	transparent: true,
	solid: true,
	flammable: true,
	explosive: false,
	useFoliageColor: true, // Flag to indicate this block uses foliage color filtering on all faces
	texture: function( world, lightmap, lit, x, y, z, dir ) { return [ 4/16, 3/16, 5/16, 4/16 ]; }
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
	// NOTA: transparent NO se define aquí porque debe tomarse del bloque original
	// Cada bloque animado mantiene su transparencia original para poder devolverla después
	const: false,
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
	// Verificar que el bloque existe y tiene la función texture
	else if ( !block || typeof block.texture !== 'function' ) {
		block = BLOCK.AIR;
	}
	// Si el bloque ya es un bloque animado (viene del sistema de física), usarlo directamente
	// Esto asegura que mantiene las propiedades del bloque original
	else if ( block.isAnimated && block.originalBlock ) {
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
	
	// Top - only render if adjacent block is transparent or doesn't exist (AIR)
	// Top es Y+1 (arriba)
	// Si el bloque está animado, siempre mostrar la cara superior (está en el aire)
	if ( yOffset != 0 || y == world.sy - 1 || !blockTop || blockTop == BLOCK.AIR || blockTop.transparent || block.fluid )
	{
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.UP );
		c = adjustTexCoords( c, blockDistance ); // Ajustar coordenadas de textura para evitar bleeding (solo a distancia)
		
		// lightmap[x][z] almacena la altura Y del bloque más alto no transparente
		var lightMultiplier = (lightmap[x] && lightmap[x][z] !== undefined && y >= lightmap[x][z]) ? 1.0 : 0.6;
		if ( block.selflit ) lightMultiplier = 1.0;
		
		// Apply grass color filter if this is a grass block top face
		// Apply foliage color filter if this is a leaves block (all faces)
		var grassColor = [ 1.0, 1.0, 1.0 ]; // Default white
		var foliageColor = [ 1.0, 1.0, 1.0 ]; // Default GREE
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
	// Los bloques animados se comportan como si estuvieran en el aire, mostrando todas las caras
	if ( yOffset != 0 || y == 0 || !blockBottom || blockBottom == BLOCK.AIR || blockBottom.transparent )
	{
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
	if ( yOffset != 0 || z == 0 || !blockFront || blockFront == BLOCK.AIR || blockFront.transparent )
	{
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
	if ( yOffset != 0 || z == world.sz - 1 || !blockBack || blockBack == BLOCK.AIR || blockBack.transparent )
	{
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.BACK );
		c = adjustTexCoords( c, blockDistance ); // Ajustar coordenadas de textura para evitar bleeding (solo a distancia)
		
		var lightMultiplier = block.selflit ? 1.0 : 0.6;
		
		// Apply foliage color if this is a leaves block
		var foliageColor = [ 1.0, 1.0, 1.0 ]; // Default GREEN! las hojas sonverdes
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
	if ( yOffset != 0 || x == 0 || !blockLeft || blockLeft == BLOCK.AIR || blockLeft.transparent )
	{
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.LEFT );
		c = adjustTexCoords( c, blockDistance ); // Ajustar coordenadas de textura para evitar bleeding (solo a distancia)
		
		var lightMultiplier = block.selflit ? 1.0 : 0.6;
		
		// Apply foliage color if this is a leaves block
		var foliageColor = [ 1.0, 1.0, 1.0 ]; // Default green! las hojas son verdes
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
	if ( yOffset != 0 || x == world.sx - 1 || !blockRight || blockRight == BLOCK.AIR || blockRight.transparent )
	{
		var c = block.texture( world, lightmap, blockLit, x, y, z, DIRECTION.RIGHT );
		c = adjustTexCoords( c, blockDistance ); // Ajustar coordenadas de textura para evitar bleeding (solo a distancia)
		
		// Verificar iluminación del bloque adyacente
		var adjLightY = (lightmap[x+1] && lightmap[x+1][z] !== undefined) ? lightmap[x+1][z] : -1;
		var lightMultiplier = ( x == world.sx - 1 || y >= adjLightY ) ? 1.0 : 0.6;
		if ( block.selflit ) lightMultiplier = 1.0;
		
		// Apply foliage color if this is a leaves block
		var foliageColor = [ 1.0, 1.0, 1.0 ]; // Default green! las hojas deben ser verdes
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

// Ensure it's available globally one more time
if ( typeof window !== 'undefined' ) {
	window.BLOCK = BLOCK;
}
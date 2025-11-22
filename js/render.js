// ==========================================
// Renderer
//
// This class contains the code that takes care of visualising the
// elements in the specified world.
// ==========================================

// Shaders
var vertexSource =
	"uniform mat4 uProjMatrix;"+
	"uniform mat4 uViewMatrix;"+
	"uniform mat4 uModelMatrix;"+
	"attribute vec3 aPos;"+
	"attribute vec4 aColor;"+
	"attribute vec2 aTexCoord;"+
	"varying vec4 vColor;"+
	"varying vec2 vTexCoord;"+
	"void main() {"+
	"	gl_Position = uProjMatrix * uViewMatrix * ( uModelMatrix * vec4( aPos, 1.0 ) );"+
	"	vColor = aColor;"+
	"	vTexCoord = aTexCoord;"+
	"}";
var fragmentSource =
	"precision highp float;"+
	"uniform sampler2D uSampler;"+
	"varying vec4 vColor;"+
	"varying vec2 vTexCoord;"+
	"void main() {"+
	"	vec4 color = texture2D( uSampler, vec2( vTexCoord.s, vTexCoord.t ) ) * vec4( vColor.rgb, 1.0 );"+
	"	if ( color.a < 0.1 ) discard;"+
	"	gl_FragColor = vec4( color.rgb, vColor.a );"+
	"}";

// Constructor( id )
//
// Creates a new renderer with the specified canvas as target.
//
// id - Identifier of the HTML canvas element to render to.

function Renderer( id )
{
	var canvas = this.canvas = document.getElementById( id );
	canvas.renderer = this;
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;

	this.renderDistance = parseInt(localStorage.getItem('renderDistance')) || 8; // chunks default radius
	this.chunkSize = 16; // Default chunk size (16x16x16 preferred for optimal performance) (8 is better for laptops and mobile devices)
	this.camPos = [0, 0, 0]; // Initialize camera position
	this.camAng = [0, 0, 0]; // Initialize camera angles
	this.renderBehind = false; // Option to not render chunks behind the player (disabled by default)

	// Initialise WebGL
	var gl;
	try
	{
		gl = this.gl = canvas.getContext( "experimental-webgl" );
	} catch ( e ) {
		throw "Your browser doesn't support WebGL!";
	}
	
	gl.viewportWidth = canvas.width;
	gl.viewportHeight = canvas.height;
	
	gl.clearColor( 0.62, 0.81, 1.0, 1.0 );
	gl.enable( gl.DEPTH_TEST );
	gl.enable( gl.CULL_FACE );
	gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
	
	
	// Load shaders
	this.loadShaders();
	
	// Load player model
	this.loadPlayerHeadModel();
	this.loadPlayerBodyModel();
	
	// Create projection and view matrices
	var projMatrix = this.projMatrix = mat4.create();
	var viewMatrix = this.viewMatrix = mat4.create();
	
	// Create dummy model matrix
	var modelMatrix = this.modelMatrix = mat4.create();
	mat4.identity( modelMatrix );
	gl.uniformMatrix4fv( this.uModelMat, false, modelMatrix );
	
	// Create 1px white texture for pure vertex color operations (e.g. picking)
	var whiteTexture = this.texWhite = gl.createTexture();
	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( gl.TEXTURE_2D, whiteTexture );
	var white = new Uint8Array( [ 255, 255, 255, 255 ] );
	gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, white );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
	gl.uniform1i(  this.uSampler, 0 );
	
	// Load player texture
	var playerTexture = this.texPlayer = gl.createTexture();
	playerTexture.image = new Image();
	playerTexture.image.onload = function()
	{
		gl.bindTexture( gl.TEXTURE_2D, playerTexture );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, playerTexture.image );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
	};
	playerTexture.image.src = "media/player.png";
	
	// Load terrain texture
	var terrainTexture = this.texTerrain = gl.createTexture();
	terrainTexture.image = new Image();
	terrainTexture.image.onload = function()
	{
		gl.bindTexture( gl.TEXTURE_2D, terrainTexture );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, terrainTexture.image );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
	};
	terrainTexture.image.src = "media/terrain.png";
	
	// Load grass color texture for biome coloring
	var grassColorTexture = this.texGrassColor = gl.createTexture();
	grassColorTexture.image = new Image();
	grassColorTexture.image.onload = function()
	{
		gl.bindTexture( gl.TEXTURE_2D, grassColorTexture );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, grassColorTexture.image );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT );
		
		// Create canvas to read pixel data from grass color texture
		var canvas = document.createElement( "canvas" );
		canvas.width = grassColorTexture.image.width;
		canvas.height = grassColorTexture.image.height;
		var ctx = canvas.getContext( "2d" );
		ctx.drawImage( grassColorTexture.image, 0, 0 );
		grassColorTexture.imageData = ctx.getImageData( 0, 0, canvas.width, canvas.height );
	};
	grassColorTexture.image.onerror = function()
	{
		console.warn( "Failed to load grasscolor.png, grass blocks will appear white" );
		grassColorTexture.imageData = null;
	};
	grassColorTexture.image.src = "media/misc/grasscolor.png";
	
	// Create canvas used to draw name tags
	var textCanvas = this.textCanvas = document.createElement( "canvas" );
	textCanvas.width = 256;
	textCanvas.height = 64;
	textCanvas.style.display = "none";
	var ctx = this.textContext = textCanvas.getContext( "2d" );
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = "24px Minecraftia";
	document.getElementsByTagName( "body" )[0].appendChild( textCanvas );
}

// draw()
//
// Render one frame of the world to the canvas.

Renderer.prototype.draw = function()
{
	var gl = this.gl;

	// Initialise view
	this.updateViewport();
	gl.viewport( 0, 0, gl.viewportWidth, gl.viewportHeight );
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

	// Update chunks based on player position (only every N frames to reduce overhead)
	if (!this._updateChunksFrameCount) this._updateChunksFrameCount = 0;
	this._updateChunksFrameCount++;
	if (this._updateChunksFrameCount >= 5) { // Update chunks every 5 frames
		var updateStart = performance.now();
		this.updateChunks();
		var updateTime = performance.now() - updateStart;
		if (this._updateChunksStats) {
			this._updateChunksStats.total += updateTime;
			this._updateChunksStats.count++;
			if (updateTime > this._updateChunksStats.max) this._updateChunksStats.max = updateTime;
		} else {
			this._updateChunksStats = { total: updateTime, count: 1, max: updateTime };
		}
		this._updateChunksFrameCount = 0;
	}
	
	// Actualizar buffer de bloques animados solo si hay cambios o cada N frames (optimizado)
	if ( !this._animatedBlocksFrameCount ) this._animatedBlocksFrameCount = 0;
	this._animatedBlocksFrameCount++;
	var hasAnimations = this.world.blockAnimations && Object.keys(this.world.blockAnimations).length > 0;
	// Actualizar cada 2 frames o si hay cambios marcados (más frecuente para animaciones suaves)
	if ( hasAnimations && ( this._animatedBlocksFrameCount >= 2 || this._animatedBlocksDirty ) ) {
		this.updateAnimatedBlocksBuffer();
		this._animatedBlocksFrameCount = 0;
		this._animatedBlocksDirty = false;
	} else if ( !hasAnimations && this.animatedBlocksBuffer ) {
		// Limpiar buffer si no hay animaciones
		this.updateAnimatedBlocksBuffer();
	}

	// Draw level chunks
	var chunks = this.chunks;

	gl.bindTexture( gl.TEXTURE_2D, this.texTerrain );

	if ( chunks != null )
	{
		for ( var i = 0; i < chunks.length; i++ )
		{
			if ( chunks[i].loaded && chunks[i].buffer != null )
				this.drawBuffer( chunks[i].buffer );
		}
	}
	
	// Dibujar bloques animados (buffer separado, más eficiente)
	if ( this.animatedBlocksBuffer && this.animatedBlocksBuffer.vertices > 0 )
	{
		this.drawBuffer( this.animatedBlocksBuffer );
	}

	// Draw players
	var players = this.world.players;
	
	gl.enable( gl.BLEND );
	
	for ( var p in world.players )
	{
		var player = world.players[p];

		if(player.moving || Math.abs(player.aniframe) > 0.1){
			player.aniframe += 0.15;
			if(player.aniframe > Math.PI)
				player.aniframe  = -Math.PI;
			aniangle = Math.PI/2 * Math.sin(player.aniframe);
			if(!player.moving && Math.abs(aniangle) < 0.1 )
				player.aniframe = 0;


		}
		else
			aniangle = 0;
		
		// Draw head		
		var pitch = player.pitch;
		if ( pitch < -0.32 ) pitch = -0.32;
		if ( pitch > 0.32 ) pitch = 0.32;
		
		mat4.identity( this.modelMatrix );
		mat4.translate( this.modelMatrix, [ player.x, player.y, player.z + 1.7 ] );
		mat4.rotateZ( this.modelMatrix, Math.PI - player.yaw );
		mat4.rotateX( this.modelMatrix, -pitch );
		gl.uniformMatrix4fv( this.uModelMat, false, this.modelMatrix );
		
		gl.bindTexture( gl.TEXTURE_2D, this.texPlayer );
		this.drawBuffer( this.playerHead );
		
		// Draw body
		mat4.identity( this.modelMatrix );
		mat4.translate( this.modelMatrix, [ player.x, player.y, player.z + 0.01 ] );
		mat4.rotateZ( this.modelMatrix, Math.PI - player.yaw );
		gl.uniformMatrix4fv( this.uModelMat, false, this.modelMatrix );
		this.drawBuffer( this.playerBody );

		mat4.translate( this.modelMatrix, [ 0, 0, 1.4 ] );
		mat4.rotateX( this.modelMatrix, 0.75* aniangle);
		gl.uniformMatrix4fv( this.uModelMat, false, this.modelMatrix );
		this.drawBuffer( this.playerLeftArm );

		mat4.rotateX( this.modelMatrix, -1.5*aniangle);
		gl.uniformMatrix4fv( this.uModelMat, false, this.modelMatrix );
		this.drawBuffer( this.playerRightArm );
		mat4.rotateX( this.modelMatrix, 0.75*aniangle);

		mat4.translate( this.modelMatrix, [ 0, 0, -0.67 ] );
		
		mat4.rotateX( this.modelMatrix, 0.5*aniangle);
		gl.uniformMatrix4fv( this.uModelMat, false, this.modelMatrix );
		this.drawBuffer( this.playerRightLeg );

		mat4.rotateX( this.modelMatrix, -aniangle);
		gl.uniformMatrix4fv( this.uModelMat, false, this.modelMatrix );
		this.drawBuffer( this.playerLeftLeg );
		
		// Draw player name		
		if ( !player.nametag ) {
			player.nametag = this.buildPlayerName( player.nick );
		}
		
		// Calculate angle so that the nametag always faces the local player
		var ang = -Math.PI/2 + Math.atan2( this.camPos[1] - player.y, this.camPos[0] - player.x );
		
		mat4.identity( this.modelMatrix );
		mat4.translate( this.modelMatrix, [ player.x, player.y, player.z + 2.05 ] );
		mat4.rotateZ( this.modelMatrix, ang );
		mat4.scale( this.modelMatrix, [ 0.005, 1, 0.005 ] );
		gl.uniformMatrix4fv( this.uModelMat, false, this.modelMatrix );
		
		gl.bindTexture( gl.TEXTURE_2D, player.nametag.texture );
		this.drawBuffer( player.nametag.model );
	}
	
	gl.disable( gl.BLEND );
	
	mat4.identity( this.modelMatrix );
	gl.uniformMatrix4fv( this.uModelMat, false, this.modelMatrix );
}

// buildPlayerName( nickname )
//
// Returns the texture and vertex buffer for drawing the name
// tag of the specified player.

Renderer.prototype.buildPlayerName = function( nickname )
{
	var gl = this.gl;
	var canvas = this.textCanvas;
	var ctx = this.textContext;
	
	nickname = nickname.replace( /&lt;/g, "<" ).replace( /&gt;/g, ">" ).replace( /&quot;/, "\"" );
	
	var w = ctx.measureText( nickname ).width + 16;
	var h = 45;
	
	// Draw text box
	ctx.fillStyle = "#000";
	ctx.fillRect( 0, 0, w, 45 );
	
	ctx.fillStyle = "#fff";
	ctx.fillText( nickname, 10, 20 );
	
	// Create texture
	var tex = gl.createTexture();
	gl.bindTexture( gl.TEXTURE_2D, tex );
	gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
	
	// Create model
	var vertices = [
		-w/2, 0, h, w/256, 0, 1, 1, 1, 0.7,
		w/2, 0, h, 0, 0, 1, 1, 1, 0.7,
		w/2, 0, 0, 0, h/64, 1, 1, 1, 0.7,
		w/2, 0, 0, 0, h/64, 1, 1, 1, 0.7,
		-w/2, 0, 0, w/256, h/64, 1, 1, 1, 0.7,
		-w/2, 0, h, w/256, 0, 1, 1, 1, 0.7
	];
	
	var buffer = gl.createBuffer();
	buffer.vertices = vertices.length / 9;
	gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.STATIC_DRAW );
	
	return {
		texture: tex,
		model: buffer
	};
}

// pickAt( min, max, mx, myy )
//
// Returns the block at mouse position mx and my.
// The blocks that can be reached lie between min and max.
//
// Each side is rendered twice so that up to 16 bits of precision can be stored
// per axis in the picking buffers. The first pass stores the X/Y coordinates,
// the second pass stores Z and the face index which is later mapped to a normal.

Renderer.prototype.pickAt = function( min, max, mx, my )
{
	var gl = this.gl;
	var world = this.world;
	
	// Ensure BLOCK is available - try window.BLOCK first, then global BLOCK
	var blockObj = ( typeof window !== 'undefined' && window.BLOCK ) ? window.BLOCK : ( typeof BLOCK !== 'undefined' ? BLOCK : null );
	if ( !blockObj ) {
		console.error( 'BLOCK is not defined!' );
		return false;
	}
	
	// Create framebuffer for picking render
	var fbo = gl.createFramebuffer();
	gl.bindFramebuffer( gl.FRAMEBUFFER, fbo );
	
	var bt = gl.createTexture();
	gl.bindTexture( gl.TEXTURE_2D, bt );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
	gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
	gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, null );
	
	var renderbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer( gl.RENDERBUFFER, renderbuffer );
	gl.renderbufferStorage( gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 512, 512 );
	
	gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bt, 0 );
	gl.framebufferRenderbuffer( gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer );
	
	var buildPickingBuffer = function()
	{
		var vertices = [];
		for ( var x = min.x; x <= max.x; x++ ) {
			for ( var y = min.y; y <= max.y; y++ ) {
				for ( var z = min.z; z <= max.z; z++ ) {
					if ( world.getBlock( x, y, z ) != blockObj.AIR )
						blockObj.pushPickingVertices( vertices, x, y, z );
				}
			}
		}
		
		if ( vertices.length === 0 ) return null;
		
		var buffer = gl.createBuffer();
		buffer.vertices = vertices.length / 9;
		gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.STREAM_DRAW );
		return buffer;
	};
	
	var pixelXY = new Uint8Array( 4 );
	var pixelZ = new Uint8Array( 4 );
	var hitDetected = false;
	var readX = mx / gl.viewportWidth * 512;
	var readY = ( 1 - my / gl.viewportHeight ) * 512;
	
	for ( var pass = 0; pass < 2; pass++ )
	{
		// Set picking pass directly - this is what setPickingPass does anyway
		blockObj.pickingPass = ( pass === 0 ) ? ( blockObj.PICK_PASS_POSITION || 0 ) : ( blockObj.PICK_PASS_DEPTH || 1 );
		var buffer = buildPickingBuffer();
		
		gl.bindTexture( gl.TEXTURE_2D, this.texWhite );
		gl.viewport( 0, 0, 512, 512 );
		gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
		
		if ( buffer )
		{
			this.drawBuffer( buffer );
		}
		
		var target = pass === 0 ? pixelXY : pixelZ;
		gl.readPixels( readX, readY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, target );
		
		if ( buffer )
			gl.deleteBuffer( buffer );
		
		if ( !hitDetected )
		{
			hitDetected = !( target[0] === 255 && target[1] === 255 && target[2] === 255 && target[3] === 255 );
		}
	}
	
	// Reset picking pass directly - this is what setPickingPass does anyway
	blockObj.pickingPass = blockObj.PICK_PASS_POSITION || 0;
	
	// Reset states
	gl.bindTexture( gl.TEXTURE_2D, this.texTerrain );
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );
	gl.clearColor( 0.62, 0.81, 1.0, 1.0 );
	
	// Clean up
	gl.deleteRenderbuffer( renderbuffer );
	gl.deleteTexture( bt );
	gl.deleteFramebuffer( fbo );
	
	if ( !hitDetected )
		return false;
	
	var x = pixelXY[0] | ( pixelXY[1] << 8 );
	var y = pixelXY[2] | ( pixelXY[3] << 8 );
	var z = pixelZ[0] | ( pixelZ[1] << 8 );
	var face = pixelZ[2];
	
	var normal;
	if ( face == 1 ) normal = new Vector( 0, 0, 1 );
	else if ( face == 2 ) normal = new Vector( 0, 0, -1 );
	else if ( face == 3 ) normal = new Vector( 0, -1, 0 );
	else if ( face == 4 ) normal = new Vector( 0, 1, 0 );
	else if ( face == 5 ) normal = new Vector( -1, 0, 0 );
	else if ( face == 6 ) normal = new Vector( 1, 0, 0 );
	else normal = new Vector( 0, 0, 0 );
	
	return {
		x: x,
		y: y,
		z: z,
		n: normal
	}
}

// updateViewport()
//
// Check if the viewport is still the same size and update
// the render configuration if required.

Renderer.prototype.updateViewport = function()
{
	var gl = this.gl;
	var canvas = this.canvas;
	
	if ( canvas.clientWidth != gl.viewportWidth || canvas.clientHeight != gl.viewportHeight )
	{
		gl.viewportWidth = canvas.clientWidth;
		gl.viewportHeight = canvas.clientHeight;
		
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		
		// Update perspective projection based on new w/h ratio
		this.setPerspective( this.fov, this.min, this.max );
	}
}

// loadShaders()
//
// Takes care of loading the shaders.

Renderer.prototype.loadShaders = function()
{
	var gl = this.gl;
	
	// Create shader program
	var program = this.program = gl.createProgram();
	
	// Compile vertex shader
	var vertexShader = gl.createShader( gl.VERTEX_SHADER );
	gl.shaderSource( vertexShader, vertexSource );
	gl.compileShader( vertexShader );
	gl.attachShader( program, vertexShader );
	
	if ( !gl.getShaderParameter( vertexShader, gl.COMPILE_STATUS ) )
		throw "Could not compile vertex shader!\n" + gl.getShaderInfoLog( vertexShader );
	
	// Compile fragment shader
	var fragmentShader = gl.createShader( gl.FRAGMENT_SHADER );
	gl.shaderSource( fragmentShader, fragmentSource );
	gl.compileShader( fragmentShader );
	gl.attachShader( program, fragmentShader );
	
	if ( !gl.getShaderParameter( fragmentShader, gl.COMPILE_STATUS ) )
		throw "Could not compile fragment shader!\n" + gl.getShaderInfoLog( fragmentShader );
	
	// Finish program
	gl.linkProgram( program );
	
	if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) )
		throw "Could not link the shader program!";
	
	gl.useProgram( program );
	
	// Store variable locations
	this.uProjMat = gl.getUniformLocation( program, "uProjMatrix" );
	this.uViewMat= gl.getUniformLocation( program, "uViewMatrix" );
	this.uModelMat= gl.getUniformLocation( program, "uModelMatrix" );
	this.uSampler = gl.getUniformLocation( program, "uSampler" );
	this.aPos = gl.getAttribLocation( program, "aPos" );
	this.aColor = gl.getAttribLocation( program, "aColor" );
	this.aTexCoord = gl.getAttribLocation( program, "aTexCoord" );
	
	// Enable input
	gl.enableVertexAttribArray( this.aPos );
	gl.enableVertexAttribArray( this.aColor );
	gl.enableVertexAttribArray( this.aTexCoord );
}

// setWorld( world, chunkSize )
//
// Makes the renderer start tracking a new world and set up the chunk structure.
//
// world - The world object to operate on.
// chunkSize - X, Y and Z dimensions of each chunk, doesn't have to fit exactly inside the world. 16x16x16 is prefered for optimal peformance.

Renderer.prototype.setWorld = function( world, chunkSize )
{
	this.world = world;
	world.renderer = this;
	this.chunkSize = chunkSize;
	if ( world.setChunking ) world.setChunking( chunkSize );
	this.chunkLookup = {};
	this.loadedChunks = new Set();
	this.dirtyChunks = []; // List of chunks that need to be rebuilt

	// Create chunk list
	var chunks = this.chunks = [];
	for ( var x = 0; x < world.sx; x += chunkSize ) {
		for ( var y = 0; y < world.sy; y += chunkSize ) {
			for ( var z = 0; z < world.sz; z += chunkSize ) {
				var chunk = {
					start: [ x, y, z ],
					end: [ Math.min( world.sx, x + chunkSize ), Math.min( world.sy, y + chunkSize ), Math.min( world.sz, z + chunkSize ) ],
					cx: x / chunkSize,
					cy: y / chunkSize,
					cz: z / chunkSize,
					dirty: true,
					loaded: false
				};
				chunk.key = this.getChunkKey( chunk.cx, chunk.cy, chunk.cz );
				this.chunkLookup[chunk.key] = chunk;
				chunks.push( chunk );
			}
		}
	}

	// Initialize spawn chunks with loaded: true
	var spawnX = Math.floor(world.spawn[0] / chunkSize) * chunkSize;
	var spawnY = Math.floor(world.spawn[1] / chunkSize) * chunkSize;
	var spawnZ = Math.floor(world.spawn[2] / chunkSize) * chunkSize;

	for ( var i = 0; i < chunks.length; i++ ) {
		var chunk = chunks[i];
		if ( chunk.start[0] >= spawnX - chunkSize * this.renderDistance &&
			 chunk.start[0] <= spawnX + chunkSize * this.renderDistance &&
			 chunk.start[1] >= spawnY - chunkSize * this.renderDistance &&
			 chunk.start[1] <= spawnY + chunkSize * this.renderDistance &&
			 chunk.start[2] >= spawnZ - chunkSize * this.renderDistance &&
			 chunk.start[2] <= spawnZ + chunkSize * this.renderDistance ) {
			this.loadChunk( chunk );
			// loadChunk already adds to dirtyChunks, so we're good
		}
	}
}

Renderer.prototype.getChunkKey = function( cx, cy, cz )
{
	return cx + "|" + cy + "|" + cz;
}

// isChunkInRange( chunkX, chunkY, chunkZ, playerX, playerY, playerZ )
//
// Returns true if the chunk at (chunkX, chunkY, chunkZ) is within render distance of the player at (playerX, playerY, playerZ).
// Render distance for Z is asymmetric: full above, half below.
Renderer.prototype.isChunkInRange = function( chunkX, chunkY, chunkZ, playerX, playerY, playerZ )
{
	var playerChunkX = Math.floor(playerX / this.chunkSize);
	var playerChunkY = Math.floor(playerY / this.chunkSize);
	var playerChunkZ = Math.floor(playerZ / this.chunkSize);

	var distX = Math.abs(chunkX - playerChunkX);
	var distY = Math.abs(chunkY - playerChunkY);
	var distZ = chunkZ > playerChunkZ ? chunkZ - playerChunkZ : (playerChunkZ - chunkZ) * 2;

	return distX <= this.renderDistance && distY <= this.renderDistance && distZ <= this.renderDistance;
};

// unloadChunk( chunkIndex )
//
// Unloads the chunk at the specified index by setting loaded to false and deleting the buffer.

Renderer.prototype.unloadChunk = function( chunkIndexOrChunk )
{
	var chunk = typeof chunkIndexOrChunk === "number" ? this.chunks[chunkIndexOrChunk] : chunkIndexOrChunk;
	if ( !chunk ) return;
	if ( this.world && this.world.persistChunk )
		this.world.persistChunk( chunk, this.chunkSize );
	chunk.loaded = false;
	if ( chunk.buffer != null )
	{
		this.gl.deleteBuffer( chunk.buffer );
		chunk.buffer = null;
	}
	if ( this.loadedChunks ) this.loadedChunks.delete( chunk.key );
};

// setRenderDistance( distance )
//
// Updates the render distance and triggers chunk updates.

Renderer.prototype.setRenderDistance = function( distance )
{
	this.renderDistance = distance;
	// Trigger immediate chunk update
	this.updateChunks();
};

// loadChunk( chunkIndex )
//
// Loads the chunk at the specified index by setting loaded to true and marking it as dirty.

Renderer.prototype.loadChunk = function( chunkIndexOrChunk )
{
	var chunk = typeof chunkIndexOrChunk === "number" ? this.chunks[chunkIndexOrChunk] : chunkIndexOrChunk;
	if ( !chunk ) return;
	if ( this.world && this.world.ensureChunkLoaded )
		this.world.ensureChunkLoaded( chunk, this.chunkSize );
	chunk.loaded = true;
	chunk.dirty = true;
	if ( this.loadedChunks ) this.loadedChunks.add( chunk.key );
	// Add to dirty queue if not already there
	if ( this.dirtyChunks && this.dirtyChunks.indexOf( chunk ) === -1 ) {
		this.dirtyChunks.push( chunk );
	}
};

// updateChunks()
//
// Updates the loaded state of chunks based on the player's current position.
// Loads chunks that are in range and unloads those that are not.

Renderer.prototype.updateChunks = function()
{
	if ( !this.world || !this.chunks ) return;

	var playerX = this.camPos[0];
	var playerY = this.camPos[1];
	var playerZ = this.camPos[2];
	var playerChunkX = Math.floor( playerX / this.chunkSize );
	var playerChunkY = Math.floor( playerY / this.chunkSize );
	var playerChunkZ = Math.floor( playerZ / this.chunkSize );
	var targetKeys = new Set();

	for ( var dx = -this.renderDistance; dx <= this.renderDistance; dx++ ) {
		for ( var dy = -this.renderDistance; dy <= this.renderDistance; dy++ ) {
			for ( var dz = -this.renderDistance; dz <= this.renderDistance; dz++ ) {
				var cx = playerChunkX + dx;
				var cy = playerChunkY + dy;
				var cz = playerChunkZ + dz;
				if ( !this.isChunkInRange( cx, cy, cz, playerX, playerY, playerZ ) ) continue;
				var key = this.getChunkKey( cx, cy, cz );
				targetKeys.add( key );
				var chunk = this.chunkLookup && this.chunkLookup[key];
				if ( chunk && !chunk.loaded ) this.loadChunk( chunk );
			}
		}
	}

	if ( this.loadedChunks && this.loadedChunks.size ) {
		var unloadQueue = [];
		this.loadedChunks.forEach( function( key ) {
			if ( !targetKeys.has( key ) ) unloadQueue.push( key );
		} );
		for ( var i = 0; i < unloadQueue.length; i++ ) {
			var chunk = this.chunkLookup[ unloadQueue[i] ];
			if ( chunk ) this.unloadChunk( chunk );
		}
	}
};


// onBlockChanged( x, y, z )
//
// Callback from world to inform the renderer of a changed block

Renderer.prototype.onBlockChanged = function( x, y, z )
{
	var chunks = this.chunks;
	var dirtyChunks = this.dirtyChunks;
	
	for ( var i = 0; i < chunks.length; i++ )
	{
		var chunk = chunks[i];
		var wasDirty = chunk.dirty;
		
		// Neighbouring chunks are updated as well if the block is on a chunk border
		// Also, all chunks below the block are updated because of lighting
		if ( x >= chunk.start[0] && x < chunk.end[0] && y >= chunk.start[1] && y < chunk.end[1] && z >= chunk.start[2] && z < chunk.end[2] )
			chunk.dirty = true;
		else if ( x >= chunk.start[0] && x < chunk.end[0] && y >= chunk.start[1] && y < chunk.end[1] && ( z >= chunk.end[2] || z == chunk.start[2] - 1 ) )
			chunk.dirty = true;
		else if ( x >= chunk.start[0] && x < chunk.end[0] && z >= chunk.start[2] && z < chunk.end[2] && ( y == chunk.end[1] || y == chunk.start[1] - 1 ) )
			chunk.dirty = true;
		else if ( y >= chunk.start[1] && y < chunk.end[1] && z >= chunk.start[2] && z < chunk.end[2] && ( x == chunk.end[0] || x == chunk.start[0] - 1 ) )
			chunk.dirty = true;
		
		// If chunk became dirty and is loaded, add to dirty queue
		if ( chunk.dirty && !wasDirty && chunk.loaded && dirtyChunks && dirtyChunks.indexOf( chunk ) === -1 ) {
			dirtyChunks.push( chunk );
		}
	}
}

// buildChunks( count )
//
// Build up to <count> dirty chunks.

function pushQuad( v, p1, p2, p3, p4 )
{
	v.push( p1[0], p1[1], p1[2], p1[3], p1[4], p1[5], p1[6], p1[7], p1[8] );
	v.push( p2[0], p2[1], p2[2], p2[3], p2[4], p2[5], p2[6], p2[7], p2[8] );
	v.push( p3[0], p3[1], p3[2], p3[3], p3[4], p3[5], p3[6], p3[7], p3[8] );
	
	v.push( p3[0], p3[1], p3[2], p3[3], p3[4], p3[5], p3[6], p3[7], p3[8] );
	v.push( p4[0], p4[1], p4[2], p4[3], p4[4], p4[5], p4[6], p4[7], p4[8] );
	v.push( p1[0], p1[1], p1[2], p1[3], p1[4], p1[5], p1[6], p1[7], p1[8] );
}

Renderer.prototype.buildChunks = function( count )
{
	var gl = this.gl;
	var world = this.world;
	var dirtyChunks = this.dirtyChunks;
	
	// Process dirty chunks from the queue
	for ( var i = 0; i < dirtyChunks.length && count > 0; i++ )
	{
		var chunk = dirtyChunks[i];
		
		// Skip if chunk is no longer loaded or no longer dirty
		if ( !chunk.loaded || !chunk.dirty )
		{
			// Remove from queue
			dirtyChunks.splice( i, 1 );
			i--;
			continue;
		}

		var vertices = [];
		
		// Create map of lowest blocks that are still lit
		// Optimize: only check up to a reasonable height instead of entire world
		var maxLightCheckZ = Math.min( world.sz - 1, chunk.end[2] + 32 );
		var lightmap = {};
		for ( var x = chunk.start[0] - 1; x < chunk.end[0] + 1; x++ )
		{
			lightmap[x] = {};
			
			for ( var y = chunk.start[1] - 1; y < chunk.end[1] + 1; y++ )
			{
				// Start from maxLightCheckZ and go down instead of from world.sz-1
				for ( var z = maxLightCheckZ; z >= 0; z-- )
				{
					lightmap[x][y] = z;
					if ( !world.getBlock( x, y, z ).transparent ) break;
				}
			}
		}
		
		// Crear un mapa rápido de posiciones animadas para verificación O(1)
		var animatedPositions = {};
		if ( world.blockAnimations )
		{
			for ( var animKey in world.blockAnimations )
			{
				var coords = animKey.split( "," );
				var animX = parseInt( coords[0] );
				var animY = parseInt( coords[1] );
				var animFromZ = parseInt( coords[2] );
				animatedPositions[animX + "," + animY + "," + animFromZ] = true;
			}
		}
		
		// Add vertices for blocks (solo bloques normales, los animados se dibujan por separado)
		for ( var x = chunk.start[0]; x < chunk.end[0]; x++ ) {
			for ( var y = chunk.start[1]; y < chunk.end[1]; y++ ) {
				for ( var z = chunk.start[2]; z < chunk.end[2]; z++ ) {
					var block = world.blocks[x][y][z];
					if ( block == BLOCK.AIR ) continue;
					
					// Verificar si este bloque está siendo animado (verificación O(1))
					var posKey = x + "," + y + "," + z;
					if ( animatedPositions[posKey] ) continue;
					
					// Dibujar el bloque en su posición normal
					BLOCK.pushVertices( vertices, world, lightmap, x, y, z );
				}
			}
		}
		
		// Create WebGL buffer (optimizado, sin verificaciones costosas)
		if ( chunk.buffer ) {
			gl.deleteBuffer( chunk.buffer );
		}
		
		var buffer = chunk.buffer = gl.createBuffer();
		buffer.vertices = vertices.length / 9;
		gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.STATIC_DRAW );
		
		chunk.dirty = false;
		// Remove from queue
		dirtyChunks.splice( i, 1 );
		i--;
		count--;
	}
}

// updateAnimatedBlocksBuffer()
//
// Actualiza el buffer de bloques animados. Se llama cada frame para mantener las animaciones fluidas.

Renderer.prototype.updateAnimatedBlocksBuffer = function()
{
	var gl = this.gl;
	
	if ( !this.world || !this.world.blockAnimations ) 
	{
		// Si no hay animaciones, limpiar el buffer
		if ( this.animatedBlocksBuffer )
		{
			try {
				gl.deleteBuffer( this.animatedBlocksBuffer );
			} catch ( e ) {
				// Ignorar errores al eliminar buffer
			}
			this.animatedBlocksBuffer = null;
		}
		return;
	}
	
	var world = this.world;
	var vertices = [];
	
	// Limitar el número de bloques animados para evitar sobrecarga
	var maxAnimatedBlocks = 5; // Reducido para mejor rendimiento
	var blockCount = 0;
	
	// Crear lightmap simplificado y dibujar en una sola pasada
	var lightmap = {};
	var animKeys = Object.keys( world.blockAnimations );
	var animCount = animKeys.length;
	
	// Procesar todas las animaciones en una sola pasada
	for ( var i = 0; i < animCount && blockCount < maxAnimatedBlocks; i++ )
	{
		var key = animKeys[i];
		var anim = world.blockAnimations[key];
		if ( !anim ) continue;
		
		// Parsear coordenadas una sola vez
		var coords = key.split( "," );
		var x = parseInt( coords[0], 10 );
		var y = parseInt( coords[1], 10 );
		var currentZ = anim.currentZ !== undefined ? anim.currentZ : anim.fromZ;
		
		// Validar coordenadas rápidamente
		if ( x < 0 || x >= world.sx || y < 0 || y >= world.sy ) continue;
		
		// Inicializar lightmap de forma segura (simplificado: usar altura Z + 1)
		var floorZ = Math.floor( currentZ );
		if ( !lightmap[x] ) lightmap[x] = {};
		// Usar altura simple basada en Z
		lightmap[x][y] = floorZ + 1;
		// Inicializar posiciones adyacentes para evitar errores
		if ( x + 1 < world.sx ) {
			if ( !lightmap[x+1] ) lightmap[x+1] = {};
			if ( lightmap[x+1][y] === undefined ) lightmap[x+1][y] = floorZ + 1;
		}
		if ( y > 0 ) {
			if ( lightmap[x][y-1] === undefined ) lightmap[x][y-1] = floorZ + 1;
		}
		
		// Dibujar el bloque animado
		BLOCK.pushVerticesAtPosition( vertices, world, lightmap, x, y, currentZ, anim.blockType );
		blockCount++;
	}
	
	// Actualizar buffer solo si hay vértices
	if ( vertices.length > 0 )
	{
		if ( !this.animatedBlocksBuffer )
		{
			this.animatedBlocksBuffer = gl.createBuffer();
		}
		
		this.animatedBlocksBuffer.vertices = vertices.length / 9;
		gl.bindBuffer( gl.ARRAY_BUFFER, this.animatedBlocksBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.DYNAMIC_DRAW );
	}
	else
	{
		if ( this.animatedBlocksBuffer )
		{
			this.animatedBlocksBuffer.vertices = 0;
		}
	}
}

// setPerspective( fov, min, max )
//
// Sets the properties of the perspective projection.

Renderer.prototype.setPerspective = function( fov, min, max )
{
	var gl = this.gl;
	
	this.fov = fov;
	this.min = min;
	this.max = max;
	
	mat4.perspective( fov, gl.viewportWidth / gl.viewportHeight, min, max, this.projMatrix );
	gl.uniformMatrix4fv( this.uProjMat, false, this.projMatrix );
}

// setCamera( pos, ang )
//
// Moves the camera to the specified orientation.
//
// pos - Position in world coordinates.
// ang - Pitch, yaw and roll.

Renderer.prototype.setCamera = function( pos, ang )
{
	var gl = this.gl;
	
	this.camPos = pos;
	
	mat4.identity( this.viewMatrix );
	
	mat4.rotate( this.viewMatrix, -ang[0] - Math.PI / 2, [ 1, 0, 0 ], this.viewMatrix );
	mat4.rotate( this.viewMatrix, ang[1], [ 0, 0, 1 ], this.viewMatrix );
	mat4.rotate( this.viewMatrix, -ang[2], [ 0, 1, 0 ], this.viewMatrix );
	
	mat4.translate( this.viewMatrix, [ -pos[0], -pos[1], -pos[2] ], this.viewMatrix );
	
	gl.uniformMatrix4fv( this.uViewMat, false, this.viewMatrix );
}

Renderer.prototype.drawBuffer = function( buffer )
{
	if ( !buffer || !buffer.vertices || buffer.vertices <= 0 ) return;
	
	var gl = this.gl;
	
	gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
	gl.vertexAttribPointer( this.aPos, 3, gl.FLOAT, false, 9*4, 0 );
	gl.vertexAttribPointer( this.aColor, 4, gl.FLOAT, false, 9*4, 5*4 );
	gl.vertexAttribPointer( this.aTexCoord, 2, gl.FLOAT, false, 9*4, 3*4 );
	gl.drawArrays( gl.TRIANGLES, 0, buffer.vertices );
}

// getGrassColor( x, y )
//
// Returns the grass color from grasscolor.png at the specified world coordinates.
// Returns [1, 1, 1] (white) if grasscolor.png is not loaded.

Renderer.prototype.getGrassColor = function( x, y )
{
	var grassColorTex = this.texGrassColor;
	if ( !grassColorTex || !grassColorTex.imageData ) {
		return [ 1.0, 1.0, 1.0 ]; // White if not loaded
	}
	
	var imageData = grassColorTex.imageData;
	var width = imageData.width;
	var height = imageData.height;
	
	// Use a single fixed pixel for all blocks to ensure uniform coloring
	// Using the center pixel of the texture (or top-left if preferred)
	var texX = Math.floor( width / 2 ); // Center X
	var texY = Math.floor( height / 2 ); // Center Y
	
	// Ensure coordinates are within valid range
	if ( texX >= width ) texX = width - 1;
	if ( texY >= height ) texY = height - 1;
	if ( texX < 0 ) texX = 0;
	if ( texY < 0 ) texY = 0;
	
	var index = ( texY * width + texX ) * 4;
	
	// Get RGB values and normalize to 0-1 range
	var r = imageData.data[index] / 255.0;
	var g = imageData.data[index + 1] / 255.0;
	var b = imageData.data[index + 2] / 255.0;
	
	return [ r, g, b ];
}

// loadPlayerHeadModel()
//
// Loads the player head model into a vertex buffer for rendering.

Renderer.prototype.loadPlayerHeadModel = function()
{
	var gl = this.gl;
	
	// Player head
	var vertices = [
		// Top
		-0.25, -0.25, 0.25, 8/64, 0, 1, 1, 1, 1,
		0.25, -0.25, 0.25, 16/64, 0, 1, 1, 1, 1,
		0.25, 0.25, 0.25, 16/64, 8/32, 1, 1, 1, 1,
		0.25, 0.25, 0.25, 16/64, 8/32, 1, 1, 1, 1,
		-0.25, 0.25, 0.25, 8/64, 8/32, 1, 1, 1, 1,
		-0.25, -0.25, 0.25, 8/64, 0, 1, 1, 1, 1,
		
		// Bottom
		-0.25, -0.25, -0.25, 16/64, 0, 1, 1, 1, 1,
		-0.25, 0.25, -0.25, 16/64, 8/32, 1, 1, 1, 1,
		0.25, 0.25, -0.25, 24/64, 8/32, 1, 1, 1, 1,
		0.25, 0.25, -0.25, 24/64, 8/32, 1, 1, 1, 1,
		0.25, -0.25, -0.25, 24/64, 0, 1, 1, 1, 1,
		-0.25, -0.25, -0.25, 16/64, 0, 1, 1, 1, 1,
		
		// Front		
		-0.25, -0.25, 0.25, 8/64, 8/32, 1, 1, 1, 1,
		-0.25, -0.25, -0.25, 8/64, 16/32, 1, 1, 1, 1,
		0.25, -0.25, -0.25, 16/64, 16/32, 1, 1, 1, 1,
		0.25, -0.25, -0.25, 16/64, 16/32, 1, 1, 1, 1,
		0.25, -0.25, 0.25, 16/64, 8/32, 1, 1, 1, 1,
		-0.25, -0.25, 0.25, 8/64, 8/32, 1, 1, 1, 1,
		
		// Rear		
		-0.25, 0.25, 0.25, 24/64, 8/32, 1, 1, 1, 1,
		0.25, 0.25, 0.25, 32/64, 8/32, 1, 1, 1, 1,
		0.25, 0.25, -0.25, 32/64, 16/32, 1, 1, 1, 1,
		0.25, 0.25, -0.25, 32/64, 16/32, 1, 1, 1, 1,
		-0.25, 0.25, -0.25, 24/64, 16/32, 1, 1, 1, 1,
		-0.25, 0.25, 0.25, 24/64, 8/32, 1, 1, 1, 1,
		
		// Right
		-0.25, -0.25, 0.25, 16/64, 8/32, 1, 1, 1, 1,
		-0.25, 0.25, 0.25, 24/64, 8/32, 1, 1, 1, 1,
		-0.25, 0.25, -0.25, 24/64, 16/32, 1, 1, 1, 1,
		-0.25, 0.25, -0.25, 24/64, 16/32, 1, 1, 1, 1,
		-0.25, -0.25, -0.25, 16/64, 16/32, 1, 1, 1, 1,
		-0.25, -0.25, 0.25, 16/64, 8/32, 1, 1, 1, 1,
		
		// Left
		0.25, -0.25, 0.25, 0, 8/32, 1, 1, 1, 1,
		0.25, -0.25, -0.25, 0, 16/32, 1, 1, 1, 1,
		0.25, 0.25, -0.25, 8/64, 16/32, 1, 1, 1, 1,
		0.25, 0.25, -0.25, 8/64, 16/32, 1, 1, 1, 1,
		0.25, 0.25, 0.25, 8/64, 8/32, 1, 1, 1, 1,
		0.25, -0.25, 0.25, 0, 8/32, 1, 1, 1, 1
	];
	
	var buffer = this.playerHead = gl.createBuffer();
	buffer.vertices = vertices.length / 9;
	gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.DYNAMIC_DRAW );
}

// loadPlayerBodyModel()
//
// Loads the player body model into a vertex buffer for rendering.

Renderer.prototype.loadPlayerBodyModel = function()
{
	var gl = this.gl;
	
	var vertices = [
		// Player torso
		
		// Top
		-0.30, -0.125, 1.45, 20/64, 16/32, 1, 1, 1, 1,
		0.30, -0.125, 1.45, 28/64, 16/32, 1, 1, 1, 1,
		0.30, 0.125, 1.45, 28/64, 20/32, 1, 1, 1, 1,
		0.30, 0.125, 1.45, 28/64, 20/32, 1, 1, 1, 1,
		-0.30, 0.125, 1.45, 20/64, 20/32, 1, 1, 1, 1,
		-0.30, -0.125, 1.45, 20/64, 16/32, 1, 1, 1, 1,
		
		// Bottom
		-0.30, -0.125, 0.73, 28/64, 16/32, 1, 1, 1, 1,
		-0.30, 0.125, 0.73, 28/64, 20/32, 1, 1, 1, 1,
		0.30, 0.125, 0.73, 36/64, 20/32, 1, 1, 1, 1,
		0.30, 0.125, 0.73, 36/64, 20/32, 1, 1, 1, 1,
		0.30, -0.125, 0.73, 36/64, 16/32, 1, 1, 1, 1,
		-0.30, -0.125, 0.73, 28/64, 16/32, 1, 1, 1, 1,
		
		// Front		
		-0.30, -0.125, 1.45, 20/64, 20/32, 1, 1, 1, 1,
		-0.30, -0.125, 0.73, 20/64, 32/32, 1, 1, 1, 1,
		0.30, -0.125, 0.73, 28/64, 32/32, 1, 1, 1, 1,
		0.30, -0.125, 0.73, 28/64, 32/32, 1, 1, 1, 1,
		0.30, -0.125, 1.45, 28/64, 20/32, 1, 1, 1, 1,
		-0.30, -0.125, 1.45, 20/64, 20/32, 1, 1, 1, 1,
		
		// Rear		
		-0.30, 0.125, 1.45, 40/64, 20/32, 1, 1, 1, 1,
		0.30, 0.125, 1.45, 32/64, 20/32, 1, 1, 1, 1,
		0.30, 0.125, 0.73, 32/64, 32/32, 1, 1, 1, 1,
		0.30, 0.125, 0.73, 32/64, 32/32, 1, 1, 1, 1,
		-0.30, 0.125, 0.73, 40/64, 32/32, 1, 1, 1, 1,
		-0.30, 0.125, 1.45, 40/64, 20/32, 1, 1, 1, 1,
		
		// Right
		-0.30, -0.125, 1.45, 16/64, 20/32, 1, 1, 1, 1,
		-0.30, 0.125, 1.45, 20/64, 20/32, 1, 1, 1, 1,
		-0.30, 0.125, 0.73, 20/64, 32/32, 1, 1, 1, 1,
		-0.30, 0.125, 0.73, 20/64, 32/32, 1, 1, 1, 1,
		-0.30, -0.125, 0.73, 16/64, 32/32, 1, 1, 1, 1,
		-0.30, -0.125, 1.45, 16/64, 20/32, 1, 1, 1, 1,
		
		// Left
		0.30, -0.125, 1.45, 28/64, 20/32, 1, 1, 1, 1,
		0.30, -0.125, 0.73, 28/64, 32/32, 1, 1, 1, 1,
		0.30, 0.125, 0.73, 32/64, 32/32, 1, 1, 1, 1,
		0.30, 0.125, 0.73, 32/64, 32/32, 1, 1, 1, 1,
		0.30, 0.125, 1.45, 32/64, 20/32, 1, 1, 1, 1,
		0.30, -0.125, 1.45, 28/64, 20/32, 1, 1, 1, 1,
		
	];
	
	var buffer = this.playerBody = gl.createBuffer();
	buffer.vertices = vertices.length / 9;
	gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.DYNAMIC_DRAW );

	var vertices = [
		// Left arm
		
		// Top
		0.30, -0.125, 0.05, 44/64, 16/32, 1, 1, 1, 1,
		0.55, -0.125, 0.05, 48/64, 16/32, 1, 1, 1, 1,
		0.55,  0.125, 0.05, 48/64, 20/32, 1, 1, 1, 1,
		0.55,  0.125, 0.05, 48/64, 20/32, 1, 1, 1, 1,
		0.30,  0.125, 0.05, 44/64, 20/32, 1, 1, 1, 1,
		0.30, -0.125, 0.05, 44/64, 16/32, 1, 1, 1, 1,
		
		// Bottom
		0.30, -0.125, -0.67, 48/64, 16/32, 1, 1, 1, 1,
		0.30,  0.125, -0.67, 48/64, 20/32, 1, 1, 1, 1,
		0.55,  0.125, -0.67, 52/64, 20/32, 1, 1, 1, 1,
		0.55,  0.125, -0.67, 52/64, 20/32, 1, 1, 1, 1,
		0.55, -0.125, -0.67, 52/64, 16/32, 1, 1, 1, 1,
		0.30, -0.125, -0.67, 48/64, 16/32, 1, 1, 1, 1,
		
		// Front		
		0.30, -0.125,  0.05, 48/64, 20/32, 1, 1, 1, 1,
		0.30, -0.125, -0.67, 48/64, 32/32, 1, 1, 1, 1,
		0.55, -0.125, -0.67, 44/64, 32/32, 1, 1, 1, 1,
		0.55, -0.125, -0.67, 44/64, 32/32, 1, 1, 1, 1,
		0.55, -0.125,  0.05, 44/64, 20/32, 1, 1, 1, 1,
		0.30, -0.125,  0.05, 48/64, 20/32, 1, 1, 1, 1,
		
		// Rear		
		0.30, 0.125,  0.05, 52/64, 20/32, 1, 1, 1, 1,
		0.55, 0.125,  0.05, 56/64, 20/32, 1, 1, 1, 1,
		0.55, 0.125, -0.67, 56/64, 32/32, 1, 1, 1, 1,
		0.55, 0.125, -0.67, 56/64, 32/32, 1, 1, 1, 1,
		0.30, 0.125, -0.67, 52/64, 32/32, 1, 1, 1, 1,
		0.30, 0.125,  0.05, 52/64, 20/32, 1, 1, 1, 1,
		
		// Right
		0.30, -0.125,  0.05, 48/64, 20/32, 1, 1, 1, 1,
		0.30,  0.125,  0.05, 52/64, 20/32, 1, 1, 1, 1,
		0.30,  0.125, -0.67, 52/64, 32/32, 1, 1, 1, 1,
		0.30,  0.125, -0.67, 52/64, 32/32, 1, 1, 1, 1,
		0.30, -0.125, -0.67, 48/64, 32/32, 1, 1, 1, 1,
		0.30, -0.125,  0.05, 48/64, 20/32, 1, 1, 1, 1,
		
		// Left
		0.55, -0.125,  0.05, 44/64, 20/32, 1, 1, 1, 1,
		0.55, -0.125, -0.67, 44/64, 32/32, 1, 1, 1, 1,
		0.55,  0.125, -0.67, 40/64, 32/32, 1, 1, 1, 1,
		0.55,  0.125, -0.67, 40/64, 32/32, 1, 1, 1, 1,
		0.55,  0.125,  0.05, 40/64, 20/32, 1, 1, 1, 1,
		0.55, -0.125,  0.05, 44/64, 20/32, 1, 1, 1, 1,
		
	];
	
	var buffer = this.playerLeftArm = gl.createBuffer();
	buffer.vertices = vertices.length / 9;
	gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.DYNAMIC_DRAW );

	var vertices = [
		// Right arm
		
		// Top
		-0.55, -0.125, 0.05, 44/64, 16/32, 1, 1, 1, 1,
		-0.30, -0.125, 0.05, 48/64, 16/32, 1, 1, 1, 1,
		-0.30,  0.125, 0.05, 48/64, 20/32, 1, 1, 1, 1,
		-0.30,  0.125, 0.05, 48/64, 20/32, 1, 1, 1, 1,
		-0.55,  0.125, 0.05, 44/64, 20/32, 1, 1, 1, 1,
		-0.55, -0.125, 0.05, 44/64, 16/32, 1, 1, 1, 1,
		
		// Bottom
		-0.55, -0.125, -0.67, 52/64, 16/32, 1, 1, 1, 1,
		-0.55,  0.125, -0.67, 52/64, 20/32, 1, 1, 1, 1,
		-0.30,  0.125, -0.67, 48/64, 20/32, 1, 1, 1, 1,
		-0.30,  0.125, -0.67, 48/64, 20/32, 1, 1, 1, 1,
		-0.30, -0.125, -0.67, 48/64, 16/32, 1, 1, 1, 1,
		-0.55, -0.125, -0.67, 52/64, 16/32, 1, 1, 1, 1,
		
		// Front		
		-0.55, -0.125,  0.05, 44/64, 20/32, 1, 1, 1, 1,
		-0.55, -0.125, -0.67, 44/64, 32/32, 1, 1, 1, 1,
		-0.30, -0.125, -0.67, 48/64, 32/32, 1, 1, 1, 1,
		-0.30, -0.125, -0.67, 48/64, 32/32, 1, 1, 1, 1,
		-0.30, -0.125,  0.05, 48/64, 20/32, 1, 1, 1, 1,
		-0.55, -0.125,  0.05, 44/64, 20/32, 1, 1, 1, 1,
		
		// Rear		
		-0.55, 0.125,  0.05, 56/64, 20/32, 1, 1, 1, 1,
		-0.30, 0.125,  0.05, 52/64, 20/32, 1, 1, 1, 1,
		-0.30, 0.125, -0.67, 52/64, 32/32, 1, 1, 1, 1,
		-0.30, 0.125, -0.67, 52/64, 32/32, 1, 1, 1, 1,
		-0.55, 0.125, -0.67, 56/64, 32/32, 1, 1, 1, 1,
		-0.55, 0.125,  0.05, 56/64, 20/32, 1, 1, 1, 1,
		
		// Right
		-0.55, -0.125,  0.05, 44/64, 20/32, 1, 1, 1, 1,
		-0.55,  0.125,  0.05, 40/64, 20/32, 1, 1, 1, 1,
		-0.55,  0.125, -0.67, 40/64, 32/32, 1, 1, 1, 1,
		-0.55,  0.125, -0.67, 40/64, 32/32, 1, 1, 1, 1,
		-0.55, -0.125, -0.67, 44/64, 32/32, 1, 1, 1, 1,
		-0.55, -0.125,  0.05, 44/64, 20/32, 1, 1, 1, 1,
		
		// Left
		-0.30, -0.125,  0.05, 48/64, 20/32, 1, 1, 1, 1,
		-0.30, -0.125, -0.67, 48/64, 32/32, 1, 1, 1, 1,
		-0.30,  0.125, -0.67, 52/64, 32/32, 1, 1, 1, 1,
		-0.30,  0.125, -0.67, 52/64, 32/32, 1, 1, 1, 1,
		-0.30,  0.125,  0.05, 52/64, 20/32, 1, 1, 1, 1,
		-0.30, -0.125,  0.05, 48/64, 20/32, 1, 1, 1, 1,
		
	];
	
	var buffer = this.playerRightArm = gl.createBuffer();
	buffer.vertices = vertices.length / 9;
	gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.DYNAMIC_DRAW );

	var vertices = [
		// Left leg
		
		// Top
		0.01, -0.125, 0, 4/64, 16/32, 1, 1, 1, 1,
		0.3,  -0.125, 0, 8/64, 16/32, 1, 1, 1, 1,
		0.3,   0.125, 0, 8/64, 20/32, 1, 1, 1, 1,
		0.3,   0.125, 0, 8/64, 20/32, 1, 1, 1, 1,
		0.01,  0.125, 0, 4/64, 20/32, 1, 1, 1, 1,
		0.01, -0.125, 0, 4/64, 16/32, 1, 1, 1, 1,
		
		// Bottom
		0.01, -0.125, -0.73,  8/64, 16/32, 1, 1, 1, 1,
		0.01,  0.125, -0.73,  8/64, 20/32, 1, 1, 1, 1,
		0.3,   0.125, -0.73, 12/64, 20/32, 1, 1, 1, 1,
		0.3,   0.125, -0.73, 12/64, 20/32, 1, 1, 1, 1,
		0.3,  -0.125, -0.73, 12/64, 16/32, 1, 1, 1, 1,
		0.01, -0.125, -0.73,  8/64, 16/32, 1, 1, 1, 1,
		
		// Front		
		0.01, -0.125,     0, 4/64, 20/32, 1, 1, 1, 1,
		0.01, -0.125, -0.73, 4/64, 32/32, 1, 1, 1, 1,
		0.3,  -0.125, -0.73, 8/64, 32/32, 1, 1, 1, 1,
		0.3,  -0.125, -0.73, 8/64, 32/32, 1, 1, 1, 1,
		0.3,  -0.125,     0, 8/64, 20/32, 1, 1, 1, 1,
		0.01, -0.125,     0, 4/64, 20/32, 1, 1, 1, 1,
		
		// Rear		
		0.01, 0.125,     0, 12/64, 20/32, 1, 1, 1, 1,
		0.3,  0.125,     0, 16/64, 20/32, 1, 1, 1, 1,
		0.3,  0.125, -0.73, 16/64, 32/32, 1, 1, 1, 1,
		0.3,  0.125, -0.73, 16/64, 32/32, 1, 1, 1, 1,
		0.01, 0.125, -0.73, 12/64, 32/32, 1, 1, 1, 1,
		0.01, 0.125,     0, 12/64, 20/32, 1, 1, 1, 1,
		
		// Right
		0.01, -0.125,     0,  8/64, 20/32, 1, 1, 1, 1,
		0.01,  0.125,     0, 12/64, 20/32, 1, 1, 1, 1,
		0.01,  0.125, -0.73, 12/64, 32/32, 1, 1, 1, 1,
		0.01,  0.125, -0.73, 12/64, 32/32, 1, 1, 1, 1,
		0.01, -0.125, -0.73,  8/64, 32/32, 1, 1, 1, 1,
		0.01, -0.125,     0,  8/64, 20/32, 1, 1, 1, 1,
		
		// Left
		0.3, -0.125,     0, 4/64, 20/32, 1, 1, 1, 1,
		0.3, -0.125, -0.73, 4/64, 32/32, 1, 1, 1, 1,
		0.3,  0.125, -0.73, 0/64, 32/32, 1, 1, 1, 1,
		0.3,  0.125, -0.73, 0/64, 32/32, 1, 1, 1, 1,
		0.3,  0.125,     0, 0/64, 20/32, 1, 1, 1, 1,
		0.3, -0.125,     0, 4/64, 20/32, 1, 1, 1, 1,
	];
	
	var buffer = this.playerLeftLeg = gl.createBuffer();
	buffer.vertices = vertices.length / 9;
	gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.DYNAMIC_DRAW );

	var vertices = [
		// Right leg
		
		// Top
		-0.3,  -0.125, 0, 4/64, 16/32, 1, 1, 1, 1,
		-0.01, -0.125, 0, 8/64, 16/32, 1, 1, 1, 1,
		-0.01,  0.125, 0, 8/64, 20/32, 1, 1, 1, 1,
		-0.01,  0.125, 0, 8/64, 20/32, 1, 1, 1, 1,
		-0.3,   0.125, 0, 4/64, 20/32, 1, 1, 1, 1,
		-0.3,  -0.125, 0, 4/64, 16/32, 1, 1, 1, 1,
		
		// Bottom
		-0.3,  -0.125, -0.73,  8/64, 16/32, 1, 1, 1, 1,
		-0.3,   0.125, -0.73,  8/64, 20/32, 1, 1, 1, 1,
		-0.01,  0.125, -0.73, 12/64, 20/32, 1, 1, 1, 1,
		-0.01,  0.125, -0.73, 12/64, 20/32, 1, 1, 1, 1,
		-0.01, -0.125, -0.73, 12/64, 16/32, 1, 1, 1, 1,
		-0.3,  -0.125, -0.73,  8/64, 16/32, 1, 1, 1, 1,
		
		// Front		
		-0.3,  -0.125,     0, 4/64, 20/32, 1, 1, 1, 1,
		-0.3,  -0.125, -0.73, 4/64, 32/32, 1, 1, 1, 1,
		-0.01, -0.125, -0.73, 8/64, 32/32, 1, 1, 1, 1,
		-0.01, -0.125, -0.73, 8/64, 32/32, 1, 1, 1, 1,
		-0.01, -0.125,     0, 8/64, 20/32, 1, 1, 1, 1,
		-0.3,  -0.125,     0, 4/64, 20/32, 1, 1, 1, 1,
		
		// Rear		
		-0.3,  0.125,     0, 16/64, 20/32, 1, 1, 1, 1,
		-0.01, 0.125,     0, 12/64, 20/32, 1, 1, 1, 1,
		-0.01, 0.125, -0.73, 12/64, 32/32, 1, 1, 1, 1,
		-0.01, 0.125, -0.73, 12/64, 32/32, 1, 1, 1, 1,
		-0.3,  0.125, -0.73, 16/64, 32/32, 1, 1, 1, 1,
		-0.3,  0.125,     0, 16/64, 20/32, 1, 1, 1, 1,
		
		// Right
		-0.3, -0.125,     0, 4/64, 20/32, 1, 1, 1, 1,
		-0.3,  0.125,     0, 0/64, 20/32, 1, 1, 1, 1,
		-0.3,  0.125, -0.73, 0/64, 32/32, 1, 1, 1, 1,
		-0.3,  0.125, -0.73, 0/64, 32/32, 1, 1, 1, 1,
		-0.3, -0.125, -0.73, 4/64, 32/32, 1, 1, 1, 1,
		-0.3, -0.125,     0, 4/64, 20/32, 1, 1, 1, 1,
		
		// Left
		-0.01, -0.125,    0,   8/64, 20/32, 1, 1, 1, 1,
		-0.01, -0.125, -0.73,  8/64, 32/32, 1, 1, 1, 1,
		-0.01,  0.125, -0.73, 12/64, 32/32, 1, 1, 1, 1,
		-0.01,  0.125, -0.73, 12/64, 32/32, 1, 1, 1, 1,
		-0.01,  0.125,     0, 12/64, 20/32, 1, 1, 1, 1,
		-0.01, -0.125,     0,  8/64, 20/32, 1, 1, 1, 1
	];
	
	var buffer = this.playerRightLeg = gl.createBuffer();
	buffer.vertices = vertices.length / 9;
	gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.DYNAMIC_DRAW );
}

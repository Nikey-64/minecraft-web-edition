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

	// renderDistance solo se aplica a dimensiones horizontales (X, Z), NO procesa la altura (Y)
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	this.renderDistance = parseInt(localStorage.getItem('renderDistance')) || 8; // chunks default radius (horizontal: X, Z)
	this.chunkSize = 8; // Tamaño horizontal de chunks (X, Z)
	this.chunkSizeY = 256; // Tamaño vertical de chunks (Y) - cubre toda la altura para optimizar aire
	this.camPos = [0, 0, 0]; // Initialize camera position
	this.camAng = [0, 0, 0]; // Initialize camera angles
	this.renderBehind = false; // Option to not render chunks behind the player (disabled by default)
	this.showChunkGrid = false; // Debug: mostrar grilla de chunks
	this.chunkGridBuffer = null; // Buffer para la grilla de chunks

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

	// Update chunks based on player position (cada frame para mejor responsividad)
	// Actualizar camPos desde el jugador antes de updateChunks
	if ( this.world && this.world.localPlayer ) {
		var eyePos = this.world.localPlayer.getEyePos();
		this.camPos = [ eyePos.x, eyePos.y, eyePos.z ];
	}
	
	// Actualizar chunks cada frame para mejor responsividad al moverse
	if (!this._updateChunksFrameCount) this._updateChunksFrameCount = 0;
	this._updateChunksFrameCount++;
	if (this._updateChunksFrameCount >= 3) { // Update chunks every 3 frames (más frecuente)
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

	// Draw level chunks
	var chunks = this.chunks;

	gl.bindTexture( gl.TEXTURE_2D, this.texTerrain );

	if ( chunks != null )
	{
		for ( var i = 0; i < chunks.length; i++ )
		{
			var chunk = chunks[i];
			// Renderizar chunk si está cargado y tiene buffer (o si está cargado pero es solo aire)
			if ( chunk.loaded && chunk.buffer != null )
				this.drawBuffer( chunk.buffer );
		}
	}

	// Draw chunk grid if debug mode is enabled
	if ( this.showChunkGrid && this.world && this.world.localPlayer )
	{
		this.drawChunkGrid();
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
		
		// Ejes: X y Z = horizontal, Y = vertical (altura)
		// El shader espera: X y Y = horizontal, Z = vertical (altura)
		// Por lo tanto, intercambiamos Y y Z: [x, z, y] donde z es altura para el shader
		mat4.identity( this.modelMatrix );
		mat4.translate( this.modelMatrix, [ player.x, player.z, player.y + 1.7 ] ); // [x, z, y] donde y es altura
		mat4.rotateZ( this.modelMatrix, Math.PI - player.yaw );
		mat4.rotateX( this.modelMatrix, -pitch );
		gl.uniformMatrix4fv( this.uModelMat, false, this.modelMatrix );
		
		gl.bindTexture( gl.TEXTURE_2D, this.texPlayer );
		this.drawBuffer( this.playerHead );
		
		// Draw body
		mat4.identity( this.modelMatrix );
		mat4.translate( this.modelMatrix, [ player.x, player.z, player.y + 0.01 ] ); // [x, z, y] donde y es altura
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
		// Ejes: X y Z = horizontal, Y = vertical (altura)
		// blocks[x][y][z] donde x=X, y=Y(altura), z=Z(horizontal)
		var vertices = [];
		for ( var x = min.x; x <= max.x; x++ ) {
			for ( var z = min.z; z <= max.z; z++ ) { // Z es horizontal
				for ( var y = min.y; y <= max.y; y++ ) { // Y es altura
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
	
	// Guardar el estado actual de la cámara y viewport
	var savedViewport = [ gl.viewportWidth, gl.viewportHeight ];
	
	// Configurar la cámara para el picking (usar la misma cámara que el render normal)
	// this.camPos y this.camAng deberían estar actualizados por la última llamada a setCamera
	if ( this.camPos && this.camAng ) {
		this.setCamera( this.camPos, this.camAng );
	}
	
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
	gl.viewport( 0, 0, savedViewport[0], savedViewport[1] );
	gl.clearColor( 0.62, 0.81, 1.0, 1.0 );
	
	// Restaurar la cámara (se restaurará en la siguiente llamada a draw())
	
	// Clean up
	gl.deleteRenderbuffer( renderbuffer );
	gl.deleteTexture( bt );
	gl.deleteFramebuffer( fbo );
	
	if ( !hitDetected )
		return false;
	
	// Decodificar coordenadas desde el picking buffer
	// getPickingColor codifica las coordenadas como valores normalizados (0-1)
	// readPixels devuelve valores en rango 0-255 (representando 0.0-1.0)
	// Necesitamos reconstruir el valor original: byteBajo + (byteAlto << 8)
	// Ejes del mundo: X y Z = horizontal, Y = vertical (altura)
	// pixelXY almacena: x (bytes 0-1), y (bytes 2-3) donde y es altura
	// pixelZ almacena: z (bytes 0-1) donde z es horizontal, faceId (byte 2)
	var x = pixelXY[0] | ( pixelXY[1] << 8 );
	var y = pixelXY[2] | ( pixelXY[3] << 8 ); // Y es altura
	var z = pixelZ[0] | ( pixelZ[1] << 8 ); // Z es horizontal
	var face = pixelZ[2];
	
	// Verificar que las coordenadas estén dentro del rango esperado
	if ( x < min.x || x > max.x || y < min.y || y > max.y || z < min.z || z > max.z ) {
		// Coordenadas fuera de rango, posible error de decodificación
		console.warn( 'pickAt: coordenadas fuera de rango', { x, y, z, min, max, pixelXY, pixelZ, face } );
		return false;
	}
	
	// Normales en el formato del mundo: [x, y, z] donde y es altura
	var normal;
	if ( face == 1 ) normal = new Vector( 0, 1, 0 );  // Top (Y+1, arriba)
	else if ( face == 2 ) normal = new Vector( 0, -1, 0 );  // Bottom (Y-1, abajo)
	else if ( face == 3 ) normal = new Vector( 0, 0, -1 );  // Front (Z-1, hacia -Z, horizontal)
	else if ( face == 4 ) normal = new Vector( 0, 0, 1 );  // Back (Z+1, hacia +Z, horizontal)
	else if ( face == 5 ) normal = new Vector( -1, 0, 0 );  // Left (X-1)
	else if ( face == 6 ) normal = new Vector( 1, 0, 0 );  // Right (X+1)
	else {
		console.warn( 'pickAt: face desconocido', face );
		normal = new Vector( 0, 0, 0 );
	}
	
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

Renderer.prototype.setWorld = function( world, chunkSize, chunkSizeY )
{
	this.world = world;
	world.renderer = this;
	this.chunkSize = chunkSize || 8;
	this.chunkSizeY = chunkSizeY || 256;
	if ( world.setChunking ) world.setChunking( this.chunkSize, this.chunkSizeY );
	this.chunkLookup = {};
	this.loadedChunks = new Set();
	this.dirtyChunks = []; // List of chunks that need to be rebuilt

	// Create chunk list - 8x8x256 (X, Z horizontal, Y vertical)
	// Chunks: 8 en X, 8 en Z (horizontal), 256 en Y (vertical, altura)
	var chunks = this.chunks = [];
	for ( var x = 0; x < world.sx; x += this.chunkSize ) {
		for ( var z = 0; z < world.sz; z += this.chunkSize ) {
			// Solo un chunk vertical por columna (cubre toda la altura Y)
			var y = 0;
			var chunk = {
				start: [ x, y, z ],
				end: [ Math.min( world.sx, x + this.chunkSize ), Math.min( world.sy, y + this.chunkSizeY ), Math.min( world.sz, z + this.chunkSize ) ],
				cx: x / this.chunkSize,
				cz: z / this.chunkSize,
				cy: 0, // Siempre 0 porque solo hay un chunk vertical (cubre toda la altura Y)
				dirty: true,
				loaded: false
			};
			chunk.key = this.getChunkKey( chunk.cx, chunk.cz, chunk.cy );
			this.chunkLookup[chunk.key] = chunk;
			chunks.push( chunk );
		}
	}

	// Initialize spawn chunks with loaded: true
	// IMPORTANTE: renderDistance solo se aplica a dimensiones horizontales (X, Z), NO procesa la altura (Y)
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	var spawnChunkX = Math.floor(world.spawn[0] / this.chunkSize);
	var spawnChunkZ = Math.floor(world.spawn[2] / this.chunkSize);
	// spawnChunkY NO se usa porque renderDistance no procesa la altura

	for ( var i = 0; i < chunks.length; i++ ) {
		var chunk = chunks[i];
		// Comparar coordenadas de chunks horizontales (solo X y Z, NO altura Y)
		var chunkDistX = Math.abs(chunk.cx - spawnChunkX);
		var chunkDistZ = Math.abs(chunk.cz - spawnChunkZ);
		// NO comparamos chunk.cy porque renderDistance no se aplica a la altura Y
		
		if ( chunkDistX <= this.renderDistance && chunkDistZ <= this.renderDistance ) {
			this.loadChunk( chunk );
			// loadChunk already adds to dirtyChunks, so we're good
		}
	}
}

Renderer.prototype.getChunkKey = function( cx, cz, cy )
{
	// cx, cz = coordenadas horizontales, cy = siempre 0 (un solo chunk vertical)
	return cx + "|" + cz + "|" + cy;
}

// isChunkInRange( chunkX, chunkZ, chunkY, playerX, playerZ, playerY )
//
// Returns true if the chunk at (chunkX, chunkZ, chunkY) is within render distance of the player at (playerX, playerZ, playerY).
// IMPORTANTE: renderDistance solo se aplica a dimensiones horizontales (X, Z), NO procesa la altura (Y).
// Ejes: X y Z = horizontal, Y = vertical (altura)
// Los chunks son 8x8x256, donde 8x8 es horizontal (X, Z) y 256 es vertical (Y, altura).
Renderer.prototype.isChunkInRange = function( chunkX, chunkZ, chunkY, playerX, playerZ, playerY )
{
	// Calcular coordenadas de chunk del jugador (solo horizontales X y Z, NO altura Y)
	var playerChunkX = Math.floor(playerX / this.chunkSize);
	var playerChunkZ = Math.floor(playerZ / this.chunkSize);
	// chunkY siempre es 0 porque solo hay un chunk vertical por columna (cubre toda la altura Y)
	// La altura (Y) NO se procesa con renderDistance

	// Calcular distancias horizontales (solo X y Z, NO altura Y)
	var distX = Math.abs(chunkX - playerChunkX);
	var distZ = Math.abs(chunkZ - playerChunkZ);
	// NO verificamos distY porque renderDistance no se aplica a la altura Y

	return distX <= this.renderDistance && distZ <= this.renderDistance;
};

// unloadChunk( chunkIndex )
//
// Unloads the chunk at the specified index by setting loaded to false and deleting the buffer.

Renderer.prototype.unloadChunk = function( chunkIndexOrChunk )
{
	var chunk = typeof chunkIndexOrChunk === "number" ? this.chunks[chunkIndexOrChunk] : chunkIndexOrChunk;
	if ( !chunk ) return;
	if ( this.world && this.world.persistChunk )
		this.world.persistChunk( chunk, this.chunkSize, this.chunkSizeY );
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
// IMPORTANTE: renderDistance solo se aplica a dimensiones horizontales (X, Z), NO procesa la altura (Y).
// Ejes: X y Z = horizontal, Y = vertical (altura)
// Los chunks son 8x8x256, donde 8x8 es horizontal (X, Z) y 256 es vertical (Y, altura).

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
		this.world.ensureChunkLoaded( chunk, this.chunkSize, this.chunkSizeY );
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

	// Usar posición del jugador directamente en lugar de camPos (más confiable)
	var player = this.world.localPlayer;
	var playerX, playerY, playerZ;
	if ( player && player.pos ) {
		var eyePos = player.getEyePos();
		playerX = eyePos.x;
		playerY = eyePos.y;
		playerZ = eyePos.z;
	} else {
		// Fallback a camPos si no hay jugador
		playerX = this.camPos[0];
		playerY = this.camPos[1];
		playerZ = this.camPos[2];
	}
	
	// Calcular coordenadas de chunk del jugador (solo horizontales X y Z, NO altura Y)
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	var playerChunkX = Math.floor( playerX / this.chunkSize );
	var playerChunkZ = Math.floor( playerZ / this.chunkSize );
	// NOTA: playerChunkY NO se calcula ni se usa porque renderDistance no procesa la altura Y
	var targetKeys = new Set();

	// IMPORTANTE: renderDistance solo se aplica a dimensiones horizontales (X, Z)
	// NO iteramos sobre Y porque los chunks son 8x8x256 (un solo chunk vertical por columna que cubre toda la altura Y)
	// La altura (Y) NO se procesa con renderDistance
	for ( var dx = -this.renderDistance; dx <= this.renderDistance; dx++ ) {
		for ( var dz = -this.renderDistance; dz <= this.renderDistance; dz++ ) {
			var cx = playerChunkX + dx;
			var cz = playerChunkZ + dz;
			var cy = 0; // Siempre 0 porque solo hay un chunk vertical (cubre toda la altura Y)
			
			// Verificar límites del mundo (solo X y Z, Y se cubre completamente)
			var chunkX = cx * this.chunkSize;
			var chunkZ = cz * this.chunkSize;
			if ( chunkX < 0 || chunkX >= this.world.sx || chunkZ < 0 || chunkZ >= this.world.sz ) continue;
			
			if ( !this.isChunkInRange( cx, cz, cy, playerX, playerZ, playerY ) ) continue;
			var key = this.getChunkKey( cx, cz, cy );
			targetKeys.add( key );
			
			var chunk = this.chunkLookup && this.chunkLookup[key];
			if ( !chunk ) {
				// Chunk no existe en lookup, crearlo
				var y = 0; // Chunk empieza en Y=0 y cubre toda la altura
				chunk = {
					start: [ chunkX, y, chunkZ ],
					end: [ Math.min( this.world.sx, chunkX + this.chunkSize ), Math.min( this.world.sy, y + this.chunkSizeY ), Math.min( this.world.sz, chunkZ + this.chunkSize ) ],
					cx: cx,
					cz: cz,
					cy: cy,
					dirty: true,
					loaded: false
				};
				chunk.key = key;
				this.chunkLookup[key] = chunk;
				this.chunks.push( chunk );
			}
			
			if ( chunk && !chunk.loaded ) {
				this.loadChunk( chunk );
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


// drawChunkGrid()
//
// Draws a wireframe grid showing chunk boundaries (debug mode)
Renderer.prototype.drawChunkGrid = function()
{
	if ( !this.world || !this.chunks ) return;
	
	var gl = this.gl;
	var player = this.world.localPlayer;
	if ( !player ) return;
	
	var pos = player.pos;
	var renderDist = this.renderDistance;
	var chunkSize = this.chunkSize;
	
	// Crear buffer de líneas si no existe
	if ( !this.chunkGridBuffer )
	{
		this.chunkGridBuffer = gl.createBuffer();
	}
	
	// Calcular chunks visibles (solo horizontales X y Z, NO altura Y)
	// IMPORTANTE: renderDistance solo se aplica a dimensiones horizontales (X, Z)
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	var playerChunkX = Math.floor( pos.x / chunkSize );
	var playerChunkZ = Math.floor( pos.z / chunkSize );
	
	var lines = [];
	
	// Dibujar líneas verticales de altura (bordes de chunks en X)
	// NOTA: Estas líneas muestran la altura completa del chunk (Y), pero renderDistance solo se aplica horizontalmente (X, Z)
	for ( var dx = -renderDist; dx <= renderDist; dx++ )
	{
		var cx = playerChunkX + dx;
		var x = cx * chunkSize;
		if ( x < 0 || x >= this.world.sx ) continue;
		
		// Línea desde Y=0 hasta Y=sy (altura completa, no afectada por renderDistance)
		for ( var dz = -renderDist; dz <= renderDist; dz++ )
		{
			var cz = playerChunkZ + dz;
			var z = cz * chunkSize;
			if ( z < 0 || z >= this.world.sz ) continue;
			
			// Línea vertical de altura en X (renderDistance solo afecta si se dibuja, no la altura Y)
			lines.push( x, 0, z );
			lines.push( x, this.world.sy, z );
		}
	}
	
	// Dibujar líneas verticales de altura (bordes de chunks en Z)
	// NOTA: Estas líneas muestran la altura completa del chunk (Y), pero renderDistance solo se aplica horizontalmente (X, Z)
	for ( var dz = -renderDist; dz <= renderDist; dz++ )
	{
		var cz = playerChunkZ + dz;
		var z = cz * chunkSize;
		if ( z < 0 || z >= this.world.sz ) continue;
		
		for ( var dx = -renderDist; dx <= renderDist; dx++ )
		{
			var cx = playerChunkX + dx;
			var x = cx * chunkSize;
			if ( x < 0 || x >= this.world.sx ) continue;
			
			// Línea vertical de altura en Z (renderDistance solo afecta si se dibuja, no la altura Y)
			lines.push( x, 0, z );
			lines.push( x, this.world.sy, z );
		}
	}
	
	// Dibujar líneas horizontales en el suelo (Y=0) - solo bordes de chunks
	// NOTA: Solo dibujar los bordes exteriores de los chunks para evitar sobrecarga visual
	for ( var dx = -renderDist; dx <= renderDist; dx++ )
	{
		for ( var dz = -renderDist; dz <= renderDist; dz++ )
		{
			var cx = playerChunkX + dx;
			var cz = playerChunkZ + dz;
			var x = cx * chunkSize;
			var z = cz * chunkSize;
			
			if ( x < 0 || x >= this.world.sx || z < 0 || z >= this.world.sz ) continue;
			
			// Solo dibujar bordes de chunks (no todas las líneas internas)
			var isEdgeX = (dx === -renderDist || dx === renderDist);
			var isEdgeZ = (dz === -renderDist || dz === renderDist);
			
			if ( isEdgeX || isEdgeZ ) {
				// Líneas horizontales en Y=0 (suelo) - plano XZ
				if ( isEdgeX ) {
					// Línea en dirección Z
					lines.push( x, 0, z );
					lines.push( x, 0, z + chunkSize );
				}
				if ( isEdgeZ ) {
					// Línea en dirección X
					lines.push( x, 0, z );
					lines.push( x + chunkSize, 0, z );
				}
			}
		}
	}
	
	if ( lines.length === 0 ) return;
	
	// Configurar para dibujar líneas
	gl.disable( gl.DEPTH_TEST );
	gl.lineWidth( 1.0 );
	
	// Crear buffer temporal para las líneas
	var lineBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, lineBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( lines ), gl.STREAM_DRAW );
	
	// Configurar atributos - usar el mismo formato que los bloques (9 floats por vértice)
	// Pero para líneas solo necesitamos posición (3 floats)
	gl.enableVertexAttribArray( this.aPos );
	gl.vertexAttribPointer( this.aPos, 3, gl.FLOAT, false, 0, 0 );
	
	// Deshabilitar otros atributos temporalmente
	gl.disableVertexAttribArray( this.aColor );
	gl.disableVertexAttribArray( this.aTexCoord );
	
	// Color verde para la grilla (usar atributo de color directamente)
	gl.vertexAttrib4f( this.aColor, 0.0, 1.0, 0.0, 0.8 ); // Más opaco para mejor visibilidad
	gl.vertexAttrib2f( this.aTexCoord, 0, 0 );
	
	// Usar matriz de modelo identidad para las líneas
	mat4.identity( this.modelMatrix );
	gl.uniformMatrix4fv( this.uModelMat, false, this.modelMatrix );
	
	// Dibujar líneas
	gl.drawArrays( gl.LINES, 0, lines.length / 3 );
	
	// Restaurar atributos
	gl.enableVertexAttribArray( this.aColor );
	gl.enableVertexAttribArray( this.aTexCoord );
	
	// Restaurar estado
	gl.enable( gl.DEPTH_TEST );
	gl.deleteBuffer( lineBuffer );
}

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
		
		// Ejes: X y Z = horizontal, Y = vertical (altura)
		// chunk.start = [x, y, z] donde y es altura
		// Verificar si el bloque está dentro del chunk
		if ( x >= chunk.start[0] && x < chunk.end[0] && 
		     y >= chunk.start[1] && y < chunk.end[1] && 
		     z >= chunk.start[2] && z < chunk.end[2] )
		{
			chunk.dirty = true;
		}
		// También marcar chunks vecinos si el bloque está en un borde (para actualizar caras adyacentes)
		// Borde Z (horizontal)
		else if ( x >= chunk.start[0] && x < chunk.end[0] && 
		          y >= chunk.start[1] && y < chunk.end[1] && 
		          ( z == chunk.end[2] || z == chunk.start[2] - 1 ) )
		{
			chunk.dirty = true;
		}
		// Borde Y (altura)
		else if ( x >= chunk.start[0] && x < chunk.end[0] && 
		          z >= chunk.start[2] && z < chunk.end[2] && 
		          ( y == chunk.end[1] || y == chunk.start[1] - 1 ) )
		{
			chunk.dirty = true;
		}
		// Borde X
		else if ( y >= chunk.start[1] && y < chunk.end[1] && 
		          z >= chunk.start[2] && z < chunk.end[2] && 
		          ( x == chunk.end[0] || x == chunk.start[0] - 1 ) )
		{
			chunk.dirty = true;
		}
		
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
		// Ejes del mundo: X y Z = horizontal, Y = vertical (altura)
		// chunk.start = [x, y, z] donde y es altura
		// blocks[x][y][z] donde x=X, y=Y(altura), z=Z(horizontal)
		// lightmap[x][z] donde z es la coordenada Z horizontal
		// Y el valor almacenado es la altura Y
		var maxLightCheckY = Math.min( world.sy - 1, chunk.end[1] + 32 );
		var lightmap = {};
		for ( var x = chunk.start[0] - 1; x < chunk.end[0] + 1; x++ )
		{
			if ( x < 0 || x >= world.sx || !world.blocks[x] ) continue;
			lightmap[x] = {};
			
			// Para cada columna (x, z del mundo), buscar el bloque más alto no transparente en Y
			for ( var z = chunk.start[2] - 1; z < chunk.end[2] + 1; z++ )
			{
				if ( z < 0 || z >= world.sz ) continue;
				// Buscar desde arriba hacia abajo en Y (altura del mundo)
				for ( var y = maxLightCheckY; y >= 0; y-- )
				{
					if ( !world.blocks[x] || !world.blocks[x][y] || !world.blocks[x][y][z] ) continue;
					// lightmap[x][z] donde z es la coordenada Z horizontal
					// Almacenamos y (altura del mundo) como el valor Y altura
					lightmap[x][z] = y;
					if ( !world.getBlock( x, y, z ).transparent ) break;
				}
			}
		}
		
		// Add vertices for blocks
		// Ejes: X y Z = horizontal, Y = vertical (altura)
		// chunk.start = [x, y, z] donde y es altura
		// blocks[x][y][z] donde x=X, y=Y(altura), z=Z(horizontal)
		for ( var x = chunk.start[0]; x < chunk.end[0]; x++ ) {
			// Verificar límites
			if ( x < 0 || x >= world.sx ) continue;
			if ( !world.blocks[x] ) continue;
			
			for ( var z = chunk.start[2]; z < chunk.end[2]; z++ ) { // Z es horizontal
				// Verificar límites
				if ( z < 0 || z >= world.sz ) continue;
				
				for ( var y = chunk.start[1]; y < chunk.end[1]; y++ ) { // Y es altura
					// Verificar límites
					if ( y < 0 || y >= world.sy ) continue;
					if ( !world.blocks[x][y] ) continue;
					
					// Verificar que el bloque exista antes de acceder
					var block = world.blocks[x][y][z];
					if ( block === undefined ) {
						// Si el bloque no está definido, saltarlo (no debería pasar si ensureChunkLoaded funciona)
						continue;
					}
					
					if ( block == BLOCK.AIR ) continue;
					
					// Consultar animaciones de caída si existe el sistema de física
					var yOffset = 0;
					var animKey = x + "," + y + "," + z;
					var isAnimated = false;
					
					if ( world.physics && world.physics.fallingBlocks && world.physics.fallingBlocks[animKey] ) {
						// Este bloque está en animación
						var anim = world.physics.fallingBlocks[animKey];
						if ( anim.currentY !== undefined ) {
							yOffset = anim.currentY - anim.startY;
							isAnimated = true;
							// Si el offset es muy pequeño, aún no ha comenzado la animación
							if ( Math.abs( yOffset ) < 0.01 ) {
								yOffset = 0;
								isAnimated = false;
							}
						}
					}
					
					// Si el bloque está en animación, renderizarlo en su posición animada
					// (no renderizarlo en su posición original porque visualmente está cayendo)
					if ( isAnimated ) {
						// Renderizar el bloque en su posición animada
						BLOCK.pushVertices( vertices, world, lightmap, x, y, z, yOffset );
					} else {
						// Renderizar normalmente (pero verificar que no haya un bloque animado encima que esté cayendo aquí)
						// Verificar si hay un bloque animado que esté cayendo a esta posición
						var hasFallingBlockAbove = false;
						if ( world.physics && world.physics.fallingBlocks ) {
							for ( var key in world.physics.fallingBlocks ) {
								var anim = world.physics.fallingBlocks[key];
								if ( anim.x == x && anim.z == z && anim.targetY == y ) {
									// Hay un bloque cayendo a esta posición
									hasFallingBlockAbove = true;
									break;
								}
							}
						}
						
						// Si no hay un bloque cayendo a esta posición, renderizar normalmente
						if ( !hasFallingBlockAbove ) {
							BLOCK.pushVertices( vertices, world, lightmap, x, y, z, 0 );
						}
					}
				}
			}
		}
		
		// Create WebGL buffer
		if ( chunk.buffer ) gl.deleteBuffer( chunk.buffer );
		
		if ( vertices.length > 0 ) {
			var buffer = chunk.buffer = gl.createBuffer();
			buffer.vertices = vertices.length / 9;
			gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
			gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.STATIC_DRAW );
		} else {
			// Chunk vacío (solo aire) - no crear buffer
			chunk.buffer = null;
		}
		
		chunk.dirty = false;
		// Remove from queue
		dirtyChunks.splice( i, 1 );
		i--;
		count--;
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
	
	// Actualizar camPos inmediatamente para que updateChunks() lo use
	// pos viene como [x, y, z] donde y es altura (nuevo sistema)
	this.camPos = pos;
	
	mat4.identity( this.viewMatrix );
	
	// El shader espera coordenadas donde Z es altura
	// Necesitamos intercambiar Y y Z: [x, z, y] donde z es altura para el shader
	// Pero las rotaciones se aplican en el espacio del mundo (donde Y es altura)
	// Así que rotamos primero, luego transformamos las coordenadas
	
	mat4.rotate( this.viewMatrix, -ang[0] - Math.PI / 2, [ 1, 0, 0 ], this.viewMatrix );
	mat4.rotate( this.viewMatrix, ang[1], [ 0, 0, 1 ], this.viewMatrix );
	mat4.rotate( this.viewMatrix, -ang[2], [ 0, 1, 0 ], this.viewMatrix );
	
	// Transformar posición: [x, y, z] (mundo: y=altura) -> [x, z, y] (shader: z=altura)
	// Para la traslación, intercambiamos y y z
	mat4.translate( this.viewMatrix, [ -pos[0], -pos[2], -pos[1] ], this.viewMatrix );
	
	gl.uniformMatrix4fv( this.uViewMat, false, this.viewMatrix );
}

Renderer.prototype.drawBuffer = function( buffer )
{
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

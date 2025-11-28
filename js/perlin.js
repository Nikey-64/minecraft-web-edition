// ==========================================
// Perlin Noise Generator
//
// Implementación de ruido Perlin para generación procedimental de terreno
// Basado en el algoritmo clásico de Ken Perlin
// ==========================================

// PerlinNoise
//
// Generador de ruido Perlin configurable

function PerlinNoise(seed)
{
	this.seed = seed || Math.floor(Math.random() * 2147483647);
	this.permutation = [];
	this.p = [];
	
	// Inicializar tabla de permutación
	this.initPermutation();
}

// Inicializa la tabla de permutación con valores pseudoaleatorios
PerlinNoise.prototype.initPermutation = function()
{
	// Tabla de permutación estándar (256 valores)
	var permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,
		140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,
		247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,
		57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,
		74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,
		60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,
		65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,
		200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,
		52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,
		207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,
		119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,
		129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,
		218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,
		81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,
		184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,
		222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
	
	// Duplicar la tabla para evitar operaciones módulo
	for (var i = 0; i < 512; i++) {
		// Usar seed para variar la permutación
		var index = (this.seed + i) % 256;
		this.p[i] = permutation[index];
		this.permutation[i] = permutation[index];
	}
}

// Función de fade (suavizado) - curva de interpolación cúbica
PerlinNoise.prototype.fade = function(t)
{
	return t * t * t * (t * (t * 6 - 15) + 10);
}

// Función de interpolación lineal
PerlinNoise.prototype.lerp = function(a, b, t)
{
	return a + t * (b - a);
}

// Función gradiente - genera un vector de gradiente pseudoaleatorio
PerlinNoise.prototype.grad = function(hash, x, y, z)
{
	var h = hash & 15;
	var u = h < 8 ? x : y;
	var v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
	return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

// noise3D(x, y, z)
//
// Genera ruido Perlin en 3D
// Retorna un valor entre -1 y 1
//
// x, y, z - Coordenadas de entrada

PerlinNoise.prototype.noise3D = function(x, y, z)
{
	// Encontrar la unidad del cubo que contiene el punto
	var X = Math.floor(x) & 255;
	var Y = Math.floor(y) & 255;
	var Z = Math.floor(z) & 255;
	
	// Obtener coordenadas relativas dentro del cubo
	x -= Math.floor(x);
	y -= Math.floor(y);
	z -= Math.floor(z);
	
	// Calcular funciones de fade para x, y, z
	var u = this.fade(x);
	var v = this.fade(y);
	var w = this.fade(z);
	
	// Obtener índices de gradiente para cada esquina del cubo
	var A = this.p[X] + Y;
	var AA = this.p[A] + Z;
	var AB = this.p[A + 1] + Z;
	var B = this.p[X + 1] + Y;
	var BA = this.p[B] + Z;
	var BB = this.p[B + 1] + Z;
	
	// Calcular valores de gradiente en cada esquina
	var g000 = this.grad(this.p[AA], x, y, z);
	var g001 = this.grad(this.p[AB], x, y, z - 1);
	var g010 = this.grad(this.p[AA + 1], x, y - 1, z);
	var g011 = this.grad(this.p[AB + 1], x, y - 1, z - 1);
	var g100 = this.grad(this.p[BA], x - 1, y, z);
	var g101 = this.grad(this.p[BB], x - 1, y, z - 1);
	var g110 = this.grad(this.p[BA + 1], x - 1, y - 1, z);
	var g111 = this.grad(this.p[BB + 1], x - 1, y - 1, z - 1);
	
	// Interpolación trilineal
	var x00 = this.lerp(g000, g100, u);
	var x01 = this.lerp(g001, g101, u);
	var x10 = this.lerp(g010, g110, u);
	var x11 = this.lerp(g011, g111, u);
	
	var y0 = this.lerp(x00, x10, v);
	var y1 = this.lerp(x01, x11, v);
	
	return this.lerp(y0, y1, w);
}

// noise2D(x, z)
//
// Genera ruido Perlin en 2D (para altura de terreno)
// Retorna un valor entre -1 y 1
//
// x, z - Coordenadas horizontales

PerlinNoise.prototype.noise2D = function(x, z)
{
	// Usar y=0 para ruido 2D
	return this.noise3D(x, 0, z);
}

// octaveNoise2D(x, z, octaves, persistence, scale)
//
// Genera ruido Perlin con múltiples octavas (fractal noise)
// Útil para generar terreno más natural con diferentes escalas de detalle
//
// x, z - Coordenadas horizontales
// octaves - Número de capas de ruido (más octavas = más detalle)
// persistence - Factor de persistencia (afecta la amplitud de cada octava)
// scale - Escala del ruido (valores menores = terreno más suave)

PerlinNoise.prototype.octaveNoise2D = function(x, z, octaves, persistence, scale)
{
	if (octaves === undefined) octaves = 4;
	if (persistence === undefined) persistence = 0.5;
	if (scale === undefined) scale = 0.1;
	
	var value = 0;
	var amplitude = 1;
	var frequency = scale;
	var maxValue = 0;
	
	for (var i = 0; i < octaves; i++) {
		value += this.noise2D(x * frequency, z * frequency) * amplitude;
		maxValue += amplitude;
		amplitude *= persistence;
		frequency *= 2;
	}
	
	return value / maxValue;
}

// TerrainGenerator
//
// Generador de terreno usando ruido Perlin

function TerrainGenerator(seed, options)
{
	this.perlin = new PerlinNoise(seed);
	this.options = options || {};
	
	// Configuración por defecto
	this.baseHeight = this.options.baseHeight || 64;
	this.heightVariation = this.options.heightVariation || 32;
	this.noiseScale = this.options.noiseScale || 0.05;
	this.octaves = this.options.octaves || 6;
	this.persistence = this.options.persistence || 0.5;
	
	// Configuración de biomas (opcional)
	this.useBiomes = this.options.useBiomes || false;
}

// getHeightAt(x, z)
//
// Calcula la altura del terreno en una posición (x, z)
// Retorna la altura en bloques (número entero)

TerrainGenerator.prototype.getHeightAt = function(x, z)
{
	// Generar ruido con múltiples octavas para terreno más natural
	var noiseValue = this.perlin.octaveNoise2D(
		x, 
		z, 
		this.octaves, 
		this.persistence, 
		this.noiseScale
	);
	
	// Convertir ruido (-1 a 1) a altura de terreno
	var height = this.baseHeight + noiseValue * this.heightVariation;
	
	return Math.floor(height);
}

// getBlockAt(x, y, z)
//
// Determina qué tipo de bloque debe ir en la posición (x, y, z)
// Retorna el tipo de bloque (BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, etc.)

TerrainGenerator.prototype.getBlockAt = function(x, y, z)
{
	var height = this.getHeightAt(x, z);
	
	// Aire por encima del terreno
	if (y > height) {
		return BLOCK.AIR;
	}
	// Capa de hierba en la superficie
	else if (y === height) {
		return BLOCK.GRASS;
	}
	// Capa de tierra (3-4 bloques de tierra debajo de la hierba)
	else if (y > height - 4) {
		return BLOCK.DIRT;
	}
	// Piedra debajo de la tierra
	else {
		return BLOCK.STONE;
	}
}

// generateChunkBlocks(cx, cz, chunkSize, startX, startZ, endX, endZ, endY)
//
// Genera todos los bloques de un chunk usando ruido Perlin
// Este método es llamado por World.generateAndSaveAllChunks() y ensureChunkLoaded()

TerrainGenerator.prototype.generateChunkBlocks = function(cx, cz, chunkSize, startX, startZ, endX, endZ, endY)
{
	var blocks = {};
	var self = this;
	
	// Generar altura del terreno para cada columna (x, z) del chunk
	for (var x = startX; x < endX; x++) {
		for (var z = startZ; z < endZ; z++) {
			var height = self.getHeightAt(x, z);
			
			// Generar bloques desde y=0 hasta la altura del terreno
			for (var y = 0; y < endY; y++) {
				// Inicializar arrays si es necesario
				if (!blocks[x]) blocks[x] = {};
				if (!blocks[x][y]) blocks[x][y] = {};
				
				// Determinar tipo de bloque según la altura
				if (y > height) {
					blocks[x][y][z] = BLOCK.AIR;
				}
				else if (y === height) {
					blocks[x][y][z] = BLOCK.GRASS;
				}
				else if (y > height - 4) {
					blocks[x][y][z] = BLOCK.DIRT;
				}
				else {
					blocks[x][y][z] = BLOCK.STONE;
				}
			}
		}
	}
	
	return blocks;
}


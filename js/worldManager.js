// ==========================================
// World Manager
//
// Manages multiple worlds using IndexedDB for client-side storage.
// Worlds are stored as separate databases to avoid loading everything into RAM.
// ==========================================

// WorldManager constructor
//
// Manages world creation, loading, and storage using IndexedDB.

function WorldManager()
{
	this.dbName = "minecraft_worlds";
	this.dbVersion = 1;
	this.db = null;
	this.currentWorldId = null;
}

// initialize()
//
// Initializes the IndexedDB database.

WorldManager.prototype.initialize = function()
{
	var self = this;
	return new Promise(function(resolve, reject) {
		var request = indexedDB.open(self.dbName, self.dbVersion);
		
		request.onerror = function() {
			reject(new Error("Failed to open IndexedDB: " + request.error));
		};
		
		request.onsuccess = function() {
			self.db = request.result;
			resolve(self.db);
		};
		
		request.onupgradeneeded = function(event) {
			var db = event.target.result;
			
			// Create object store for world metadata
			if (!db.objectStoreNames.contains("worlds")) {
				var worldStore = db.createObjectStore("worlds", { keyPath: "id", autoIncrement: true });
				worldStore.createIndex("name", "name", { unique: false });
				worldStore.createIndex("created", "created", { unique: false });
			}
			
			// Create object store for chunks (one per world)
			// We'll create these dynamically when a world is created
		};
	});
};

// createWorld( name, sizeX, sizeY, sizeZ, flatHeight, gameMode )
//
// Creates a new flat world and stores it in IndexedDB.
// Returns a promise that resolves with the world ID.
// gameMode: 0 = Survival, 1 = Creative, 2 = Spectator (default: 0)

WorldManager.prototype.createWorld = function(name, sizeX, sizeY, sizeZ, flatHeight, gameMode)
{
	var self = this;
	flatHeight = flatHeight || 4; // Default flat world height
	gameMode = (gameMode !== undefined && gameMode !== null) ? gameMode : 0; // Default: Survival (0)
	
	return new Promise(function(resolve, reject) {
		if (!self.db) {
			reject(new Error("Database not initialized"));
			return;
		}
		
		// Create world metadata
		var worldData = {
			name: name,
			sizeX: sizeX,
			sizeY: sizeY,
			sizeZ: sizeZ,
			flatHeight: flatHeight,
			gameMode: gameMode,
			created: Date.now(),
			modified: Date.now(),
			spawn: {
				x: sizeX / 2 + 0.5,
				y: flatHeight + 1,
				z: sizeZ / 2 + 0.5
			}
		};
		
		// Store world metadata
		var transaction = self.db.transaction(["worlds"], "readwrite");
		var store = transaction.objectStore("worlds");
		var request = store.add(worldData);
		
		request.onsuccess = function() {
			var worldId = request.result;
			
			// Create separate database for this world's chunks
			self.createWorldDatabase(worldId).then(function() {
				worldData.id = worldId;
				resolve(worldData);
			}).catch(reject);
		};
		
		request.onerror = function() {
			reject(new Error("Failed to create world: " + request.error));
		};
	});
};

// createWorldDatabase( worldId )
//
// Creates a separate IndexedDB database for storing chunks of a specific world.

WorldManager.prototype.createWorldDatabase = function(worldId)
{
	return new Promise(function(resolve, reject) {
		var dbName = "minecraft_world_" + worldId;
		var request = indexedDB.open(dbName, 1);
		
		request.onerror = function() {
			reject(new Error("Failed to create world database: " + request.error));
		};
		
		request.onsuccess = function() {
			resolve(request.result);
		};
		
		request.onupgradeneeded = function(event) {
			var db = event.target.result;
			
			// Create object store for chunks
			if (!db.objectStoreNames.contains("chunks")) {
				var chunkStore = db.createObjectStore("chunks", { keyPath: "key" });
				chunkStore.createIndex("key", "key", { unique: true });
			}
		};
	});
};

// getWorlds()
//
// Gets a list of all worlds.
// Returns a promise that resolves with an array of world metadata.

WorldManager.prototype.getWorlds = function()
{
	var self = this;
	return new Promise(function(resolve, reject) {
		if (!self.db) {
			reject(new Error("Database not initialized"));
			return;
		}
		
		var transaction = self.db.transaction(["worlds"], "readonly");
		var store = transaction.objectStore("worlds");
		var request = store.getAll();
		
		request.onsuccess = function() {
			resolve(request.result);
		};
		
		request.onerror = function() {
			reject(new Error("Failed to get worlds: " + request.error));
		};
	});
};

// getWorld( worldId )
//
// Gets world metadata by ID.
// Returns a promise that resolves with world metadata.

WorldManager.prototype.getWorld = function(worldId)
{
	var self = this;
	return new Promise(function(resolve, reject) {
		if (!self.db) {
			reject(new Error("Database not initialized"));
			return;
		}
		
		var transaction = self.db.transaction(["worlds"], "readonly");
		var store = transaction.objectStore("worlds");
		var request = store.get(worldId);
		
		request.onsuccess = function() {
			if (request.result) {
				resolve(request.result);
			} else {
				reject(new Error("World not found"));
			}
		};
		
		request.onerror = function() {
			reject(new Error("Failed to get world: " + request.error));
		};
	});
};

// deleteWorld( worldId )
//
// Deletes a world and all its chunks.
// Returns a promise that resolves when deletion is complete.

WorldManager.prototype.deleteWorld = function(worldId)
{
	var self = this;
	return new Promise(function(resolve, reject) {
		if (!self.db) {
			reject(new Error("Database not initialized"));
			return;
		}
		
		// Delete world metadata
		var transaction = self.db.transaction(["worlds"], "readwrite");
		var store = transaction.objectStore("worlds");
		var request = store.delete(worldId);
		
		request.onsuccess = function() {
			// Delete world's chunk database
			var dbName = "minecraft_world_" + worldId;
			var deleteRequest = indexedDB.deleteDatabase(dbName);
			
			deleteRequest.onsuccess = function() {
				resolve();
			};
			
			deleteRequest.onerror = function() {
				reject(new Error("Failed to delete world database: " + deleteRequest.error));
			};
		};
		
		request.onerror = function() {
			reject(new Error("Failed to delete world: " + request.error));
		};
	});
};

// getWorldChunkDB( worldId )
//
// Gets the IndexedDB database for a world's chunks.
// Returns a promise that resolves with the database.

WorldManager.prototype.getWorldChunkDB = function(worldId)
{
	return new Promise(function(resolve, reject) {
		var dbName = "minecraft_world_" + worldId;
		var request = indexedDB.open(dbName, 1);
		
		request.onerror = function() {
			reject(new Error("Failed to open world database: " + request.error));
		};
		
		request.onsuccess = function() {
			resolve(request.result);
		};
		
		request.onupgradeneeded = function(event) {
			var db = event.target.result;
			
			// Create object store for chunks if it doesn't exist
			if (!db.objectStoreNames.contains("chunks")) {
				var chunkStore = db.createObjectStore("chunks", { keyPath: "key" });
				chunkStore.createIndex("key", "key", { unique: true });
			}
		};
	});
};

// saveChunk( worldId, chunkKey, chunkData )
//
// Saves a chunk to IndexedDB.
// chunkKey: string like "cx|cz|cy"
// chunkData: string representation of the chunk

WorldManager.prototype.saveChunk = function(worldId, chunkKey, chunkData)
{
	var self = this;
	return new Promise(function(resolve, reject) {
		self.getWorldChunkDB(worldId).then(function(db) {
			var transaction = db.transaction(["chunks"], "readwrite");
			var store = transaction.objectStore("chunks");
			
			var chunkRecord = {
				key: chunkKey,
				data: chunkData,
				modified: Date.now()
			};
			
			var request = store.put(chunkRecord);
			
			request.onsuccess = function() {
				resolve();
			};
			
			request.onerror = function() {
				reject(new Error("Failed to save chunk: " + request.error));
			};
		}).catch(reject);
	});
};

// loadChunk( worldId, chunkKey )
//
// Loads a chunk from IndexedDB.
// Returns a promise that resolves with chunk data string, or null if not found.

WorldManager.prototype.loadChunk = function(worldId, chunkKey)
{
	var self = this;
	return new Promise(function(resolve, reject) {
		self.getWorldChunkDB(worldId).then(function(db) {
			var transaction = db.transaction(["chunks"], "readonly");
			var store = transaction.objectStore("chunks");
			var request = store.get(chunkKey);
			
			request.onsuccess = function() {
				if (request.result) {
					resolve(request.result.data);
				} else {
					resolve(null);
				}
			};
			
			request.onerror = function() {
				reject(new Error("Failed to load chunk: " + request.error));
			};
		}).catch(reject);
	});
};

// updateWorldMetadata( worldId, updates )
//
// Updates world metadata (e.g., modified time, spawn position).
// updates: object with properties to update

WorldManager.prototype.updateWorldMetadata = function(worldId, updates)
{
	var self = this;
	return new Promise(function(resolve, reject) {
		if (!self.db) {
			reject(new Error("Database not initialized"));
			return;
		}
		
		// Get current world data
		self.getWorld(worldId).then(function(worldData) {
			// Merge updates
			for (var key in updates) {
				if (updates.hasOwnProperty(key)) {
					worldData[key] = updates[key];
				}
			}
			worldData.modified = Date.now();
			
			// Save updated data
			var transaction = self.db.transaction(["worlds"], "readwrite");
			var store = transaction.objectStore("worlds");
			var request = store.put(worldData);
			
			request.onsuccess = function() {
				resolve(worldData);
			};
			
			request.onerror = function() {
				reject(new Error("Failed to update world: " + request.error));
			};
		}).catch(reject);
	});
};

// ==========================================
// World API
//
// Simple API for creating and managing worlds.
// ==========================================

// Global world manager instance
var worldManager = null;

// initializeWorldManager()
//
// Initializes the global world manager.

function initializeWorldManager()
{
	if (!worldManager) {
		worldManager = new WorldManager();
	}
	return worldManager.initialize();
}

// createNewWorld( name, sizeX, sizeY, sizeZ, flatHeight, gameMode )
//
// Creates a new flat world.
// Returns a promise that resolves with world metadata.
// gameMode: 0 = Survival, 1 = Creative, 2 = Spectator (default: 0)

function createNewWorld(name, sizeX, sizeY, sizeZ, flatHeight, gameMode)
{
	if (!worldManager) {
		return Promise.reject(new Error("World manager not initialized"));
	}
	return worldManager.createWorld(name, sizeX, sizeY, sizeZ, flatHeight, gameMode);
}

// getAllWorlds()
//
// Gets all worlds.
// Returns a promise that resolves with an array of world metadata.

function getAllWorlds()
{
	if (!worldManager) {
		return Promise.reject(new Error("World manager not initialized"));
	}
	return worldManager.getWorlds();
}

// getWorldById( worldId )
//
// Gets a world by ID.
// Returns a promise that resolves with world metadata.

function getWorldById(worldId)
{
	if (!worldManager) {
		return Promise.reject(new Error("World manager not initialized"));
	}
	return worldManager.getWorld(worldId);
}

// deleteWorldById( worldId )
//
// Deletes a world.
// Returns a promise that resolves when deletion is complete.

function deleteWorldById(worldId)
{
	if (!worldManager) {
		return Promise.reject(new Error("World manager not initialized"));
	}
	return worldManager.deleteWorld(worldId);
}


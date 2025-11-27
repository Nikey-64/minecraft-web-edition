// ==========================================
// Item System
//
// This file contains the item management system for the game.
// Items can be blocks, tools, consumables, etc.
// ==========================================

// Ensure ITEM is global (similar to BLOCK)
if (typeof ITEM === 'undefined') {
	ITEM = {};
}

// Make ITEM available on window object for browser context
if (typeof window !== 'undefined') {
	window.ITEM = ITEM;
}

// Item Types
var ITEM_TYPE = {};
ITEM_TYPE.BLOCK = 1;
ITEM_TYPE.TOOL = 2;
ITEM_TYPE.CONSUMABLE = 3;
ITEM_TYPE.OTHER = 4;

// Item Class - we must get sure this goes as a global class!
// Represents a single item type with its properties (items should be defined in this file!) err -1
function Item(id, name, type, data, blockId) {
	this.id = id;
	this.name = name || "Unknown Item";
	this.type = type || ITEM_TYPE.OTHER;
	this.data = data || {}; // Additional data (block reference, tool properties, etc.)
	this.maxStack = (data && data.maxStack) ? data.maxStack : 64; // Maximum stack size
	this.icon = (data && data.icon) ? data.icon : null; // Icon texture/thumbnail
	
	// Block ID property: indicates if this item is a block and its block ID
	// This is critical for correctly placing blocks from items
	// Priority: 1) blockId parameter, 2) data.blockId, 3) data.block.id, 4) null
	if (type === ITEM_TYPE.BLOCK) {
		if (blockId !== undefined && blockId !== null) {
			this.blockId = blockId;
		} else if (data && data.blockId !== undefined && data.blockId !== null) {
			this.blockId = data.blockId;
		} else if (data && data.block && data.block.id !== undefined) {
			this.blockId = data.block.id; // Store the block ID from block reference
		} else {
			this.blockId = null; // Not a block item or no block reference
		}
	} else {
		this.blockId = null; // Not a block item
	}
}

// ItemStack Class
// Represents a stack of items in inventory
function ItemStack(item, count) {
	this.item = item || null;
	this.count = count || 0;
}

ItemStack.prototype.isEmpty = function() {
	return this.item === null || this.count <= 0;
};

ItemStack.prototype.isFull = function() {
	if (!this.item) return false;
	return this.count >= this.item.maxStack;
};

ItemStack.prototype.canAdd = function(count) {
	if (!this.item) return false;
	return this.count + count <= this.item.maxStack;
};

ItemStack.prototype.add = function(count) {
	if (!this.item) return 0;
	var toAdd = Math.min(count, this.item.maxStack - this.count);
	this.count += toAdd;
	return toAdd; // Return how many were actually added
};

ItemStack.prototype.remove = function(count) {
	if (!this.item) return false;
	var toRemove = Math.min(count, this.count);
	this.count -= toRemove;
	if (this.count <= 0) {
		this.item = null;
		this.count = 0;
	}
	return toRemove;
};

ItemStack.prototype.clone = function() {
	var stack = new ItemStack(this.item, this.count);
	return stack;
};

// ItemRegistry Class
// Manages all available items in the game - we must use this as a global variable! 
function ItemRegistry() {
	this.items = {}; // id -> Item
	this.itemsByBlock = {}; // block.id -> Item
	this.nextId = 1;
}

ItemRegistry.prototype.register = function(item) {
	if (this.items[item.id]) {
		var existing = this.items[item.id];
		console.warn("Item with id " + item.id + " already exists!");
		console.warn("  Existing: " + (existing.name || "Unknown") + " (type: " + existing.type + ")");
		console.warn("  New: " + (item.name || "Unknown") + " (type: " + item.type + ")");
		console.warn("  This is likely a block ID conflict. Check blocks.js for duplicate IDs.");
		// Don't overwrite - return existing item instead
		return existing;
	}
	this.items[item.id] = item;
	
	// If item is a block, register it in itemsByBlock
	if (item.type === ITEM_TYPE.BLOCK) {
		// Use blockId if available, otherwise try data.block.id
		var blockId = item.blockId;
		if (!blockId && item.data && item.data.block) {
			blockId = item.data.block.id;
		}
		
		if (blockId !== undefined && blockId !== null) {
			// Check for conflicts in itemsByBlock too
			if (this.itemsByBlock[blockId]) {
				console.warn("Block with id " + blockId + " already registered as item!");
				console.warn("  Existing item: " + this.itemsByBlock[blockId].name);
				console.warn("  New item: " + item.name);
				// Don't overwrite - use existing item
				// But still return the item that was passed (for consistency)
			} else {
				this.itemsByBlock[blockId] = item;
			}
		}
	}
	
	return item;
};

ItemRegistry.prototype.get = function(id) {
	return this.items[id] || null;
};

ItemRegistry.prototype.getByBlock = function(block) {
	if (!block) return null;
	return this.itemsByBlock[block.id] || null;
};

ItemRegistry.prototype.getAll = function() {
	var all = [];
	for (var id in this.items) {
		if (this.items.hasOwnProperty(id)) {
			all.push(this.items[id]);
		}
	}
	return all;
};

// Create global ItemRegistry instance - we must use this as a global variable! err1
var ITEM_REGISTRY = new ItemRegistry();

// Register all blocks as items
function registerBlockItems() {
	if (typeof BLOCK === 'undefined') {
		console.warn("BLOCK is not defined, cannot register block items.");
		return;
	}
	
	// First, check for duplicate block IDs - this should be in the blocks.js file! err2
	var blockIdMap = {};
	var duplicateIds = [];
	for (var prop in BLOCK) {
		if (BLOCK.hasOwnProperty(prop) && BLOCK[prop] && typeof BLOCK[prop] === 'object' && BLOCK[prop].id !== undefined) {
			var block = BLOCK[prop];
			var blockId = block.id;
			if (blockIdMap[blockId]) {
				// Duplicate ID found
				if (duplicateIds.indexOf(blockId) === -1) {
					duplicateIds.push(blockId);
					console.error("DUPLICATE BLOCK ID DETECTED: " + blockId);
					console.error("  Block 1: " + blockIdMap[blockId].name);
					console.error("  Block 2: " + prop);
				}
			} else {
				blockIdMap[blockId] = { name: prop, block: block };
			}
		}
	}
	
	if (duplicateIds.length > 0) {
		console.error("Found " + duplicateIds.length + " duplicate block ID(s). Please fix these conflicts in blocks.js");
	}
	
	// Get all spawnable blocks
	var blockIds = [];
	for (var prop in BLOCK) {
		if (BLOCK.hasOwnProperty(prop) && BLOCK[prop] && typeof BLOCK[prop] === 'object' && BLOCK[prop].id !== undefined) {
			var block = BLOCK[prop];
			if (block.spawnable && block.id !== 0) { // Skip AIR
				blockIds.push(block);
			}
		}
	}
	
	// Sort by id for consistent ordering
	blockIds.sort(function(a, b) { return a.id - b.id; });
	
	// Register each block as an item
	// Store items in ITEM global object (similar to BLOCK) for consistency
	for (var i = 0; i < blockIds.length; i++) {
		var block = blockIds[i];
		// Get block name for ITEM property name (e.g., BLOCK.DIRT -> ITEM.DIRT)
		var blockName = getBlockName(block);
		var itemPropertyName = blockName.toUpperCase().replace(/\s+/g, '_'); // "Dirt" -> "DIRT"
		
		// Pass blockId both as parameter and in data to ensure it's set correctly
		var item = new Item(
			block.id, // Use block id as item id
			block.name || blockName,
			ITEM_TYPE.BLOCK,
			{
				block: block,
				blockId: block.id, // Explicitly store block ID in data
				maxStack: 64,
				icon: null // Will be generated from block texture
			},
			block.id // Also pass blockId as parameter
		);
		
		// Store in ITEM global object (similar to BLOCK.DIRT)
		// Try to match the BLOCK property name if possible
		for (var prop in BLOCK) {
			if (BLOCK.hasOwnProperty(prop) && BLOCK[prop] === block) {
				ITEM[prop] = item; // e.g., ITEM.DIRT = item
				break;
			}
		}
		// If no match found, use the generated name
		if (!ITEM[itemPropertyName]) {
			ITEM[itemPropertyName] = item;
		}
		
		// Register in registry
		ITEM_REGISTRY.register(item);
	}
}

// Helper function to get block name from BLOCK property name
function getBlockName(block) {
	for (var prop in BLOCK) {
		if (BLOCK.hasOwnProperty(prop) && BLOCK[prop] === block) {
			return prop.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, function(l) { return l.toUpperCase(); });
		}
	}
	return "Block " + block.id;
}

// Initialize block items when BLOCK is available
if (typeof window !== 'undefined') {
	// Wait for BLOCK to be loaded
	if (typeof BLOCK !== 'undefined') {
		registerBlockItems();
	} else {
		// Try to register when BLOCK becomes available
		var checkBlockInterval = setInterval(function() {
			if (typeof BLOCK !== 'undefined') {
				registerBlockItems();
				clearInterval(checkBlockInterval);
			}
		}, 100);
	}
}

// ==========================================
// Item Definitions
// ==========================================
// 
// Para agregar un item nuevo, usa el objeto global ITEM (similar a BLOCK):
//
// Ejemplo 1: Item de bloque (se registra automáticamente desde BLOCK)
// Los bloques se registran automáticamente en registerBlockItems()
//
// Ejemplo 2: Item de herramienta
// ITEM.WOODEN_SWORD = new Item(
//     100,                    // id único (no debe coincidir con IDs de bloques)
//     "Wooden Sword",         // nombre
//     ITEM_TYPE.TOOL,         // tipo
//     {
//         damage: 4,          // daño
//         durability: 60,      // durabilidad
//         maxStack: 1         // herramientas no se stackean
//     }
// );
// ITEM_REGISTRY.register(ITEM.WOODEN_SWORD);
//
// Ejemplo 3: Item consumible
// ITEM.APPLE = new Item(
//     200,                    // id único
//     "Apple",                // nombre
//     ITEM_TYPE.CONSUMABLE,   // tipo
//     {
//         hungerRestore: 4,   // restaura hambre
//         maxStack: 64        // se puede stackear
//     }
// );
// ITEM_REGISTRY.register(ITEM.APPLE);
//
// IMPORTANTE: Después de crear un item, debes registrarlo con:
// ITEM_REGISTRY.register(ITEM.NOMBRE_DEL_ITEM);
// ==========================================

// Add Dirt item to ITEM global object (this is an example of item, DO NOT TRY TO ADD BLOCKS HERE)
/* ITEM.DIRT = new Item(2, "Dirt", ITEM_TYPE.BLOCK, {
	id: 2,
	block: BLOCK.DIRT,
	blockId: 2,
	maxStack: 64,
	icon: null
}); */
// ITEM_REGISTRY.register(ITEM.DIRT);

// Export for Node.js
if (typeof exports !== 'undefined') {
	exports.Item = Item;
	exports.ItemStack = ItemStack;
	exports.ItemRegistry = ItemRegistry;
	exports.ITEM_REGISTRY = ITEM_REGISTRY;
	exports.ITEM_TYPE = ITEM_TYPE;
	exports.ITEM = ITEM;
	exports.registerBlockItems = registerBlockItems;
}


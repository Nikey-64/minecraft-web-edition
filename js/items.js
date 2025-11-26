// ==========================================
// Item System
//
// This file contains the item management system for the game.
// Items can be blocks, tools, consumables, etc.
// ==========================================

// Item Types
var ITEM_TYPE = {};
ITEM_TYPE.BLOCK = 1;
ITEM_TYPE.TOOL = 2;
ITEM_TYPE.CONSUMABLE = 3;
ITEM_TYPE.OTHER = 4;

// Item Class
// Represents a single item type with its properties
function Item(id, name, type, data) {
	this.id = id;
	this.name = name || "Unknown Item";
	this.type = type || ITEM_TYPE.OTHER;
	this.data = data || {}; // Additional data (block reference, tool properties, etc.)
	this.maxStack = data.maxStack || 64; // Maximum stack size
	this.icon = data.icon || null; // Icon texture/thumbnail
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
	if (!this.item) return false;
	var toAdd = Math.min(count, this.item.maxStack - this.count);
	this.count += toAdd;
	return toAdd;
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
// Manages all available items in the game
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
	if (item.type === ITEM_TYPE.BLOCK && item.data.block) {
		// Check for conflicts in itemsByBlock too
		if (this.itemsByBlock[item.data.block.id]) {
			console.warn("Block with id " + item.data.block.id + " already registered as item!");
			console.warn("  Existing item: " + this.itemsByBlock[item.data.block.id].name);
			console.warn("  New item: " + item.name);
		}
		this.itemsByBlock[item.data.block.id] = item;
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

// Create global ItemRegistry instance
var ITEM_REGISTRY = new ItemRegistry();

// Register all blocks as items
function registerBlockItems() {
	if (typeof BLOCK === 'undefined') {
		console.warn("BLOCK is not defined, cannot register block items.");
		return;
	}
	
	// First, check for duplicate block IDs
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
	for (var i = 0; i < blockIds.length; i++) {
		var block = blockIds[i];
		var item = new Item(
			block.id, // Use block id as item id
			block.name || getBlockName(block),
			ITEM_TYPE.BLOCK,
			{
				block: block,
				maxStack: 64,
				icon: null // Will be generated from block texture
			}
		);
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

// Export for Node.js
if (typeof exports !== 'undefined') {
	exports.Item = Item;
	exports.ItemStack = ItemStack;
	exports.ItemRegistry = ItemRegistry;
	exports.ITEM_REGISTRY = ITEM_REGISTRY;
	exports.ITEM_TYPE = ITEM_TYPE;
	exports.registerBlockItems = registerBlockItems;
}


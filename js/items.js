// ==========================================
// Item System
//
// This file contains the item management system for the game.
// Items can be blocks, tools, consumables, etc.
// ==========================================

// Ensure ITEM is global (similar to BLOCK)
if (typeof ITEM === 'undefined') {
	var ITEM = {};
}

// Make ITEM available on window object for browser context
if (typeof window !== 'undefined') {
	window.ITEM = ITEM;
}

// Item Types
var ITEM_TYPE = {
	BLOCK: 1,
	TOOL: 2,
	CONSUMABLE: 3,
	OTHER: 4
};

// Tool Types (for mining speed calculations)
var TOOL_TYPE = {
	NONE: 0,
	PICKAXE: 1,
	AXE: 2,
	SHOVEL: 3,
	SWORD: 4,
	HOE: 5
};

// Tool Materials (affects speed and durability)
var TOOL_MATERIAL = {
	WOOD: { name: "Wood", miningSpeed: 2, durability: 59, damage: 0 },
	STONE: { name: "Stone", miningSpeed: 4, durability: 131, damage: 1 },
	IRON: { name: "Iron", miningSpeed: 6, durability: 250, damage: 2 },
	GOLD: { name: "Gold", miningSpeed: 12, durability: 32, damage: 0 },
	DIAMOND: { name: "Diamond", miningSpeed: 8, durability: 1561, damage: 3 }
};

// Item Class
// Represents a single item type with its properties
function Item(id, name, type, data, blockId) {
	this.id = id;
	this.name = name || "Unknown Item";
	this.type = type || ITEM_TYPE.OTHER;
	this.data = data || {};
	this.maxStack = (data && data.maxStack) ? data.maxStack : 64;
	this.icon = (data && data.icon) ? data.icon : null;
	
	// Tool properties
	this.toolType = (data && data.toolType) ? data.toolType : TOOL_TYPE.NONE;
	this.toolMaterial = (data && data.toolMaterial) ? data.toolMaterial : null;
	this.durability = (data && data.durability) ? data.durability : 0;
	this.miningSpeed = (data && data.miningSpeed) ? data.miningSpeed : 1;
	this.attackDamage = (data && data.attackDamage) ? data.attackDamage : 1;
	
	// Texture coordinates for rendering (u1, v1, u2, v2) from items.png
	this.textureCoords = (data && data.textureCoords) ? data.textureCoords : null;
	
	// Block ID property
	if (type === ITEM_TYPE.BLOCK) {
		if (blockId !== undefined && blockId !== null) {
			this.blockId = blockId;
		} else if (data && data.blockId !== undefined && data.blockId !== null) {
			this.blockId = data.blockId;
		} else if (data && data.block && data.block.id !== undefined) {
			this.blockId = data.block.id;
		} else {
			this.blockId = null;
		}
	} else {
		this.blockId = null;
	}
}

// Get texture coordinates for this item (for rendering in inventory/hotbar)
Item.prototype.getTextureCoords = function() {
	// If item has explicit texture coords, use them
	if (this.textureCoords) {
		return this.textureCoords;
	}
	
	// If it's a block item, get texture from block
	if (this.type === ITEM_TYPE.BLOCK && this.data && this.data.block) {
		var block = this.data.block;
		if (block.texture) {
			// Get the texture for the front face as the icon
			var tex = block.texture(null, null, true, 0, 0, 0, DIRECTION.FORWARD);
			return tex;
		}
	}
	
	// Default texture (question mark or similar)
	return [0, 0, 1/16, 1/16];
};

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
	return toAdd;
};

ItemStack.prototype.remove = function(count) {
	if (!this.item) return 0;
	var toRemove = Math.min(count, this.count);
	this.count -= toRemove;
	if (this.count <= 0) {
		this.item = null;
		this.count = 0;
	}
	return toRemove;
};

ItemStack.prototype.clone = function() {
	return new ItemStack(this.item, this.count);
};

ItemStack.prototype.serialize = function() {
	if (!this.item) return null;
	return {
		itemId: this.item.id,
		count: this.count
	};
};

// ItemRegistry Class
// Manages all available items in the game
function ItemRegistry() {
	this.items = {};
	this.itemsByBlock = {};
	this.nextId = 1000; // Start non-block items at 1000 to avoid conflicts
}

ItemRegistry.prototype.register = function(item) {
	if (!item || item.id === undefined) {
		console.warn("Cannot register item without id");
		return null;
	}
	
	if (this.items[item.id]) {
		// Item already exists, return existing
		return this.items[item.id];
	}
	
	this.items[item.id] = item;
	
	// If item is a block, register in itemsByBlock
	if (item.type === ITEM_TYPE.BLOCK) {
		var blockId = item.blockId;
		if (!blockId && item.data && item.data.block) {
			blockId = item.data.block.id;
		}
		
		if (blockId !== undefined && blockId !== null) {
			if (!this.itemsByBlock[blockId]) {
				this.itemsByBlock[blockId] = item;
			}
		}
	}
	
	return item;
};

ItemRegistry.prototype.get = function(id) {
	return this.items[id] || null;
};

ItemRegistry.prototype.getById = function(id) {
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

ItemRegistry.prototype.getNextId = function() {
	return this.nextId++;
};

// Create global ItemRegistry instance
var ITEM_REGISTRY = new ItemRegistry();

// Make it available globally
if (typeof window !== 'undefined') {
	window.ITEM_REGISTRY = ITEM_REGISTRY;
	window.Item = Item;
	window.ItemStack = ItemStack;
	window.ItemRegistry = ItemRegistry;
	window.ITEM_TYPE = ITEM_TYPE;
	window.TOOL_TYPE = TOOL_TYPE;
	window.TOOL_MATERIAL = TOOL_MATERIAL;
}

// Register all blocks as items
function registerBlockItems() {
	if (typeof BLOCK === 'undefined') {
		console.warn("BLOCK is not defined, cannot register block items.");
		return;
	}
	
	// Get all spawnable blocks
	var blocks = [];
	for (var prop in BLOCK) {
		if (BLOCK.hasOwnProperty(prop) && BLOCK[prop] && typeof BLOCK[prop] === 'object' && BLOCK[prop].id !== undefined) {
			var block = BLOCK[prop];
			if (block.spawnable && block.id !== 0) {
				blocks.push({ name: prop, block: block });
			}
		}
	}
	
	// Sort by id for consistent ordering
	blocks.sort(function(a, b) { return a.block.id - b.block.id; });
	
	// Register each block as an item
	for (var i = 0; i < blocks.length; i++) {
		var entry = blocks[i];
		var block = entry.block;
		var propName = entry.name;
		
		var item = new Item(
			block.id,
			propName.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, function(l) { return l.toUpperCase(); }),
			ITEM_TYPE.BLOCK,
			{
				block: block,
				blockId: block.id,
				maxStack: 64
			},
			block.id
		);
		
		// Store in ITEM global object
		ITEM[propName] = item;
		
		// Register in registry
		ITEM_REGISTRY.register(item);
	}
	
	console.log("Registered " + blocks.length + " block items");
}

// ==========================================
// Tool Items
// ==========================================

// Helper to create a tool item
function createToolItem(id, name, toolType, material, textureCoords) {
	var item = new Item(id, name, ITEM_TYPE.TOOL, {
		toolType: toolType,
		toolMaterial: material,
		durability: material.durability,
		miningSpeed: material.miningSpeed,
		attackDamage: material.damage + getBaseToolDamage(toolType),
		maxStack: 1,
		textureCoords: textureCoords
	});
	return item;
}

// Get base damage for tool type
function getBaseToolDamage(toolType) {
	switch (toolType) {
		case TOOL_TYPE.SWORD: return 4;
		case TOOL_TYPE.AXE: return 3;
		case TOOL_TYPE.PICKAXE: return 2;
		case TOOL_TYPE.SHOVEL: return 1;
		case TOOL_TYPE.HOE: return 1;
		default: return 1;
	}
}

// Register tool items
function registerToolItems() {
	// Stick (crafting ingredient)
	ITEM.STICK = new Item(ITEM_REGISTRY.getNextId(), "Stick", ITEM_TYPE.OTHER, {
		maxStack: 64,
		textureCoords: [5/16, 3/16, 6/16, 4/16] // Position in items.png
	});
	ITEM_REGISTRY.register(ITEM.STICK);
	
	// Wooden Tools (texture coords from items.png, row 0)
	ITEM.WOODEN_PICKAXE = createToolItem(ITEM_REGISTRY.getNextId(), "Wooden Pickaxe", TOOL_TYPE.PICKAXE, TOOL_MATERIAL.WOOD, [0/16, 6/16, 1/16, 7/16]);
	ITEM_REGISTRY.register(ITEM.WOODEN_PICKAXE);
	
	ITEM.WOODEN_AXE = createToolItem(ITEM_REGISTRY.getNextId(), "Wooden Axe", TOOL_TYPE.AXE, TOOL_MATERIAL.WOOD, [0/16, 7/16, 1/16, 8/16]);
	ITEM_REGISTRY.register(ITEM.WOODEN_AXE);
	
	ITEM.WOODEN_SHOVEL = createToolItem(ITEM_REGISTRY.getNextId(), "Wooden Shovel", TOOL_TYPE.SHOVEL, TOOL_MATERIAL.WOOD, [0/16, 5/16, 1/16, 6/16]);
	ITEM_REGISTRY.register(ITEM.WOODEN_SHOVEL);
	
	ITEM.WOODEN_SWORD = createToolItem(ITEM_REGISTRY.getNextId(), "Wooden Sword", TOOL_TYPE.SWORD, TOOL_MATERIAL.WOOD, [0/16, 4/16, 1/16, 5/16]);
	ITEM_REGISTRY.register(ITEM.WOODEN_SWORD);
	
	ITEM.WOODEN_HOE = createToolItem(ITEM_REGISTRY.getNextId(), "Wooden Hoe", TOOL_TYPE.HOE, TOOL_MATERIAL.WOOD, [0/16, 8/16, 1/16, 9/16]);
	ITEM_REGISTRY.register(ITEM.WOODEN_HOE);
	
	// Stone Tools (row 1)
	ITEM.STONE_PICKAXE = createToolItem(ITEM_REGISTRY.getNextId(), "Stone Pickaxe", TOOL_TYPE.PICKAXE, TOOL_MATERIAL.STONE, [1/16, 6/16, 2/16, 7/16]);
	ITEM_REGISTRY.register(ITEM.STONE_PICKAXE);
	
	ITEM.STONE_AXE = createToolItem(ITEM_REGISTRY.getNextId(), "Stone Axe", TOOL_TYPE.AXE, TOOL_MATERIAL.STONE, [1/16, 7/16, 2/16, 8/16]);
	ITEM_REGISTRY.register(ITEM.STONE_AXE);
	
	ITEM.STONE_SHOVEL = createToolItem(ITEM_REGISTRY.getNextId(), "Stone Shovel", TOOL_TYPE.SHOVEL, TOOL_MATERIAL.STONE, [1/16, 5/16, 2/16, 6/16]);
	ITEM_REGISTRY.register(ITEM.STONE_SHOVEL);
	
	ITEM.STONE_SWORD = createToolItem(ITEM_REGISTRY.getNextId(), "Stone Sword", TOOL_TYPE.SWORD, TOOL_MATERIAL.STONE, [1/16, 4/16, 2/16, 5/16]);
	ITEM_REGISTRY.register(ITEM.STONE_SWORD);
	
	ITEM.STONE_HOE = createToolItem(ITEM_REGISTRY.getNextId(), "Stone Hoe", TOOL_TYPE.HOE, TOOL_MATERIAL.STONE, [1/16, 8/16, 2/16, 9/16]);
	ITEM_REGISTRY.register(ITEM.STONE_HOE);
	
	// Iron Tools (row 2)
	ITEM.IRON_PICKAXE = createToolItem(ITEM_REGISTRY.getNextId(), "Iron Pickaxe", TOOL_TYPE.PICKAXE, TOOL_MATERIAL.IRON, [2/16, 6/16, 3/16, 7/16]);
	ITEM_REGISTRY.register(ITEM.IRON_PICKAXE);
	
	ITEM.IRON_AXE = createToolItem(ITEM_REGISTRY.getNextId(), "Iron Axe", TOOL_TYPE.AXE, TOOL_MATERIAL.IRON, [2/16, 7/16, 3/16, 8/16]);
	ITEM_REGISTRY.register(ITEM.IRON_AXE);
	
	ITEM.IRON_SHOVEL = createToolItem(ITEM_REGISTRY.getNextId(), "Iron Shovel", TOOL_TYPE.SHOVEL, TOOL_MATERIAL.IRON, [2/16, 5/16, 3/16, 6/16]);
	ITEM_REGISTRY.register(ITEM.IRON_SHOVEL);
	
	ITEM.IRON_SWORD = createToolItem(ITEM_REGISTRY.getNextId(), "Iron Sword", TOOL_TYPE.SWORD, TOOL_MATERIAL.IRON, [2/16, 4/16, 3/16, 5/16]);
	ITEM_REGISTRY.register(ITEM.IRON_SWORD);
	
	ITEM.IRON_HOE = createToolItem(ITEM_REGISTRY.getNextId(), "Iron Hoe", TOOL_TYPE.HOE, TOOL_MATERIAL.IRON, [2/16, 8/16, 3/16, 9/16]);
	ITEM_REGISTRY.register(ITEM.IRON_HOE);
	
	// Diamond Tools (row 3)
	ITEM.DIAMOND_PICKAXE = createToolItem(ITEM_REGISTRY.getNextId(), "Diamond Pickaxe", TOOL_TYPE.PICKAXE, TOOL_MATERIAL.DIAMOND, [3/16, 6/16, 4/16, 7/16]);
	ITEM_REGISTRY.register(ITEM.DIAMOND_PICKAXE);
	
	ITEM.DIAMOND_AXE = createToolItem(ITEM_REGISTRY.getNextId(), "Diamond Axe", TOOL_TYPE.AXE, TOOL_MATERIAL.DIAMOND, [3/16, 7/16, 4/16, 8/16]);
	ITEM_REGISTRY.register(ITEM.DIAMOND_AXE);
	
	ITEM.DIAMOND_SHOVEL = createToolItem(ITEM_REGISTRY.getNextId(), "Diamond Shovel", TOOL_TYPE.SHOVEL, TOOL_MATERIAL.DIAMOND, [3/16, 5/16, 4/16, 6/16]);
	ITEM_REGISTRY.register(ITEM.DIAMOND_SHOVEL);
	
	ITEM.DIAMOND_SWORD = createToolItem(ITEM_REGISTRY.getNextId(), "Diamond Sword", TOOL_TYPE.SWORD, TOOL_MATERIAL.DIAMOND, [3/16, 4/16, 4/16, 5/16]);
	ITEM_REGISTRY.register(ITEM.DIAMOND_SWORD);
	
	ITEM.DIAMOND_HOE = createToolItem(ITEM_REGISTRY.getNextId(), "Diamond Hoe", TOOL_TYPE.HOE, TOOL_MATERIAL.DIAMOND, [3/16, 8/16, 4/16, 9/16]);
	ITEM_REGISTRY.register(ITEM.DIAMOND_HOE);
	
	// Gold Tools (row 4)
	ITEM.GOLD_PICKAXE = createToolItem(ITEM_REGISTRY.getNextId(), "Gold Pickaxe", TOOL_TYPE.PICKAXE, TOOL_MATERIAL.GOLD, [4/16, 6/16, 5/16, 7/16]);
	ITEM_REGISTRY.register(ITEM.GOLD_PICKAXE);
	
	ITEM.GOLD_AXE = createToolItem(ITEM_REGISTRY.getNextId(), "Gold Axe", TOOL_TYPE.AXE, TOOL_MATERIAL.GOLD, [4/16, 7/16, 5/16, 8/16]);
	ITEM_REGISTRY.register(ITEM.GOLD_AXE);
	
	ITEM.GOLD_SHOVEL = createToolItem(ITEM_REGISTRY.getNextId(), "Gold Shovel", TOOL_TYPE.SHOVEL, TOOL_MATERIAL.GOLD, [4/16, 5/16, 5/16, 6/16]);
	ITEM_REGISTRY.register(ITEM.GOLD_SHOVEL);
	
	ITEM.GOLD_SWORD = createToolItem(ITEM_REGISTRY.getNextId(), "Gold Sword", TOOL_TYPE.SWORD, TOOL_MATERIAL.GOLD, [4/16, 4/16, 5/16, 5/16]);
	ITEM_REGISTRY.register(ITEM.GOLD_SWORD);
	
	ITEM.GOLD_HOE = createToolItem(ITEM_REGISTRY.getNextId(), "Gold Hoe", TOOL_TYPE.HOE, TOOL_MATERIAL.GOLD, [4/16, 8/16, 5/16, 9/16]);
	ITEM_REGISTRY.register(ITEM.GOLD_HOE);
	
	console.log("Registered tool items");
}

// ==========================================
// Consumable Items
// ==========================================

function registerConsumableItems() {
	// Apple
	ITEM.APPLE = new Item(ITEM_REGISTRY.getNextId(), "Apple", ITEM_TYPE.CONSUMABLE, {
		hungerRestore: 4,
		maxStack: 64,
		textureCoords: [10/16, 0/16, 11/16, 1/16]
	});
	ITEM_REGISTRY.register(ITEM.APPLE);
	
	// Bread
	ITEM.BREAD = new Item(ITEM_REGISTRY.getNextId(), "Bread", ITEM_TYPE.CONSUMABLE, {
		hungerRestore: 5,
		maxStack: 64,
		textureCoords: [9/16, 2/16, 10/16, 3/16]
	});
	ITEM_REGISTRY.register(ITEM.BREAD);
	
	// Cooked Porkchop
	ITEM.COOKED_PORKCHOP = new Item(ITEM_REGISTRY.getNextId(), "Cooked Porkchop", ITEM_TYPE.CONSUMABLE, {
		hungerRestore: 8,
		maxStack: 64,
		textureCoords: [7/16, 5/16, 8/16, 6/16]
	});
	ITEM_REGISTRY.register(ITEM.COOKED_PORKCHOP);
	
	// Golden Apple
	ITEM.GOLDEN_APPLE = new Item(ITEM_REGISTRY.getNextId(), "Golden Apple", ITEM_TYPE.CONSUMABLE, {
		hungerRestore: 4,
		healthRestore: 4,
		maxStack: 64,
		textureCoords: [11/16, 0/16, 12/16, 1/16]
	});
	ITEM_REGISTRY.register(ITEM.GOLDEN_APPLE);
	
	console.log("Registered consumable items");
}

// ==========================================
// Other Items
// ==========================================

function registerOtherItems() {
	// Coal
	ITEM.COAL = new Item(ITEM_REGISTRY.getNextId(), "Coal", ITEM_TYPE.OTHER, {
		maxStack: 64,
		textureCoords: [7/16, 0/16, 8/16, 1/16]
	});
	ITEM_REGISTRY.register(ITEM.COAL);
	
	// Iron Ingot
	ITEM.IRON_INGOT = new Item(ITEM_REGISTRY.getNextId(), "Iron Ingot", ITEM_TYPE.OTHER, {
		maxStack: 64,
		textureCoords: [7/16, 1/16, 8/16, 2/16]
	});
	ITEM_REGISTRY.register(ITEM.IRON_INGOT);
	
	// Gold Ingot
	ITEM.GOLD_INGOT = new Item(ITEM_REGISTRY.getNextId(), "Gold Ingot", ITEM_TYPE.OTHER, {
		maxStack: 64,
		textureCoords: [7/16, 2/16, 8/16, 3/16]
	});
	ITEM_REGISTRY.register(ITEM.GOLD_INGOT);
	
	// Diamond
	ITEM.DIAMOND = new Item(ITEM_REGISTRY.getNextId(), "Diamond", ITEM_TYPE.OTHER, {
		maxStack: 64,
		textureCoords: [7/16, 3/16, 8/16, 4/16]
	});
	ITEM_REGISTRY.register(ITEM.DIAMOND);
	
	console.log("Registered other items");
}

// Initialize all items when DOM is ready
function initializeItems() {
	if (typeof BLOCK !== 'undefined') {
		registerBlockItems();
		registerToolItems();
		registerConsumableItems();
		registerOtherItems();
		console.log("Item system initialized. Total items:", Object.keys(ITEM_REGISTRY.items).length);
	} else {
		console.warn("BLOCK not defined, retrying in 100ms...");
		setTimeout(initializeItems, 100);
	}
}

// Auto-initialize
if (typeof window !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initializeItems);
	} else {
		initializeItems();
	}
}

// Export for Node.js
if (typeof exports !== 'undefined') {
	exports.Item = Item;
	exports.ItemStack = ItemStack;
	exports.ItemRegistry = ItemRegistry;
	exports.ITEM_REGISTRY = ITEM_REGISTRY;
	exports.ITEM_TYPE = ITEM_TYPE;
	exports.TOOL_TYPE = TOOL_TYPE;
	exports.TOOL_MATERIAL = TOOL_MATERIAL;
	exports.ITEM = ITEM;
}

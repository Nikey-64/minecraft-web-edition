// ==========================================
// Crafting System
//
// This file contains the crafting system for the game.
// Recipes define how items can be crafted from ingredients.
// ==========================================

// Recipe types
var RECIPE_TYPE = {
	SHAPED: 1,    // Requires specific pattern (e.g., pickaxe)
	SHAPELESS: 2  // Any arrangement works (e.g., dye + wool)
};

// CraftingRecipe Class
// Defines a single crafting recipe
function CraftingRecipe(type, ingredients, result, resultCount) {
	this.type = type || RECIPE_TYPE.SHAPED;
	this.ingredients = ingredients || []; // 2D array for shaped, 1D for shapeless
	this.result = result || null; // Item or Item ID
	this.resultCount = resultCount || 1;
}

// Check if this recipe matches the given crafting grid
CraftingRecipe.prototype.matches = function(grid) {
	if (this.type === RECIPE_TYPE.SHAPED) {
		return this.matchesShaped(grid);
	} else {
		return this.matchesShapeless(grid);
	}
};

// Match shaped recipe (pattern must match exactly, but can be offset)
CraftingRecipe.prototype.matchesShaped = function(grid) {
	var pattern = this.ingredients;
	var patternHeight = pattern.length;
	var patternWidth = pattern[0] ? pattern[0].length : 0;
	
	var gridHeight = grid.length;
	var gridWidth = grid[0] ? grid[0].length : 0;
	
	// Try all possible offsets
	for (var offsetY = 0; offsetY <= gridHeight - patternHeight; offsetY++) {
		for (var offsetX = 0; offsetX <= gridWidth - patternWidth; offsetX++) {
			if (this.matchesAtOffset(grid, offsetX, offsetY)) {
				return true;
			}
		}
	}
	
	return false;
};

// Check if pattern matches at a specific offset
CraftingRecipe.prototype.matchesAtOffset = function(grid, offsetX, offsetY) {
	var pattern = this.ingredients;
	var patternHeight = pattern.length;
	var patternWidth = pattern[0] ? pattern[0].length : 0;
	
	var gridHeight = grid.length;
	var gridWidth = grid[0] ? grid[0].length : 0;
	
	// Check all grid cells
	for (var y = 0; y < gridHeight; y++) {
		for (var x = 0; x < gridWidth; x++) {
			var gridItem = grid[y][x];
			var gridItemId = gridItem ? (gridItem.item ? gridItem.item.id : gridItem.id || gridItem) : null;
			
			// Check if this cell is within the pattern area
			var patternX = x - offsetX;
			var patternY = y - offsetY;
			
			if (patternX >= 0 && patternX < patternWidth && patternY >= 0 && patternY < patternHeight) {
				// Cell is within pattern - must match
				var patternItem = pattern[patternY][patternX];
				var patternItemId = patternItem ? (patternItem.id || patternItem) : null;
				
				if (patternItemId !== gridItemId) {
					return false;
				}
			} else {
				// Cell is outside pattern - must be empty
				if (gridItemId !== null) {
					return false;
				}
			}
		}
	}
	
	return true;
};

// Match shapeless recipe (any arrangement)
CraftingRecipe.prototype.matchesShapeless = function(grid) {
	var required = [];
	
	// Collect all required ingredients
	for (var i = 0; i < this.ingredients.length; i++) {
		var ing = this.ingredients[i];
		required.push(ing ? (ing.id || ing) : null);
	}
	
	// Collect all items in grid
	var gridItems = [];
	for (var y = 0; y < grid.length; y++) {
		for (var x = 0; x < grid[y].length; x++) {
			var gridItem = grid[y][x];
			if (gridItem) {
				var itemId = gridItem.item ? gridItem.item.id : (gridItem.id || gridItem);
				gridItems.push(itemId);
			}
		}
	}
	
	// Check if counts match
	if (gridItems.length !== required.filter(function(r) { return r !== null; }).length) {
		return false;
	}
	
	// Check if all required items are present
	var usedGrid = [];
	for (var i = 0; i < required.length; i++) {
		if (required[i] === null) continue;
		
		var found = false;
		for (var j = 0; j < gridItems.length; j++) {
			if (usedGrid.indexOf(j) === -1 && gridItems[j] === required[i]) {
				usedGrid.push(j);
				found = true;
				break;
			}
		}
		
		if (!found) return false;
	}
	
	return true;
};

// CraftingManager Class
// Manages all crafting recipes
function CraftingManager() {
	this.recipes = [];
}

// Register a new recipe
CraftingManager.prototype.register = function(recipe) {
	this.recipes.push(recipe);
	return recipe;
};

// Find a matching recipe for the given grid
CraftingManager.prototype.findRecipe = function(grid) {
	for (var i = 0; i < this.recipes.length; i++) {
		if (this.recipes[i].matches(grid)) {
			return this.recipes[i];
		}
	}
	return null;
};

// Get crafting result for the given grid
CraftingManager.prototype.getResult = function(grid) {
	var recipe = this.findRecipe(grid);
	if (recipe) {
		var resultItem = recipe.result;
		if (typeof resultItem === 'number') {
			resultItem = ITEM_REGISTRY.get(resultItem);
		}
		if (resultItem) {
			return new ItemStack(resultItem, recipe.resultCount);
		}
	}
	return null;
};

// Craft item (consumes ingredients and returns result)
CraftingManager.prototype.craft = function(grid) {
	var recipe = this.findRecipe(grid);
	if (!recipe) return null;
	
	// Consume ingredients
	for (var y = 0; y < grid.length; y++) {
		for (var x = 0; x < grid[y].length; x++) {
			if (grid[y][x] && grid[y][x].count) {
				grid[y][x].count--;
				if (grid[y][x].count <= 0) {
					grid[y][x] = null;
				}
			} else if (grid[y][x]) {
				grid[y][x] = null;
			}
		}
	}
	
	// Return result
	var resultItem = recipe.result;
	if (typeof resultItem === 'number') {
		resultItem = ITEM_REGISTRY.get(resultItem);
	}
	if (resultItem) {
		return new ItemStack(resultItem, recipe.resultCount);
	}
	return null;
};

// Create global CraftingManager instance
var CRAFTING = new CraftingManager();

// Make it available globally
if (typeof window !== 'undefined') {
	window.CRAFTING = CRAFTING;
	window.CraftingRecipe = CraftingRecipe;
	window.CraftingManager = CraftingManager;
	window.RECIPE_TYPE = RECIPE_TYPE;
}

// ==========================================
// Recipe Definitions
// ==========================================

// Helper to create shaped recipe
function shapedRecipe(pattern, result, count) {
	return new CraftingRecipe(RECIPE_TYPE.SHAPED, pattern, result, count || 1);
}

// Helper to create shapeless recipe
function shapelessRecipe(ingredients, result, count) {
	return new CraftingRecipe(RECIPE_TYPE.SHAPELESS, ingredients, result, count || 1);
}

// Register all recipes
function registerRecipes() {
	if (typeof ITEM === 'undefined' || typeof BLOCK === 'undefined') {
		console.warn("ITEM or BLOCK not defined, retrying recipe registration in 100ms...");
		setTimeout(registerRecipes, 100);
		return;
	}
	
	// Wait for items to be registered
	if (!ITEM.STICK || !ITEM.WOODEN_PICKAXE) {
		console.warn("Items not yet registered, retrying recipe registration in 100ms...");
		setTimeout(registerRecipes, 100);
		return;
	}
	
	// ==========================================
	// Basic Recipes
	// ==========================================
	
	// Planks from Wood (1 wood = 4 planks)
	if (ITEM.WOOD && ITEM.PLANK) {
		CRAFTING.register(shapelessRecipe(
			[ITEM.WOOD],
			ITEM.PLANK,
			4
		));
	}
	
	// Sticks from Planks (2 planks = 4 sticks)
	if (ITEM.PLANK && ITEM.STICK) {
		CRAFTING.register(shapedRecipe(
			[
				[ITEM.PLANK],
				[ITEM.PLANK]
			],
			ITEM.STICK,
			4
		));
	}
	
	// Crafting Table from Planks
	if (ITEM.PLANK && ITEM.CRAFTING_TABLE) {
		CRAFTING.register(shapedRecipe(
			[
				[ITEM.PLANK, ITEM.PLANK],
				[ITEM.PLANK, ITEM.PLANK]
			],
			ITEM.CRAFTING_TABLE,
			1
		));
	}
	
	// ==========================================
	// Wooden Tools
	// ==========================================
	
	if (ITEM.PLANK && ITEM.STICK) {
		// Wooden Pickaxe
		if (ITEM.WOODEN_PICKAXE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.PLANK, ITEM.PLANK, ITEM.PLANK],
					[null, ITEM.STICK, null],
					[null, ITEM.STICK, null]
				],
				ITEM.WOODEN_PICKAXE,
				1
			));
		}
		
		// Wooden Axe
		if (ITEM.WOODEN_AXE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.PLANK, ITEM.PLANK],
					[ITEM.PLANK, ITEM.STICK],
					[null, ITEM.STICK]
				],
				ITEM.WOODEN_AXE,
				1
			));
		}
		
		// Wooden Shovel
		if (ITEM.WOODEN_SHOVEL) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.PLANK],
					[ITEM.STICK],
					[ITEM.STICK]
				],
				ITEM.WOODEN_SHOVEL,
				1
			));
		}
		
		// Wooden Sword
		if (ITEM.WOODEN_SWORD) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.PLANK],
					[ITEM.PLANK],
					[ITEM.STICK]
				],
				ITEM.WOODEN_SWORD,
				1
			));
		}
		
		// Wooden Hoe
		if (ITEM.WOODEN_HOE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.PLANK, ITEM.PLANK],
					[null, ITEM.STICK],
					[null, ITEM.STICK]
				],
				ITEM.WOODEN_HOE,
				1
			));
		}
	}
	
	// ==========================================
	// Stone Tools
	// ==========================================
	
	if (ITEM.COBBLESTONE && ITEM.STICK) {
		// Stone Pickaxe
		if (ITEM.STONE_PICKAXE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.COBBLESTONE, ITEM.COBBLESTONE, ITEM.COBBLESTONE],
					[null, ITEM.STICK, null],
					[null, ITEM.STICK, null]
				],
				ITEM.STONE_PICKAXE,
				1
			));
		}
		
		// Stone Axe
		if (ITEM.STONE_AXE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.COBBLESTONE, ITEM.COBBLESTONE],
					[ITEM.COBBLESTONE, ITEM.STICK],
					[null, ITEM.STICK]
				],
				ITEM.STONE_AXE,
				1
			));
		}
		
		// Stone Shovel
		if (ITEM.STONE_SHOVEL) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.COBBLESTONE],
					[ITEM.STICK],
					[ITEM.STICK]
				],
				ITEM.STONE_SHOVEL,
				1
			));
		}
		
		// Stone Sword
		if (ITEM.STONE_SWORD) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.COBBLESTONE],
					[ITEM.COBBLESTONE],
					[ITEM.STICK]
				],
				ITEM.STONE_SWORD,
				1
			));
		}
		
		// Stone Hoe
		if (ITEM.STONE_HOE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.COBBLESTONE, ITEM.COBBLESTONE],
					[null, ITEM.STICK],
					[null, ITEM.STICK]
				],
				ITEM.STONE_HOE,
				1
			));
		}
	}
	
	// ==========================================
	// Iron Tools (requires iron ingots)
	// ==========================================
	
	if (ITEM.IRON_INGOT && ITEM.STICK) {
		// Iron Pickaxe
		if (ITEM.IRON_PICKAXE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.IRON_INGOT, ITEM.IRON_INGOT, ITEM.IRON_INGOT],
					[null, ITEM.STICK, null],
					[null, ITEM.STICK, null]
				],
				ITEM.IRON_PICKAXE,
				1
			));
		}
		
		// Iron Axe
		if (ITEM.IRON_AXE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.IRON_INGOT, ITEM.IRON_INGOT],
					[ITEM.IRON_INGOT, ITEM.STICK],
					[null, ITEM.STICK]
				],
				ITEM.IRON_AXE,
				1
			));
		}
		
		// Iron Shovel
		if (ITEM.IRON_SHOVEL) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.IRON_INGOT],
					[ITEM.STICK],
					[ITEM.STICK]
				],
				ITEM.IRON_SHOVEL,
				1
			));
		}
		
		// Iron Sword
		if (ITEM.IRON_SWORD) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.IRON_INGOT],
					[ITEM.IRON_INGOT],
					[ITEM.STICK]
				],
				ITEM.IRON_SWORD,
				1
			));
		}
		
		// Iron Hoe
		if (ITEM.IRON_HOE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.IRON_INGOT, ITEM.IRON_INGOT],
					[null, ITEM.STICK],
					[null, ITEM.STICK]
				],
				ITEM.IRON_HOE,
				1
			));
		}
	}
	
	// ==========================================
	// Diamond Tools
	// ==========================================
	
	if (ITEM.DIAMOND && ITEM.STICK) {
		// Diamond Pickaxe
		if (ITEM.DIAMOND_PICKAXE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.DIAMOND, ITEM.DIAMOND, ITEM.DIAMOND],
					[null, ITEM.STICK, null],
					[null, ITEM.STICK, null]
				],
				ITEM.DIAMOND_PICKAXE,
				1
			));
		}
		
		// Diamond Axe
		if (ITEM.DIAMOND_AXE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.DIAMOND, ITEM.DIAMOND],
					[ITEM.DIAMOND, ITEM.STICK],
					[null, ITEM.STICK]
				],
				ITEM.DIAMOND_AXE,
				1
			));
		}
		
		// Diamond Shovel
		if (ITEM.DIAMOND_SHOVEL) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.DIAMOND],
					[ITEM.STICK],
					[ITEM.STICK]
				],
				ITEM.DIAMOND_SHOVEL,
				1
			));
		}
		
		// Diamond Sword
		if (ITEM.DIAMOND_SWORD) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.DIAMOND],
					[ITEM.DIAMOND],
					[ITEM.STICK]
				],
				ITEM.DIAMOND_SWORD,
				1
			));
		}
		
		// Diamond Hoe
		if (ITEM.DIAMOND_HOE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.DIAMOND, ITEM.DIAMOND],
					[null, ITEM.STICK],
					[null, ITEM.STICK]
				],
				ITEM.DIAMOND_HOE,
				1
			));
		}
	}
	
	// ==========================================
	// Block Recipes
	// ==========================================
	
	// Furnace
	if (ITEM.COBBLESTONE && ITEM.FURNACE) {
		CRAFTING.register(shapedRecipe(
			[
				[ITEM.COBBLESTONE, ITEM.COBBLESTONE, ITEM.COBBLESTONE],
				[ITEM.COBBLESTONE, null, ITEM.COBBLESTONE],
				[ITEM.COBBLESTONE, ITEM.COBBLESTONE, ITEM.COBBLESTONE]
			],
			ITEM.FURNACE,
			1
		));
	}
	
	// Chest
	if (ITEM.PLANK && ITEM.CHEST) {
		CRAFTING.register(shapedRecipe(
			[
				[ITEM.PLANK, ITEM.PLANK, ITEM.PLANK],
				[ITEM.PLANK, null, ITEM.PLANK],
				[ITEM.PLANK, ITEM.PLANK, ITEM.PLANK]
			],
			ITEM.CHEST,
			1
		));
	}
	
	// Torch
	if (ITEM.COAL && ITEM.STICK && ITEM.TORCH) {
		CRAFTING.register(shapedRecipe(
			[
				[ITEM.COAL],
				[ITEM.STICK]
			],
			ITEM.TORCH,
			4
		));
	}
	
	console.log("Registered " + CRAFTING.recipes.length + " crafting recipes");
}

// Initialize recipes when DOM is ready
if (typeof window !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function() {
			setTimeout(registerRecipes, 200); // Wait for items to register first
		});
	} else {
		setTimeout(registerRecipes, 200);
	}
}

// Export for Node.js
if (typeof exports !== 'undefined') {
	exports.CraftingRecipe = CraftingRecipe;
	exports.CraftingManager = CraftingManager;
	exports.CRAFTING = CRAFTING;
	exports.RECIPE_TYPE = RECIPE_TYPE;
}


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

// Check if a recipe fits in a 2x2 grid (for inventory crafting)
CraftingManager.prototype.recipeFitsIn2x2 = function(recipe) {
	if (recipe.type === RECIPE_TYPE.SHAPELESS) {
		// Shapeless recipes with 4 or fewer ingredients can fit in 2x2
		var ingredientCount = 0;
		for (var i = 0; i < recipe.ingredients.length; i++) {
			if (recipe.ingredients[i]) {
				ingredientCount++;
			}
		}
		return ingredientCount <= 4;
	} else {
		// Shaped recipes: check if pattern fits in 2x2
		var pattern = recipe.ingredients;
		if (!pattern || pattern.length === 0) return false;
		
		var maxWidth = 0;
		var maxHeight = pattern.length;
		
		// Find the actual maximum width and height of the pattern
		for (var y = 0; y < pattern.length; y++) {
			if (pattern[y] && Array.isArray(pattern[y])) {
				// Check each column in this row
				for (var x = 0; x < pattern[y].length; x++) {
					if (pattern[y][x]) {
						maxWidth = Math.max(maxWidth, x + 1);
					}
				}
			}
		}
		
		// Pattern fits in 2x2 if both dimensions are <= 2
		return maxHeight <= 2 && maxWidth <= 2;
	}
};

// Find a matching recipe that fits in 2x2 grid
CraftingManager.prototype.findRecipe2x2 = function(grid) {
	// Only check recipes that fit in 2x2
	for (var i = 0; i < this.recipes.length; i++) {
		if (this.recipeFitsIn2x2(this.recipes[i]) && this.recipes[i].matches(grid)) {
			return this.recipes[i];
		}
	}
	return null;
};

// Get crafting result for 2x2 grid (inventory crafting)
CraftingManager.prototype.getResult2x2 = function(grid) {
	var recipe = this.findRecipe2x2(grid);
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

// Find the recipe offset for shaped recipes
CraftingManager.prototype.findRecipeOffset = function(grid, recipe) {
	if (recipe.type !== RECIPE_TYPE.SHAPED) {
		return { x: 0, y: 0 };
	}
	
	var pattern = recipe.ingredients;
	var patternHeight = pattern.length;
	var patternWidth = pattern[0] ? pattern[0].length : 0;
	var gridHeight = grid.length;
	var gridWidth = grid[0] ? grid[0].length : 0;
	
	// Try all possible offsets
	for (var offsetY = 0; offsetY <= gridHeight - patternHeight; offsetY++) {
		for (var offsetX = 0; offsetX <= gridWidth - patternWidth; offsetX++) {
			if (recipe.matchesAtOffset && recipe.matchesAtOffset(grid, offsetX, offsetY)) {
				return { x: offsetX, y: offsetY };
			}
		}
	}
	
	return { x: 0, y: 0 };
};

// Calculate how many times a recipe can be crafted from the current grid
CraftingManager.prototype.getCraftingCount = function(grid) {
	var recipe = this.findRecipe(grid);
	if (!recipe) return 0;
	
	var maxCount = Infinity;
	
	if (recipe.type === RECIPE_TYPE.SHAPED) {
		// For shaped recipes, find the pattern and check each ingredient
		var offset = this.findRecipeOffset(grid, recipe);
		var pattern = recipe.ingredients;
		
		for (var py = 0; py < pattern.length; py++) {
			for (var px = 0; px < pattern[py].length; px++) {
				var patternItem = pattern[py][px];
				if (!patternItem) continue;
				
				var patternItemId = patternItem.id || patternItem;
				var gridY = offset.y + py;
				var gridX = offset.x + px;
				
				if (gridY < grid.length && gridX < grid[gridY].length) {
					var gridItem = grid[gridY][gridX];
					if (gridItem) {
						var gridItemId = gridItem.item ? gridItem.item.id : (gridItem.id || gridItem);
						if (gridItemId === patternItemId && gridItem.count) {
							maxCount = Math.min(maxCount, gridItem.count);
						}
					} else {
						return 0; // Missing ingredient
					}
				}
			}
		}
	} else {
		// For shapeless recipes, count all required ingredients
		var required = {};
		for (var i = 0; i < recipe.ingredients.length; i++) {
			var ing = recipe.ingredients[i];
			if (!ing) continue;
			var ingId = ing.id || ing;
			required[ingId] = (required[ingId] || 0) + 1;
		}
		
		var available = {};
		for (var y = 0; y < grid.length; y++) {
			for (var x = 0; x < grid[y].length; x++) {
				var gridItem = grid[y][x];
				if (gridItem) {
					var gridItemId = gridItem.item ? gridItem.item.id : (gridItem.id || gridItem);
					if (required[gridItemId]) {
						available[gridItemId] = (available[gridItemId] || 0) + (gridItem.count || 1);
					}
				}
			}
		}
		
		// Find minimum crafting count
		for (var ingId in required) {
			if (required.hasOwnProperty(ingId)) {
				var needed = required[ingId];
				var has = available[ingId] || 0;
				maxCount = Math.min(maxCount, Math.floor(has / needed));
			}
		}
	}
	
	return Math.max(0, Math.floor(maxCount));
};

// Craft item (consumes ingredients according to recipe pattern and returns result)
CraftingManager.prototype.craft = function(grid, times) {
	times = times || 1;
	var recipe = this.findRecipe(grid);
	if (!recipe) return null;
	
	// Check how many times we can actually craft
	var maxCraft = this.getCraftingCount(grid);
	if (maxCraft === 0) return null;
	
	times = Math.min(times, maxCraft);
	
	if (recipe.type === RECIPE_TYPE.SHAPED) {
		// For shaped recipes, consume according to pattern
		var offset = this.findRecipeOffset(grid, recipe);
		var pattern = recipe.ingredients;
		
		for (var py = 0; py < pattern.length; py++) {
			for (var px = 0; px < pattern[py].length; px++) {
				var patternItem = pattern[py][px];
				if (!patternItem) continue;
				
				var gridY = offset.y + py;
				var gridX = offset.x + px;
				
				if (gridY < grid.length && gridX < grid[gridY].length) {
					var gridItem = grid[gridY][gridX];
					if (gridItem) {
						gridItem.count = (gridItem.count || 1) - times;
						if (gridItem.count <= 0) {
							grid[gridY][gridX] = null;
						}
					}
				}
			}
		}
	} else {
		// For shapeless recipes, consume from any matching slot
		var required = {};
		for (var i = 0; i < recipe.ingredients.length; i++) {
			var ing = recipe.ingredients[i];
			if (!ing) continue;
			var ingId = ing.id || ing;
			required[ingId] = (required[ingId] || 0) + times;
		}
		
		// Consume ingredients (try to consume from slots in order)
		for (var ingId in required) {
			if (required.hasOwnProperty(ingId)) {
				var needed = required[ingId];
				for (var y = 0; y < grid.length && needed > 0; y++) {
					for (var x = 0; x < grid[y].length && needed > 0; x++) {
						var gridItem = grid[y][x];
						if (gridItem) {
							var gridItemId = gridItem.item ? gridItem.item.id : (gridItem.id || gridItem);
							if (gridItemId === ingId) {
								var consume = Math.min(needed, gridItem.count || 1);
								gridItem.count = (gridItem.count || 1) - consume;
								needed -= consume;
								if (gridItem.count <= 0) {
									grid[y][x] = null;
								}
							}
						}
					}
				}
			}
		}
	}
	
	// Return result
	var resultItem = recipe.result;
	if (typeof resultItem === 'number') {
		resultItem = ITEM_REGISTRY.get(resultItem);
	}
	if (resultItem) {
		return new ItemStack(resultItem, recipe.resultCount * times);
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
	
	// Torch (2x2 inventory crafting)
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
	
	// ==========================================
	// Additional 2x2 Recipes (Inventory Crafting)
	// ==========================================
	
	// All these recipes can be crafted in the 2x2 inventory grid
	// They will NOT work in the 3x3 crafting table (by design, since they're basic recipes)
	
	// Wooden Button (1 plank = 1 button) - 2x2 shapeless
	// Note: We don't have button items/blocks, so this is commented out
	// if (ITEM.PLANK && ITEM.BUTTON) {
	//     CRAFTING.register(shapelessRecipe([ITEM.PLANK], ITEM.BUTTON, 1));
	// }
	
	// Cobblestone Wall (6 cobblestone = 6 walls) - Actually 3x3, so commented
	// Wooden Pressure Plate (2 planks = 1 pressure plate) - 2x2 shaped
	// Note: We don't have pressure plate items/blocks
	
	// The basic recipes above (planks, sticks, crafting table, torch) are all that
	// can be crafted in 2x2 in vanilla Minecraft. All other recipes require 3x3.
	
	// ==========================================
	// Gold Tools (requires gold ingots, 3x3 crafting table)
	// ==========================================
	
	if (ITEM.GOLD_INGOT && ITEM.STICK) {
		// Gold Pickaxe
		if (ITEM.GOLD_PICKAXE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.GOLD_INGOT, ITEM.GOLD_INGOT, ITEM.GOLD_INGOT],
					[null, ITEM.STICK, null],
					[null, ITEM.STICK, null]
				],
				ITEM.GOLD_PICKAXE,
				1
			));
		}
		
		// Gold Axe
		if (ITEM.GOLD_AXE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.GOLD_INGOT, ITEM.GOLD_INGOT],
					[ITEM.GOLD_INGOT, ITEM.STICK],
					[null, ITEM.STICK]
				],
				ITEM.GOLD_AXE,
				1
			));
		}
		
		// Gold Shovel
		if (ITEM.GOLD_SHOVEL) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.GOLD_INGOT],
					[ITEM.STICK],
					[ITEM.STICK]
				],
				ITEM.GOLD_SHOVEL,
				1
			));
		}
		
		// Gold Sword
		if (ITEM.GOLD_SWORD) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.GOLD_INGOT],
					[ITEM.GOLD_INGOT],
					[ITEM.STICK]
				],
				ITEM.GOLD_SWORD,
				1
			));
		}
		
		// Gold Hoe
		if (ITEM.GOLD_HOE) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.GOLD_INGOT, ITEM.GOLD_INGOT],
					[null, ITEM.STICK],
					[null, ITEM.STICK]
				],
				ITEM.GOLD_HOE,
				1
			));
		}
	}
	
	// ==========================================
	// Building Block Recipes (3x3 crafting table)
	// ==========================================
	
	// Wooden Stairs (6 planks = 4 stairs) - REQUIRES 3x3
	if (ITEM.PLANK && BLOCK.PLANKS_STAIRS) {
		var stairsItem = ITEM_REGISTRY.getByBlock(BLOCK.PLANKS_STAIRS);
		if (stairsItem) {
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.PLANK, null, null],
					[ITEM.PLANK, ITEM.PLANK, null],
					[ITEM.PLANK, ITEM.PLANK, ITEM.PLANK]
				],
				stairsItem,
				4
			));
		}
	}
	
	// Bookshelf (6 planks + 3 books = 1 bookshelf) - REQUIRES 3x3
	// Note: We don't have book items, so we'll use planks as placeholder for books
	// In real Minecraft: 3 books in middle row, planks top and bottom
	if (ITEM.PLANK && BLOCK.BOOKCASE) {
		var bookcaseItem = ITEM_REGISTRY.getByBlock(BLOCK.BOOKCASE);
		if (bookcaseItem) {
			// Using planks where books should be (will need book items for proper recipe)
			CRAFTING.register(shapedRecipe(
				[
					[ITEM.PLANK, ITEM.PLANK, ITEM.PLANK],
					[ITEM.PLANK, ITEM.PLANK, ITEM.PLANK], // This would be books in real MC
					[ITEM.PLANK, ITEM.PLANK, ITEM.PLANK]
				],
				bookcaseItem,
				1
			));
		}
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


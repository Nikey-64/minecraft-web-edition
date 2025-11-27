// ==========================================
// Player
//
// This class contains the code that manages the local player.
// ==========================================

// Mouse event enumeration
MOUSE = {};
MOUSE.DOWN = 1;
MOUSE.UP = 2;
MOUSE.MOVE = 3;

// Game mode enumeration
var GAME_MODE = {};
GAME_MODE.SURVIVAL = 0;
GAME_MODE.CREATIVE = 1;
GAME_MODE.SPECTATOR = 2;

// Constructor()
//
// Creates a new local player manager.

function Player()
{	
}

// setWorld( world )
//
// Assign the local player to a world.

Player.prototype.setWorld = function( world )
{
	this.world = world;
	this.world.localPlayer = this;
	this.pos = world.spawn;
	this.velocity = new Vector( 0, 0, 0 );
	this.angles = [ 0, Math.PI, 0 ];
	this.falling = false;
	this.keys = {};
	this.buildMaterial = BLOCK.DIRT;
	this.eventHandlers = {};
	this.spectatorMode = false; // Modo espectador: volar libremente sin colisiones
	this.cameraMode = 1; // Modo de cámara: 1 = primera persona, 2 = segunda persona, 3 = tercera persona
	
	// Game mode system
	this.gameMode = GAME_MODE.SURVIVAL; // Default: Survival mode
	this.health = 20; // Health (0-20, like Minecraft)
	this.maxHealth = 20;
	this.hunger = 20; // Hunger (0-20, like Minecraft)
	this.maxHunger = 20;
	
	// Inventory system
	this.hotbar = new Array(9).fill(null); // 9 slots del hotbar (can be Block or ItemStack)
	this.inventory = new Array(27).fill(null); // 27 slots del inventario (3 filas x 9 columnas)
	this.selectedHotbarSlot = 0; // Slot seleccionado (0-8)
	this.inventoryOpen = false;
	
	// Inventory management - for manual organization
	this.draggedSlot = null; // {type: 'hotbar'|'inventory', index: number} - slot being dragged
	
	// Item system support - now enabled by default
	this.useItemSystem = true; // Use ItemStack instead of Block for better item management
	
	// Block breaking system (survival mode)
	this.breakingBlock = null; // {x, y, z} - current block being broken
	this.breakingProgress = 0; // Progress from 0 to 9 (every block is diferent and has a different breaking time)
	this.breakingStartTime = 0; // Time when breaking started
	this.isMouseDown = false; // Whether mouse button is currently held down
	this.lastBreakTarget = null; // Last block targeted for breaking
	
	// Initialize game mode UI
	// Use setTimeout to ensure DOM is ready
	setTimeout(function() {
		if (this.updateGameModeUI) {
			this.updateGameModeUI();
		}
	}.bind(this), 100);
}

// setClient( client )
//
// Assign the local player to a socket client.

Player.prototype.setClient = function( client )
{
	this.client = client;
}

// setPhysics( physics )
//
// Assign the physics simulator to this player.

Player.prototype.setPhysics = function( physics )
{
	this.physics = physics;
}

// setInputCanvas( id )
//
// Set the canvas the renderer uses for some input operations.

Player.prototype.setInputCanvas = function( id )
{
	var canvas = this.canvas = document.getElementById( id );

	var t = this;
	document.onkeydown = function( e ) { if ( e.target.tagName != "INPUT" ) { t.onKeyEvent( e.keyCode, true ); return false; } }
	document.onkeyup = function( e ) { if ( e.target.tagName != "INPUT" ) { t.onKeyEvent( e.keyCode, false ); return false; } }
	canvas.onmousedown = function( e ) { t.onMouseEvent( e.clientX, e.clientY, MOUSE.DOWN, e.which == 3 ); return false; }
	canvas.onmouseup = function( e ) { t.onMouseEvent( e.clientX, e.clientY, MOUSE.UP, e.which == 3 ); return false; }
	canvas.onmousemove = function( e ) { t.onMouseEvent( e.clientX, e.clientY, MOUSE.MOVE, e.which == 3 ); return false; }

	// Pointer lock for mouse capture
	canvas.onclick = function() {
		canvas.requestPointerLock();
	}

	document.addEventListener('pointerlockchange', function() {
		if (document.pointerLockElement === canvas) {
			document.getElementById('crosshair').style.display = 'block';
			document.getElementById('cursor').style.display = 'none';
			t.pointerLocked = true;
			t.dragging = true;
			t.targetPitch = t.angles[0];
			t.targetYaw = t.angles[1];
			// Disable old mouse events
			canvas.onmousedown = null;
			canvas.onmouseup = null;
			canvas.onmousemove = null;
		} else {
			document.getElementById('crosshair').style.display = 'none';
			document.getElementById('cursor').style.display = 'block';
			t.pointerLocked = false;
			t.dragging = false;
			t.angles[0] = t.targetPitch;
			t.angles[1] = t.targetYaw;
			// Re-enable old mouse events
			canvas.onmousedown = function( e ) { t.onMouseEvent( e.clientX, e.clientY, MOUSE.DOWN, e.which == 3 ); return false; }
			canvas.onmouseup = function( e ) { t.onMouseEvent( e.clientX, e.clientY, MOUSE.UP, e.which == 3 ); return false; }
			canvas.onmousemove = function( e ) { t.onMouseEvent( e.clientX, e.clientY, MOUSE.MOVE, e.which == 3 ); return false; }
			// Pause the game when mouse is uncaptured, but NOT if inventory is open
			if (typeof pauseGame === 'function' && !t.inventoryOpen) {
				pauseGame();
			}
		}
	});

	document.addEventListener('mousemove', function(e) {
		if (t.pointerLocked && !t.inventoryOpen) {
			t.onMouseMove(e.movementX, e.movementY);
		}
		// Update dragged item cursor position if dragging
		if (t.inventoryOpen && t.draggedSlot) {
			t.updateDraggedItemCursorPosition(e);
		}
	});

	document.addEventListener('mousedown', function(e) {
		if (t.pointerLocked && !t.inventoryOpen) {
			if (e.button === 0) { // Left click
				t.isMouseDown = true;
				t.startBreakingBlock();
			} else if (e.button === 2) { // Right click
				t.doBlockActionAtCenter(false); // Place
			}
			e.preventDefault();
		}
	});
	
	document.addEventListener('mouseup', function(e) {
		if (e.button === 0) { // Left mouse button released
			t.isMouseDown = false;
			t.stopBreakingBlock();
		}
	});
}

// initInventory()
//
// Initializes the hotbar and inventory system.

Player.prototype.initInventory = function()
{
	// Initialize hotbar slots
	var hotbarEl = document.getElementById("hotbar");
	var pl = this;
	
	// Set up hotbar slot click handlers for manual organization
	for (var i = 0; i < 9; i++) {
		var slot = hotbarEl.children[i];
		slot.setAttribute("data-slot", i);
		slot.onclick = function(e) {
			var slotIndex = parseInt(this.getAttribute("data-slot"));
			pl.handleSlotClick('hotbar', slotIndex, e);
		};
	}
	
	// Don't initialize with any blocks by default
	// Inventory will be populated based on game mode
	this.clearInventory();
	
	// Update display
	this.updateHotbarDisplay();
	this.updateInventoryDisplay();
	
	// Setup creative inventory button
	this.setupCreativeInventoryButton();
	
	// Note: The inventory player model renderer and 1x1x3 environment
	// will be initialized in startGameLoop() to ensure everything is ready
}

// setupCreativeInventoryButton()
//
// Sets up the creative inventory button click handlers.

Player.prototype.setupCreativeInventoryButton = function()
{
	var pl = this;
	var creativeInventoryButton = document.getElementById("creativeInventoryButton");
	var creativeInventoryCloseButton = document.getElementById("creativeInventoryCloseButton");
	var creativeInventory = document.getElementById("creativeInventory");
	
	if (creativeInventoryButton) {
		creativeInventoryButton.onclick = function() {
			pl.openCreativeInventory();
		};
	}
	
	if (creativeInventoryCloseButton) {
		creativeInventoryCloseButton.onclick = function() {
			pl.closeCreativeInventory();
		};
	}
	
	if (creativeInventory) {
		// Close when clicking overlay
		creativeInventory.onclick = function(e) {
			if (e.target === creativeInventory || e.target.classList.contains("creative-inventory-overlay")) {
				pl.closeCreativeInventory();
			}
		};
	}
}



// clearInventory()
//
// Clears all items from hotbar and inventory.

Player.prototype.clearInventory = function()
{
	// Clear hotbar
	for (var i = 0; i < this.hotbar.length; i++) {
		this.hotbar[i] = null;
	}
	
	// Clear inventory
	for (var i = 0; i < this.inventory.length; i++) {
		this.inventory[i] = null;
	}
	
	// Reset build material to AIR
	this.buildMaterial = BLOCK.AIR;
	
	// Reset selected slot to 0
	this.selectedHotbarSlot = 0;
	
	// Update displays
	this.updateHotbarDisplay();
}

// openCreativeInventory()
//
// Opens the creative inventory menu (only available in creative mode).

Player.prototype.openCreativeInventory = function()
{
	if (this.gameMode !== GAME_MODE.CREATIVE) return;
	
	var creativeInventory = document.getElementById("creativeInventory");
	if (!creativeInventory) return;
	
	creativeInventory.style.display = "flex";
	this.inventoryOpen = true;
	this.updateCreativeInventoryDisplay();
}

// closeCreativeInventory()
//
// Closes the creative inventory menu.

Player.prototype.closeCreativeInventory = function()
{
	var creativeInventory = document.getElementById("creativeInventory");
	if (creativeInventory) {
		creativeInventory.style.display = "none";
	}
	this.inventoryOpen = false;
	// Clear dragged slot when closing creative inventory
	this.draggedSlot = null;
}

// updateCreativeInventoryDisplay()
//
// Populates the creative inventory with all available blocks and items.

Player.prototype.updateCreativeInventoryDisplay = function()
{
	var creativeInventoryGrid = document.getElementById("creativeInventoryGrid");
	if (!creativeInventoryGrid) return;
	
	var pl = this;
	
	// Clear existing slots
	creativeInventoryGrid.innerHTML = "";
	
	// Get all spawnable blocks
	var allBlocks = [];
	for (var mat in BLOCK) {
		if (typeof(BLOCK[mat]) == "object" && BLOCK[mat].spawnable == true && BLOCK[mat] !== BLOCK.AIR) {
			allBlocks.push(BLOCK[mat]);
		}
	}
	
	// Sort blocks by ID
	allBlocks.sort(function(a, b) {
		return (a.id || 0) - (b.id || 0);
	});
	
	// Create slots for each block (display in a scrollable grid)
	for (var i = 0; i < allBlocks.length; i++) {
		var block = allBlocks[i];
		var slot = document.createElement("div");
		slot.className = "creative-inventory-slot";
		slot.blockData = block;
		
		// Render thumbnail
		var thumb = this.renderBlockThumbnail(block, 32);
		thumb.className = "block-thumbnail";
		slot.appendChild(thumb);
		
		// Add block name label
		var label = document.createElement("div");
		label.className = "creative-slot-label";
		label.textContent = this.getBlockDisplayName(block);
		slot.appendChild(label);
		
		// Set up click handler - add to hotbar
		slot.onclick = function() {
			var selectedBlock = this.blockData;
			if (selectedBlock) {
				// Add to first empty hotbar slot, or replace current selected slot
				var emptySlot = pl.hotbar.indexOf(null);
				if (emptySlot !== -1) {
					pl.setHotbarSlot(emptySlot, selectedBlock);
					pl.selectHotbarSlot(emptySlot);
				} else {
					pl.setHotbarSlot(pl.selectedHotbarSlot, selectedBlock);
				}
				// Close creative inventory after selection
				pl.closeCreativeInventory();
			}
		};
		
		creativeInventoryGrid.appendChild(slot);
	}
}

// selectHotbarSlot( index )
//
// Selects a hotbar slot (0-8).

Player.prototype.selectHotbarSlot = function(index)
{
	if (index < 0 || index >= 9) return;
	
	this.selectedHotbarSlot = index;
	
	// Update visual selection
	var hotbarEl = document.getElementById("hotbar");
	for (var i = 0; i < 9; i++) {
		var slot = hotbarEl.children[i];
		if (i === index) {
			slot.classList.add("selected");
		} else {
			slot.classList.remove("selected");
		}
	}
	
	// Update buildMaterial - get the actual block from ItemStack if needed
	var block = this.getSelectedBlock();
	this.buildMaterial = block || BLOCK.AIR;
	
	// Show item title
	this.showItemTitle(block);
}

// showItemTitle( block )
//
// Shows the item name as a title when switching hotbar slots.

Player.prototype.showItemTitle = function(block)
{
	var titleEl = document.getElementById("itemTitleDisplay");
	var titleTextEl = document.getElementById("itemTitleText");
	if (!titleEl || !titleTextEl) return;
	
	// Don't show title for AIR or empty slots
	if (!block || block === BLOCK.AIR) {
		titleEl.style.opacity = "0";
		return;
	}
	
	// Get item name
	var itemName = "Unknown Item";
	
	// Try to get name from ItemStack if using item system
	if (block instanceof ItemStack) {
		if (block.item && !block.isEmpty()) {
			itemName = block.item.name || "Unknown Item";
		} else {
			// Empty ItemStack, don't show
			titleEl.style.opacity = "0";
			return;
		}
	}
	// Try to get name from ITEM_REGISTRY
	else if (typeof ITEM_REGISTRY !== 'undefined') {
		var item = ITEM_REGISTRY.getByBlock(block);
		if (item) {
			itemName = item.name || "Unknown Item";
		} else {
			// Fallback: get name from block property name
			itemName = this.getBlockDisplayName(block);
		}
	}
	// Fallback: get name from block property name
	else {
		itemName = this.getBlockDisplayName(block);
	}
	
	// Update title text
	titleTextEl.textContent = itemName;
	
	// Show title with fade in
	titleEl.style.opacity = "1";
	
	// Hide title after 2 seconds with fade out
	if (this.itemTitleTimeout) {
		clearTimeout(this.itemTitleTimeout);
	}
	this.itemTitleTimeout = setTimeout(function() {
		titleEl.style.opacity = "0";
	}, 2000);
}

// getBlockDisplayName( block )
//
// Gets a display name for a block by finding its property name in BLOCK.

Player.prototype.getBlockDisplayName = function(block)
{
	if (!block) return "Air";
	
	// Search for block in BLOCK object
	for (var prop in BLOCK) {
		if (BLOCK.hasOwnProperty(prop) && BLOCK[prop] === block) {
			// Convert property name to display name
			// e.g., "PLANKS_STAIRS" -> "Planks Stairs"
			var name = prop.replace(/_/g, ' ').toLowerCase();
			// Capitalize first letter of each word
			name = name.replace(/\b\w/g, function(l) { return l.toUpperCase(); });
			return name;
		}
	}
	
	// Fallback: use block id or generic name
	return "Block " + (block.id || "?");
}

// setHotbarSlot( index, block )
//
// Sets a block in a hotbar slot.

Player.prototype.setHotbarSlot = function(index, block)
{
	if (index < 0 || index >= 9) return;
	
	this.hotbar[index] = block;
	this.updateHotbarDisplay();
}

// handleSlotClick( type, index, event )
//
// Handles clicking on inventory slots for manual organization.
// Allows moving items between slots but prevents stacking/combining.

Player.prototype.handleSlotClick = function(type, index, event)
{
	// If inventory is not open, just select the hotbar slot
	if (type === 'hotbar' && !this.inventoryOpen) {
		this.selectHotbarSlot(index);
		return;
	}
	
	// If inventory is open, handle item movement
	if (this.inventoryOpen) {
		// Get the slot data
		var sourceSlot = null;
		if (type === 'hotbar') {
			sourceSlot = this.hotbar[index];
		} else if (type === 'inventory') {
			sourceSlot = this.inventory[index];
		}
		
		// If we have a dragged slot, try to move/swap
		if (this.draggedSlot) {
			var draggedItem = null;
			if (this.draggedSlot.type === 'hotbar') {
				draggedItem = this.hotbar[this.draggedSlot.index];
			} else if (this.draggedSlot.type === 'inventory') {
				draggedItem = this.inventory[this.draggedSlot.index];
			}
			
			// Only move if dragged item exists
			if (draggedItem && draggedItem !== BLOCK.AIR) {
				// Check if target slot has an item
				if (sourceSlot && sourceSlot !== BLOCK.AIR) {
					// Both slots have items - swap them (but don't combine stacks)
					if (type === 'hotbar') {
						this.hotbar[index] = draggedItem;
					} else if (type === 'inventory') {
						this.inventory[index] = draggedItem;
					}
					
					if (this.draggedSlot.type === 'hotbar') {
						this.hotbar[this.draggedSlot.index] = sourceSlot;
					} else if (this.draggedSlot.type === 'inventory') {
						this.inventory[this.draggedSlot.index] = sourceSlot;
					}
				} else {
					// Target slot is empty - move item
					if (type === 'hotbar') {
						this.hotbar[index] = draggedItem;
					} else if (type === 'inventory') {
						this.inventory[index] = draggedItem;
					}
					
					// Clear source slot
					if (this.draggedSlot.type === 'hotbar') {
						this.hotbar[this.draggedSlot.index] = null;
					} else if (this.draggedSlot.type === 'inventory') {
						this.inventory[this.draggedSlot.index] = null;
					}
				}
				
				// Update displays
				this.updateHotbarDisplay();
				this.updateInventoryDisplay();
			}
			
			// Clear dragged slot
			this.draggedSlot = null;
			this.hideDraggedItemCursor();
		} else {
			// Start dragging from this slot (if it has an item)
			if (sourceSlot && sourceSlot !== BLOCK.AIR) {
				this.draggedSlot = { type: type, index: index };
				this.updateDraggedItemCursor(sourceSlot, event);
				// Update displays to hide item from original slot
				this.updateHotbarDisplay();
				this.updateInventoryDisplay();
			}
		}
	} else {
		// Inventory not open, just select hotbar slot
		if (type === 'hotbar') {
			this.selectHotbarSlot(index);
		}
	}
}

// updateDraggedItemCursor( item, event )
//
// Updates the dragged item cursor to show the item being dragged and follows the mouse.

Player.prototype.updateDraggedItemCursor = function(item, event)
{
	var cursorEl = document.getElementById("draggedItemCursor");
	var thumbnailEl = document.getElementById("draggedItemThumbnail");
	var countEl = document.getElementById("draggedItemCount");
	
	if (!cursorEl || !thumbnailEl) return;
	
	// Get actual block from ItemStack if using item system
	var actualBlock = item;
	if (item instanceof ItemStack) {
		if (item.item && item.item.blockId !== undefined && item.item.blockId !== null) {
			actualBlock = BLOCK.fromId(item.item.blockId);
			if (!actualBlock && item.item.data && item.item.data.block) {
				actualBlock = item.item.data.block;
			}
		} else if (item.item && item.item.type === ITEM_TYPE.BLOCK && item.item.data && item.item.data.block) {
			actualBlock = item.item.data.block;
		}
	}
	
	if (actualBlock && actualBlock !== BLOCK.AIR) {
		// Render thumbnail
		var thumb = this.renderBlockThumbnail(actualBlock, 32);
		thumbnailEl.innerHTML = "";
		thumbnailEl.appendChild(thumb);
		
		// Show count if ItemStack has more than 1
		if (item instanceof ItemStack && item.count > 1) {
			countEl.textContent = item.count;
			countEl.style.display = "block";
		} else {
			countEl.style.display = "none";
		}
		
		// Show cursor and position it at mouse
		cursorEl.style.display = "block";
		if (event) {
			cursorEl.style.left = (event.clientX - 16) + "px";
			cursorEl.style.top = (event.clientY - 16) + "px";
		}
	}
}

// hideDraggedItemCursor()
//
// Hides the dragged item cursor.

Player.prototype.hideDraggedItemCursor = function()
{
	var cursorEl = document.getElementById("draggedItemCursor");
	if (cursorEl) {
		cursorEl.style.display = "none";
	}
}

// updateDraggedItemCursorPosition( event )
//
// Updates the position of the dragged item cursor to follow the mouse.

Player.prototype.updateDraggedItemCursorPosition = function(event)
{
	if (!this.draggedSlot) {
		this.hideDraggedItemCursor();
		return;
	}
	
	var cursorEl = document.getElementById("draggedItemCursor");
	if (cursorEl && cursorEl.style.display !== "none") {
		cursorEl.style.left = (event.clientX - 16) + "px";
		cursorEl.style.top = (event.clientY - 16) + "px";
	}
}

// Item System Methods (for future use with ItemStack)

// addItemStack( itemStack )
//
// Adds an ItemStack to the inventory. Returns true if successful.

Player.prototype.addItemStack = function(itemStack) {
	if (!itemStack || !itemStack.item || itemStack.isEmpty()) {
		return false;
	}
	
	var remainingCount = itemStack.count;
	var itemAdded = false;
	
	// Try to add to existing stacks first (hotbar)
	for (var i = 0; i < this.hotbar.length && remainingCount > 0; i++) {
		var slot = this.hotbar[i];
		if (slot && slot instanceof ItemStack && slot.item) {
			// Compare items by id - this is the key for stacking
			if (slot.item.id === itemStack.item.id) {
				if (!slot.isFull()) {
					var toAdd = Math.min(remainingCount, slot.item.maxStack - slot.count);
					slot.add(toAdd);
					remainingCount -= toAdd;
					itemAdded = true;
				}
			}
		}
	}
	
	// Try inventory slots for stacking
	for (var i = 0; i < this.inventory.length && remainingCount > 0; i++) {
		var slot = this.inventory[i];
		if (slot && slot instanceof ItemStack && slot.item) {
			// Compare items by id - this is the key for stacking
			if (slot.item.id === itemStack.item.id) {
				if (!slot.isFull()) {
					var toAdd = Math.min(remainingCount, slot.item.maxStack - slot.count);
					slot.add(toAdd);
					remainingCount -= toAdd;
					itemAdded = true;
				}
			}
		}
	}
	
	// If still have items remaining, try to add to empty hotbar slots
	for (var i = 0; i < this.hotbar.length && remainingCount > 0; i++) {
		if (!this.hotbar[i] || (this.hotbar[i] instanceof ItemStack && this.hotbar[i].isEmpty())) {
			var toAdd = Math.min(remainingCount, itemStack.item.maxStack);
			this.hotbar[i] = new ItemStack(itemStack.item, toAdd);
			remainingCount -= toAdd;
			itemAdded = true;
		}
	}
	
	// If still have items remaining, try to add to empty inventory slots
	for (var i = 0; i < this.inventory.length && remainingCount > 0; i++) {
		if (!this.inventory[i] || (this.inventory[i] instanceof ItemStack && this.inventory[i].isEmpty())) {
			var toAdd = Math.min(remainingCount, itemStack.item.maxStack);
			this.inventory[i] = new ItemStack(itemStack.item, toAdd);
			remainingCount -= toAdd;
			itemAdded = true;
		}
	}
	
	// Update displays if items were added
	if (itemAdded) {
		this.updateHotbarDisplay();
		this.updateInventoryDisplay();
	}
	
	// Return true if at least some items were added
	return itemAdded;
};

// getSelectedItem()
//
// Gets the currently selected item/block from hotbar.

Player.prototype.getSelectedItem = function() {
	var slot = this.hotbar[this.selectedHotbarSlot];
	if (!slot) return null;
	
	// If using ItemStack system
	if (slot instanceof ItemStack) {
		return slot.isEmpty() ? null : slot.item;
	}
	
	// Legacy: return block directly
	return slot;
};

// getSelectedBlock()
//
// Gets the currently selected block (for compatibility).

Player.prototype.getSelectedBlock = function() {
	var slot = this.hotbar[this.selectedHotbarSlot];
	if (!slot) return BLOCK.AIR;
	
	// If using ItemStack system
	if (slot instanceof ItemStack) {
		if (slot.isEmpty() || !slot.item) return BLOCK.AIR;
		
		// If item has blockId, use it to get the block from BLOCK registry
		if (slot.item.blockId !== undefined && slot.item.blockId !== null) {
			var block = BLOCK.fromId(slot.item.blockId);
			if (block) return block;
		}
		
		// Fallback: try to get block from item.data.block
		if (slot.item.type === ITEM_TYPE.BLOCK && slot.item.data && slot.item.data.block) {
			return slot.item.data.block;
		}
		
		return BLOCK.AIR;
	}
	
	// Legacy: return block directly (if it's a block object)
	if (slot && slot !== BLOCK.AIR && typeof slot === 'object' && slot.id !== undefined) {
		return slot;
	}
	
	return BLOCK.AIR;
};

// updateHotbarDisplay()
//
// Updates the visual display of the hotbar.

Player.prototype.updateHotbarDisplay = function()
{
	var hotbarEl = document.getElementById("hotbar");
	
	for (var i = 0; i < 9; i++) {
		var slot = hotbarEl.children[i];
		var block = this.hotbar[i];
		
		// Don't show item if it's being dragged
		if (this.draggedSlot && this.draggedSlot.type === 'hotbar' && this.draggedSlot.index === i) {
			block = null;
		}
		
		// Clear existing thumbnail and count
		var existingThumb = slot.querySelector(".block-thumbnail");
		if (existingThumb) {
			existingThumb.remove();
		}
		var existingCount = slot.querySelector(".item-count");
		if (existingCount) {
			existingCount.remove();
		}
		
		// Add thumbnail if block/item exists
		if (block && block !== BLOCK.AIR) {
			// Get actual block from ItemStack if using item system
			var actualBlock = block;
			if (block instanceof ItemStack) {
				if (block.item && block.item.blockId !== undefined && block.item.blockId !== null) {
					// Use blockId to get the correct block
					actualBlock = BLOCK.fromId(block.item.blockId);
					if (!actualBlock) {
						// Fallback to data.block
						actualBlock = (block.item.data && block.item.data.block) ? block.item.data.block : BLOCK.AIR;
					}
				} else if (block.item && block.item.type === ITEM_TYPE.BLOCK && block.item.data && block.item.data.block) {
					actualBlock = block.item.data.block;
				} else {
					actualBlock = BLOCK.AIR;
				}
			}
			
			if (actualBlock && actualBlock !== BLOCK.AIR) {
				var thumb = this.renderBlockThumbnail(actualBlock, 16);
				thumb.className = "block-thumbnail";
				slot.appendChild(thumb);
				
				// Show count if ItemStack has more than 1 (like Minecraft)
				if (block instanceof ItemStack && block.count > 1) {
					var countEl = document.createElement("div");
					countEl.className = "item-count";
					countEl.textContent = block.count;
					slot.appendChild(countEl);
				}
			}
		}
	}
	
	// Update selection
	this.selectHotbarSlot(this.selectedHotbarSlot);
}

// updateInventoryDisplay()
//
// Updates the inventory grid to show player's collected items.
// In survival mode, only shows items the player has collected.
// In creative mode, this is not used (use creative inventory instead).

Player.prototype.updateInventoryDisplay = function()
{
	var inventoryGrid = document.querySelector(".inventory-grid");
	if (!inventoryGrid) return;
	
	var pl = this;
	
	// Clear existing slots
	inventoryGrid.innerHTML = "";
	
	// In survival mode, show only collected items from inventory array
	// In creative mode, inventory is managed separately via creative inventory
	var itemsToShow = [];
	if (this.gameMode === GAME_MODE.SURVIVAL) {
		// Show only items from player's inventory
		for (var i = 0; i < this.inventory.length; i++) {
			if (this.inventory[i] && this.inventory[i] !== BLOCK.AIR) {
				itemsToShow.push(this.inventory[i]);
			}
		}
	}
	
	// Create slots for each inventory slot (27 slots total)
	for (var i = 0; i < 27; i++) {
		var slot = document.createElement("div");
		slot.className = "inventory-slot";
		slot.setAttribute("data-inv-index", i);
		
		// Get item from inventory array (not from itemsToShow, to maintain slot positions)
		var item = this.inventory[i];
		
		// Don't show item if it's being dragged
		if (this.draggedSlot && this.draggedSlot.type === 'inventory' && this.draggedSlot.index === i) {
			item = null;
		}
		
		if (item && item !== BLOCK.AIR) {
			// Get actual block from ItemStack if using item system
			var actualBlock = item;
			if (item instanceof ItemStack) {
				if (item.item && item.item.blockId !== undefined && item.item.blockId !== null) {
					actualBlock = BLOCK.fromId(item.item.blockId);
					if (!actualBlock && item.item.data && item.item.data.block) {
						actualBlock = item.item.data.block;
					}
				} else if (item.item && item.item.type === ITEM_TYPE.BLOCK && item.item.data && item.item.data.block) {
					actualBlock = item.item.data.block;
				}
			}
			
			if (actualBlock && actualBlock !== BLOCK.AIR) {
				// Render thumbnail
				var thumb = this.renderBlockThumbnail(actualBlock, 16);
				thumb.className = "block-thumbnail";
				slot.appendChild(thumb);
				
				// Show count if ItemStack has more than 1
				if (item instanceof ItemStack && item.count > 1) {
					var countEl = document.createElement("div");
					countEl.className = "item-count";
					countEl.textContent = item.count;
					slot.appendChild(countEl);
				}
			}
		}
		
		// Set up click handler for manual organization
		slot.onclick = function(e) {
			var slotIndex = parseInt(this.getAttribute("data-inv-index"));
			pl.handleSlotClick('inventory', slotIndex, e);
		};
		
		inventoryGrid.appendChild(slot);
	}
	
	// Update inventory hotbar to match main hotbar
	this.updateInventoryHotbarDisplay();
}

// updateInventoryHotbarDisplay()
//
// Updates the inventory hotbar to match the main hotbar.

Player.prototype.updateInventoryHotbarDisplay = function()
{
	var inventoryHotbar = document.querySelector(".inventory-hotbar");
	if (!inventoryHotbar) return;
	
	var pl = this;
	var slots = inventoryHotbar.querySelectorAll(".inventory-slot");
	for (var i = 0; i < 9; i++) {
		var slot = slots[i];
		var block = this.hotbar[i];
		
		// Don't show item if it's being dragged
		if (this.draggedSlot && this.draggedSlot.type === 'hotbar' && this.draggedSlot.index === i) {
			block = null;
		}
		
		// Clear existing thumbnail and count
			var existingThumb = slot.querySelector(".block-thumbnail");
			if (existingThumb) {
				existingThumb.remove();
			}
			var existingCount = slot.querySelector(".item-count");
			if (existingCount) {
				existingCount.remove();
			}
			
			// Add thumbnail if block exists
			if (block && block !== BLOCK.AIR) {
				// Get actual block from ItemStack if using item system
				var actualBlock = block;
				if (block instanceof ItemStack) {
					if (block.item && block.item.blockId !== undefined && block.item.blockId !== null) {
						actualBlock = BLOCK.fromId(block.item.blockId);
						if (!actualBlock && block.item.data && block.item.data.block) {
							actualBlock = block.item.data.block;
						}
					} else if (block.item && block.item.type === ITEM_TYPE.BLOCK && block.item.data && block.item.data.block) {
						actualBlock = block.item.data.block;
					}
				}
				
				if (actualBlock && actualBlock !== BLOCK.AIR) {
					var thumb = this.renderBlockThumbnail(actualBlock, 16);
					thumb.className = "block-thumbnail";
					slot.appendChild(thumb);
					
					// Show count if ItemStack has more than 1
					if (block instanceof ItemStack && block.count > 1) {
						var countEl = document.createElement("div");
						countEl.className = "item-count";
						countEl.textContent = block.count;
						slot.appendChild(countEl);
					}
				}
			}
			
			// Set up click handler for manual organization
			slot.onclick = function(e) {
				var slotIndex = parseInt(this.getAttribute("data-inv-slot"));
				pl.handleSlotClick('hotbar', slotIndex, e);
			};
		}
}

// Block to thumbnail image filename mapping
var BLOCK_PRE_RENDERED_MAP = {
	2: 'dirt.png', // DIRT
	3: 'Oak_block.png', // WOOD
	4: 'dynamite.png', // TNT
	5: 'bookshelf.png', // BOOKCASE
	7: 'oak_planks.png', // PLANK
	8: 'coblestone.png', // COBBLESTONE
	9: 'stone.png', // CONCRETE (using stone as fallback)
	10: 'stone_bricks.png', // BRICK
	11: 'Arena.png', // SAND
	12: 'gravel.png', // GRAVEL
	13: 'iron_ore.png', // IRON
	14: 'gold_ore.png', // GOLD
	15: 'diamond_ore.png', // DIAMOND
	16: 'Obsidian.png', // OBSIDIAN
	17: 'cristal_pane.png', // GLASS
	18: 'stone.png', // SPONGE (using stone as fallback - need sponge image)
	19: 'leaves.png', // LEAVES
	22: 'bedrock.png', // BEDROCK
	23: 'grass_block.png', // GRASS (using Césped which is Spanish for grass)
	24: 'oak_stairs.png', // PLANKS_STAIRS (using oak_stairs as fallback)
	25: 'white_wool.png' // WOOL (need wool image)
};

// getBlockPreRenderedFilename( block )
//
// Gets the pre-rendered image filename for a block, or null if not found.

function getBlockPreRenderedFilename(block)
{
	if (!block || !block.id) return null;
	
	// Check direct ID mapping
	if (BLOCK_PRE_RENDERED_MAP[block.id]) {
		return BLOCK_PRE_RENDERED_MAP[block.id];
	}
	
	// Try to find by block name
	for (var prop in BLOCK) {
		if (BLOCK.hasOwnProperty(prop) && BLOCK[prop] === block) {
			// Convert property name to filename format
			var filename = prop.toLowerCase().replace(/_/g, '_') + '.png';
			return filename;
		}
	}
	
	return null;
}

// renderBlockThumbnail( block, size )
//
// Renders a block thumbnail using pre-rendered images from media/thumbnails/ folder.
// Falls back to 3D rendering if thumbnail image is not available.

Player.prototype.renderBlockThumbnail = function(block, size)
{
	// Try to get pre-rendered image filename
	var filename = getBlockPreRenderedFilename(block);
	
	if (filename) {
		// Create image element
		var img = document.createElement('img');
		img.src = 'media/thumbnails/' + filename;
		img.style.width = size + 'px';
		img.style.height = size + 'px';
		img.style.imageRendering = 'pixelated';
		img.style.display = 'block';
		img.alt = 'Block thumbnail';
		
		// Handle load errors - fallback to 3D rendering
		img.onerror = function() {
			console.warn('Thumbnail image not found: ' + filename + ', falling back to 3D rendering');
			// Replace with canvas if image fails to load
			var canvas = this.renderBlock3D(block, size);
			if (img.parentNode) {
				img.parentNode.replaceChild(canvas, img);
			}
		}.bind(this);
		
		return img;
	}
	
	// Fallback to 3D rendering if no pre-rendered image mapping
	return this.renderBlock3D(block, size);
}

// renderBlock3D( block, size )
//
// Renders a block in 3D isometric perspective using canvas and terrain.png.
// Draws 3 visible faces: top, front, and right side in isometric view.

Player.prototype.renderBlock3D = function(block, size)
{
	var canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	var ctx = canvas.getContext("2d");
	
	// Load terrain.png
	var img = new Image();
	img.onload = function() {
		ctx.imageSmoothingEnabled = false; // Pixelated rendering
		
		// Minecraft inventory block preview - isometric projection
		// Standard isometric: 2:1 ratio (26.565 degrees)
		var isoAngle = Math.atan(0.5); // ~26.565 degrees
		var cosAngle = Math.cos(isoAngle); // ~0.8944
		var sinAngle = Math.sin(isoAngle); // ~0.4472
		
		// Block size - use most of canvas
		var blockSize = size * 0.8;
		var halfSize = blockSize / 2;
		
		// Center of canvas
		var centerX = size / 2;
		var centerY = size / 2;
		
		// Get texture coordinates for each face (same as render.js)
		var topTex = block.texture(null, null, true, 0, 0, 0, DIRECTION.UP);
		var frontTex = block.texture(null, null, true, 0, 0, 0, DIRECTION.FORWARD);
		var rightTex = block.texture(null, null, true, 0, 0, 0, DIRECTION.RIGHT);
		
		// Convert normalized coordinates to pixel coordinates
		var texWidth = img.width;
		var texHeight = img.height;
		
		function getTexPixels(texCoords) {
			var u_min = texCoords[0] * texWidth;
			var v_min = texCoords[1] * texHeight;
			var u_max = texCoords[2] * texWidth;
			var v_max = texCoords[3] * texHeight;
			var texSize = u_max - u_min;
			return { u_min: u_min, v_min: v_min, texSize: texSize };
		}
		
		var topPixels = getTexPixels(topTex);
		var frontPixels = getTexPixels(frontTex);
		var rightPixels = getTexPixels(rightTex);
		
		// Isometric projection: standard 2:1 ratio
		// Draw order: back to front (right, front, top)
		// In isometric: X axis goes right-up, Z axis goes left-up, Y axis is vertical
		
		// Isometric offsets (2:1 ratio)
		// For a cube in isometric: horizontal offset = size/2, vertical offset = size/4
		var isoX = halfSize; // Horizontal offset for isometric
		var isoY = halfSize * 0.5; // Vertical offset for isometric (2:1 ratio)
		
		// 1. RIGHT FACE (X+1 direction) - draw first (furthest back)
		ctx.save();
		// Position: right side of cube in isometric view
		ctx.translate(centerX + isoX * 0.5, centerY + isoY);
		// Rotate to match isometric perspective (tilted to the right)
		ctx.rotate(Math.PI / 2 - isoAngle);
		// Scale vertically to compress for isometric
		ctx.scale(1, cosAngle);
		// Draw right face
		ctx.drawImage(
			img,
			rightPixels.u_min, rightPixels.v_min, rightPixels.texSize, rightPixels.texSize,
			-halfSize, -halfSize, blockSize, blockSize
		);
		ctx.restore();
		
		// 2. FRONT FACE (Z-1 direction) - draw second (middle layer)
		ctx.save();
		// Position: front side of cube in isometric view
		ctx.translate(centerX - isoX * 0.5, centerY + isoY);
		// Rotate to match isometric perspective (tilted to the left)
		ctx.rotate(-Math.PI / 2 + isoAngle);
		// Scale vertically to compress for isometric
		ctx.scale(1, cosAngle);
		// Draw front face
		ctx.drawImage(
			img,
			frontPixels.u_min, frontPixels.v_min, frontPixels.texSize, frontPixels.texSize,
			-halfSize, -halfSize, blockSize, blockSize
		);
		ctx.restore();
		
		// 3. TOP FACE (Y+1 direction) - draw last (frontmost)
		ctx.save();
		// Position: top of cube (centered, slightly above)
		ctx.translate(centerX, centerY - isoY * 0.4);
		
		// Create diamond shape for top face in isometric projection
		// The diamond has 4 vertices matching the isometric view
		ctx.beginPath();
		ctx.moveTo(0, -isoY); // Top vertex (north)
		ctx.lineTo(isoX * 0.5, 0); // Right vertex (east)
		ctx.lineTo(0, isoY); // Bottom vertex (south)
		ctx.lineTo(-isoX * 0.5, 0); // Left vertex (west)
		ctx.closePath();
		ctx.clip();
		
		// Draw top texture (rotate 45 degrees to align with diamond)
		ctx.save();
		ctx.rotate(Math.PI / 4); // 45 degree rotation
		ctx.scale(1.414, 1.414); // Scale by sqrt(2) to cover entire diamond
		ctx.drawImage(
			img,
			topPixels.u_min, topPixels.v_min, topPixels.texSize, topPixels.texSize,
			-halfSize, -halfSize, blockSize, blockSize
		);
		ctx.restore();
		ctx.restore();
	};
	img.src = "media/terrain.png";
	
	return canvas;
}

// toggleInventory()
//
// Opens or closes the inventory. Game does not pause when inventory is open.
// Inventory releases pointer lock to allow mouse interaction, but game continues running.
// In creative mode, opens/closes the creative inventory instead.

Player.prototype.toggleInventory = function()
{
	// In creative mode, toggle creative inventory instead
	if (this.gameMode === GAME_MODE.CREATIVE) {
		var creativeInventory = document.getElementById("creativeInventory");
		if (!creativeInventory) return;
		
		var isOpen = creativeInventory.style.display !== "none";
		if (isOpen) {
			this.closeCreativeInventory();
		} else {
			this.openCreativeInventory();
		}
		return;
	}
	
	// In survival mode, toggle normal inventory
	var inventory = document.getElementById("inventory");
	if (!inventory) return;
	
	this.inventoryOpen = !this.inventoryOpen;
	
	if (this.inventoryOpen) {
		inventory.style.display = "flex";
		// Add class to body to hide health/armor icons when inventory is open
		document.body.classList.add("inventory-open");
		// Clear all keys to prevent movement while inventory is open
		// This prevents keys from being "stuck" when inventory is opened
		this.keys = {};
		// Clear dragged slot when opening inventory
		this.draggedSlot = null;
		// Update inventory display (main grid and hotbar)
		this.updateInventoryDisplay();
		// Resume rendering the miniature player model
		if (this.inventoryPlayerModelRenderer) {
			this.inventoryPlayerModelRenderer.resumeRenderLoop();
		// Render immediately when opening inventory
			if (this.inventoryPlayerModelRenderer.modelYaw !== undefined && this.inventoryPlayerModelRenderer.modelPitch !== undefined) {
				this.inventoryPlayerModelRenderer.render(this.inventoryPlayerModelRenderer.modelYaw, this.inventoryPlayerModelRenderer.modelPitch);
		} else {
				this.inventoryPlayerModelRenderer.render(0, 0);
			}
		}
		// Release pointer lock to allow mouse interaction with inventory
		// The pointerlockchange listener will check inventoryOpen and won't pause the game
		if (this.pointerLocked) {
			document.exitPointerLock();
		}
		// Disable pointer events on canvas so clicks go to inventory
		if (this.canvas) {
			this.canvas.style.pointerEvents = "none";
		}
	} else {
		inventory.style.display = "none";
		// Remove class from body to show health/armor icons when inventory is closed
		document.body.classList.remove("inventory-open");
		// Clear dragged slot when closing inventory
		this.draggedSlot = null;
		// Pause rendering the miniature player model (don't stop completely, just pause)
		if (this.inventoryPlayerModelRenderer) {
			this.inventoryPlayerModelRenderer.pauseRenderLoop();
		}
		// Re-enable pointer events on canvas
		if (this.canvas) {
			this.canvas.style.pointerEvents = "auto";
		}
		// Request pointer lock when closing inventory (to resume game control)
		if (this.canvas && !this.pointerLocked) {
			this.canvas.requestPointerLock();
		}
	}
}

// on( event, callback )
//
// Hook a player event.

Player.prototype.on = function( event, callback )
{
	this.eventHandlers[event] = callback;
}

// onKeyEvent( keyCode, down )
//
// Hook for keyboard input.

Player.prototype.onKeyEvent = function( keyCode, down )
{
	var key = String.fromCharCode( keyCode ).toLowerCase();
	
	// If inventory is open, only process E and Esc keys
	if (this.inventoryOpen) {
		// Check if creative inventory is open
		var creativeInventory = document.getElementById("creativeInventory");
		var isCreativeInventoryOpen = creativeInventory && creativeInventory.style.display !== "none";
		
		// Inventory toggle (E key)
		if ( !down && (keyCode == 69 || key == "e") ) {
			if (isCreativeInventoryOpen) {
				this.closeCreativeInventory();
			} else {
				this.toggleInventory();
			}
		}
		// ESC key to close inventory
		if ( !down && keyCode == 27 ) {
			if (isCreativeInventoryOpen) {
				this.closeCreativeInventory();
			} else {
				this.toggleInventory();
			}
		}
		// Don't process any other keys when inventory is open
		return;
	}
	
	// Normal key processing when inventory is closed
	this.keys[key] = down;
	this.keys[keyCode] = down;

	if ( !down && key == "t" && this.eventHandlers["openChat"] ) this.eventHandlers.openChat();
	
	// Inventory toggle (E key)
	if ( !down && (keyCode == 69 || key == "e") ) {
		this.toggleInventory();
	}
	
	// Camera perspective toggle (F5 key - keyCode 116)
	// Desactivado en modo espectador (solo primera persona)
	if ( !down && keyCode == 116 ) {
		if (this.spectatorMode) {
			// En modo espectador, solo permitir primera persona
			this.cameraMode = 1;
			console.log('Modo de cámara: Primera persona (modo espectador activo)');
		} else {
			this.cameraMode = (this.cameraMode % 3) + 1; // Cicla entre 1, 2, 3
			console.log('Modo de cámara: ' + (this.cameraMode === 1 ? 'Primera persona' : this.cameraMode === 2 ? 'Segunda persona' : 'Tercera persona'));
		}
	}
	
	// Hotbar selection (1-9 keys)
	if ( !down ) {
		if ( keyCode >= 49 && keyCode <= 57 ) { // Keys 1-9
			var slotIndex = keyCode - 49; // 0-8
				this.selectHotbarSlot(slotIndex);
		}
	}
	
	if ( !down && keyCode == 27 ) { // ESC key
		if (this.pointerLocked) {
			document.exitPointerLock();
		} else if (typeof pauseGame === 'function') {
			pauseGame();
		}
	}
}

// onMouseEvent( x, y, type, rmb )
//
// Hook for mouse input.

Player.prototype.onMouseEvent = function( x, y, type, rmb )
{
	if ( type == MOUSE.DOWN ) {
		this.dragStart = { x: x, y: y };
		this.mouseDown = true;
		this.yawStart = this.targetYaw = this.angles[1];
		this.pitchStart = this.targetPitch = this.angles[0];
	} else if ( type == MOUSE.UP ) {
		if ( Math.abs( this.dragStart.x - x ) + Math.abs( this.dragStart.y - y ) < 4 )
			this.doBlockAction( x, y, !rmb );

		this.dragging = false;
		this.mouseDown = false;
		this.canvas.style.cursor = "default";
	} else if ( type == MOUSE.MOVE && this.mouseDown ) {
		this.dragging = true;
		this.targetPitch = this.pitchStart - ( y - this.dragStart.y ) / 200;
		this.targetYaw = this.yawStart + ( x - this.dragStart.x ) / 200;

		this.canvas.style.cursor = "move";
	}
}

// onMouseMove( deltaX, deltaY )
//
// Hook for mouse movement in pointer lock mode.

Player.prototype.onMouseMove = function( deltaX, deltaY )
{
	this.targetPitch = this.angles[0] - deltaY / 200;
	this.targetYaw = this.angles[1] + deltaX / 200;
	this.dragging = true;
}

// raycast( start, direction, maxDistance )
//
// Lanza un rayo desde start en la dirección direction y devuelve el primer bloque sólido con el que choca.
// Usa el algoritmo DDA (Digital Differential Analyzer) para detectar bloques de forma eficiente.
// Ejes: X y Z = horizontal, Y = vertical (altura)
// direction debe ser un Vector normalizado
// maxDistance es la distancia máxima del rayo (por defecto 5 bloques)

Player.prototype.raycast = function( start, direction, maxDistance )
{
	maxDistance = maxDistance || 5.0;
	var world = this.world;
	
	// Normalizar dirección
	var dirLen = Math.sqrt( direction.x * direction.x + direction.y * direction.y + direction.z * direction.z );
	if ( dirLen < 0.0001 ) return false;
	
	var dx = direction.x / dirLen;
	var dy = direction.y / dirLen;
	var dz = direction.z / dirLen;
	
	// Posición actual del rayo
	var x = start.x;
	var y = start.y;
	var z = start.z;
	
	// Bloque actual
	var blockX = Math.floor( x );
	var blockY = Math.floor( y );
	var blockZ = Math.floor( z );
	
	// Calcular el paso y la distancia hasta el siguiente borde en cada eje
	var stepX = dx > 0 ? 1 : -1;
	var stepY = dy > 0 ? 1 : -1;
	var stepZ = dz > 0 ? 1 : -1;
	
	var tMaxX = dx != 0 ? ( ( blockX + ( dx > 0 ? 1 : 0 ) ) - x ) / dx : Infinity;
	var tMaxY = dy != 0 ? ( ( blockY + ( dy > 0 ? 1 : 0 ) ) - y ) / dy : Infinity;
	var tMaxZ = dz != 0 ? ( ( blockZ + ( dz > 0 ? 1 : 0 ) ) - z ) / dz : Infinity;
	
	var tDeltaX = dx != 0 ? stepX / dx : Infinity;
	var tDeltaY = dy != 0 ? stepY / dy : Infinity;
	var tDeltaZ = dz != 0 ? stepZ / dz : Infinity;
	
	var normalX = 0, normalY = 0, normalZ = 0;
	
	while ( true )
	{
		// Verificar límites del mundo
		if ( blockX < 0 || blockX >= world.sx || 
		     blockY < 0 || blockY >= world.sy || 
		     blockZ < 0 || blockZ >= world.sz )
		{
			break; // Fuera de límites
		}
		
		// Calcular la distancia actual
		var t = Math.min( tMaxX, Math.min( tMaxY, tMaxZ ) );
		if ( t > maxDistance ) break; // Excedimos la distancia máxima
		
		var block = world.getBlock( blockX, blockY, blockZ );
		
		// Si encontramos un bloque sólido (puede ser transparente o no, pero no AIR)
		// Los bloques transparentes como glass y leaves también deben ser detectables para destrucción
		if ( block != BLOCK.AIR && block )
		{
			return {
				x: blockX,
				y: blockY,
				z: blockZ,
				n: new Vector( normalX, normalY, normalZ )
			};
		}
		
		// Avanzar al siguiente bloque usando DDA
		if ( tMaxX < tMaxY && tMaxX < tMaxZ )
		{
			// Cruzamos un borde en X
			blockX += stepX;
			normalX = -stepX;
			normalY = 0;
			normalZ = 0;
			tMaxX += tDeltaX;
		}
		else if ( tMaxY < tMaxZ )
		{
			// Cruzamos un borde en Y
			blockY += stepY;
			normalX = 0;
			normalY = -stepY;
			normalZ = 0;
			tMaxY += tDeltaY;
		}
		else
		{
			// Cruzamos un borde en Z
			blockZ += stepZ;
			normalX = 0;
			normalY = 0;
			normalZ = -stepZ;
			tMaxZ += tDeltaZ;
		}
	}
	
	return false; // No se encontró ningún bloque
}

// doBlockAction( x, y )
//
// Called to perform an action based on the player's block selection and input.

Player.prototype.doBlockAction = function( x, y, destroy )
{
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// Usar raycasting en lugar de pickAt para mayor confiabilidad
	var eyePos = this.getEyePos();
	var pitch = this.angles[0]; // Ángulo vertical (hacia arriba/abajo)
	var yaw = this.angles[1];   // Ángulo horizontal (rotación alrededor del eje Y)
	
	// Calcular dirección del rayo
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// yaw: 0 = Norte (hacia -Z), PI/2 = Este (hacia +X), PI = Sur (hacia +Z), 3*PI/2 = Oeste (hacia -X)
	var cosPitch = Math.cos( pitch );
	var sinPitch = Math.sin( pitch );
	var cosYaw = Math.cos( yaw );
	var sinYaw = Math.sin( yaw );
	
	// Dirección del rayo: [x, y, z] donde y es altura
	var direction = new Vector(
		cosPitch * sinYaw,      // X: horizontal
		sinPitch,               // Y: altura (vertical)
		cosPitch * cosYaw       // Z: horizontal
	);
	
	// Lanzar el rayo (máximo 5 bloques de distancia)
	var block = this.raycast( eyePos, direction, 5.0 );

	if ( block != false )
	{
		var obj = this.client ? this.client : this.world;

		if ( destroy )
		{
			// In creative mode, break instantly
			if (this.gameMode === GAME_MODE.CREATIVE) {
				obj.setBlock( block.x, block.y, block.z, BLOCK.AIR );
			}
			// In survival mode, breaking is handled by startBreakingBlock() and updateBreakingProgress()
			// This destroy action is now handled by mouse down event
			// Stop any breaking when destroy action is triggered
			if (this.breakingBlock) {
				this.stopBreakingBlock();
			}
		}
		else
		{
			// Stop any breaking in progress when placing a block
			if (this.breakingBlock) {
				this.stopBreakingBlock();
			}
			
			// Calcular la posición donde se colocará el bloque
			// Ejes: X y Z = horizontal, Y = vertical (altura)
			// La normal apunta hacia la dirección donde se debe colocar el bloque
			var placeX = Math.floor( block.x + block.n.x );
			var placeY = Math.floor( block.y + block.n.y );
			var placeZ = Math.floor( block.z + block.n.z );
			
			// Verificar que las coordenadas estén dentro de los límites del mundo
			if ( placeX < 0 || placeX >= world.sx || 
			     placeY < 0 || placeY >= world.sy || 
			     placeZ < 0 || placeZ >= world.sz ) {
				return; // Fuera de los límites del mundo
			}
			
			// Verificar que el lugar donde se va a colocar esté vacío (AIR)
			if ( world.getBlock( placeX, placeY, placeZ ) != BLOCK.AIR ) {
				return; // Ya hay un bloque en esa posición
			}
			
			// Verificar si el bloque se colocaría dentro de la hitbox del jugador
			// Hitbox del jugador: tamaño 0.25 en X y Z (horizontal), altura 1.7 en Y
			var playerSize = 0.25;
			var playerHeight = 1.7;
			var playerMinX = this.pos.x - playerSize;
			var playerMaxX = this.pos.x + playerSize;
			var playerMinY = this.pos.y; // Y es altura
			var playerMaxY = this.pos.y + playerHeight;
			var playerMinZ = this.pos.z - playerSize; // Z es horizontal
			var playerMaxZ = this.pos.z + playerSize;
			
			// El bloque ocupa desde (placeX, placeY, placeZ) hasta (placeX+1, placeY+1, placeZ+1)
			// placeY es altura, placeX y placeZ son horizontales
			var blockMinX = placeX;
			var blockMaxX = placeX + 1;
			var blockMinY = placeY; // Y es altura
			var blockMaxY = placeY + 1;
			var blockMinZ = placeZ; // Z es horizontal
			var blockMaxZ = placeZ + 1;
			
			// Verificar intersección entre la hitbox del jugador y el bloque a colocar
			var intersects = ( playerMaxX > blockMinX && playerMinX < blockMaxX &&
			                   playerMaxY > blockMinY && playerMinY < blockMaxY &&
			                   playerMaxZ > blockMinZ && playerMinZ < blockMaxZ );
			
			// Si hay intersección, no permitir colocar el bloque
			if ( intersects ) {
				return; // No colocar el bloque dentro del jugador
			}
			
			// Stop any breaking before placing a block (reset breaking state)
			this.stopBreakingBlock();
			
			// Get the actual block to place (ensure it's correct)
			var blockToPlace = this.getSelectedBlock();
			if (!blockToPlace || blockToPlace === BLOCK.AIR) {
				return; // No block to place
			}
			
			// Colocar el bloque
			obj.setBlock( placeX, placeY, placeZ, blockToPlace );
			
			// Consume item from ItemStack if using item system
			var selectedSlot = this.hotbar[this.selectedHotbarSlot];
			if (selectedSlot instanceof ItemStack && !selectedSlot.isEmpty()) {
				selectedSlot.remove(1);
				if (selectedSlot.isEmpty()) {
					this.hotbar[this.selectedHotbarSlot] = null;
				}
				this.updateHotbarDisplay();
				// Update buildMaterial after consuming
				this.buildMaterial = this.getSelectedBlock() || BLOCK.AIR;
			}
		}
	}
}

// doBlockActionAtCenter()
//
// Called to perform an action at the center of the screen (crosshair position).

Player.prototype.doBlockActionAtCenter = function( destroy )
{
	var canvas = this.canvas;
	var centerX = canvas.width / 2;
	var centerY = canvas.height / 2;
	this.doBlockAction( centerX, centerY, destroy );
}

// startBreakingBlock()
//
// Starts breaking the block at the center of the screen (survival mode only).

Player.prototype.startBreakingBlock = function()
{
	// In creative mode, break instantly
	if (this.gameMode === GAME_MODE.CREATIVE) {
		this.doBlockActionAtCenter(true);
		return;
	}
	
	// In survival mode, start progressive breaking
	var eyePos = this.getEyePos();
	var pitch = this.angles[0];
	var yaw = this.angles[1];
	
	var cosPitch = Math.cos(pitch);
	var sinPitch = Math.sin(pitch);
	var cosYaw = Math.cos(yaw);
	var sinYaw = Math.sin(yaw);
	
	var direction = new Vector(
		cosPitch * sinYaw,
		sinPitch,
		cosPitch * cosYaw
	);
	
	// Raycast to find block
	var block = this.raycast(eyePos, direction, 5.0);
	
	if (block && block != false) {
		var blockKey = block.x + "," + block.y + "," + block.z;
		var currentBlock = this.world.getBlock(block.x, block.y, block.z);
		
		// Can't break air
		if (!currentBlock || currentBlock === BLOCK.AIR) {
			this.stopBreakingBlock();
			return;
		}
		
		// Check if block is breakable (unless in creative mode)
		if (this.gameMode === GAME_MODE.SURVIVAL && currentBlock.breakable === false) {
			this.stopBreakingBlock();
			return; // Can't break non-breakable blocks in survival
		}
		
		// If breaking a different block, reset progress
		if (!this.breakingBlock || this.breakingBlock.x !== block.x || 
		    this.breakingBlock.y !== block.y || this.breakingBlock.z !== block.z) {
			this.breakingBlock = { x: block.x, y: block.y, z: block.z, block: currentBlock };
			this.breakingProgress = 0;
			this.breakingStartTime = Date.now();
		}
		
		this.lastBreakTarget = { x: block.x, y: block.y, z: block.z };
	}
}

// stopBreakingBlock()
//
// Stops breaking the current block and resets progress.

Player.prototype.stopBreakingBlock = function()
{
	this.breakingBlock = null;
	this.breakingProgress = 0;
	this.lastBreakTarget = null;
}

// updateBreakingProgress( delta )
//
// Updates the breaking progress for the current block (called every frame).

Player.prototype.updateBreakingProgress = function(delta)
{
	// Only break in survival mode
	if (this.gameMode !== GAME_MODE.SURVIVAL) {
		return;
	}
	
	// Check if mouse is still down and we're breaking a block
	if (!this.isMouseDown || !this.breakingBlock) {
		// Reset if mouse is not down
		if (!this.isMouseDown) {
			this.stopBreakingBlock();
		}
		return;
	}
	
	// Check if we're still looking at the same block
	var eyePos = this.getEyePos();
	var pitch = this.angles[0];
	var yaw = this.angles[1];
	
	var cosPitch = Math.cos(pitch);
	var sinPitch = Math.sin(pitch);
	var cosYaw = Math.cos(yaw);
	var sinYaw = Math.sin(yaw);
	
	var direction = new Vector(
		cosPitch * sinYaw,
		sinPitch,
		cosPitch * cosYaw
	);
	
	var block = this.raycast(eyePos, direction, 5.0);
	
	// If not looking at the same block, reset
	if (!block || block == false || 
	    block.x !== this.breakingBlock.x || 
	    block.y !== this.breakingBlock.y || 
	    block.z !== this.breakingBlock.z) {
		this.stopBreakingBlock();
		return;
	}
	
	// Check if block still exists
	var currentBlock = this.world.getBlock(this.breakingBlock.x, this.breakingBlock.y, this.breakingBlock.z);
	if (!currentBlock || currentBlock === BLOCK.AIR) {
		this.stopBreakingBlock();
		return;
	}
	
	// Update progress (breaktime determines break speed in milliseconds)
	// Default breaktime is 1000ms (1 second to break)
	var breaktime = 1000;
	if (currentBlock.breaktime !== undefined) {
		breaktime = currentBlock.breaktime;
	} else if (currentBlock.hardness !== undefined) {
		// Fallback to hardness (convert to milliseconds)
		breaktime = currentBlock.hardness * 1000;
	}
	
	// Progress per second = 1000 / breaktime (breaktime in ms)
	var progressPerSecond = 1000.0 / breaktime;
	this.breakingProgress += progressPerSecond * delta;
	
	// Break the block when progress reaches 1.0
	if (this.breakingProgress >= 1.0) {
		var obj = this.client ? this.client : this.world;
		obj.setBlock(this.breakingBlock.x, this.breakingBlock.y, this.breakingBlock.z, BLOCK.AIR);
		
		// Drop item
		this.dropBlockItem(this.breakingBlock.block, this.breakingBlock.x, this.breakingBlock.y, this.breakingBlock.z);
		
		// Reset breaking
		this.stopBreakingBlock();
	}
}

// dropBlockItem( block, x, y, z )
//
// Drops an item entity when a block is broken.

Player.prototype.dropBlockItem = function(block, x, y, z)
{
	if (!block || !block.spawnable || block === BLOCK.AIR) {
		return; // Can't drop air or non-spawnable blocks
	}
	
	if (!this.world || !this.world.addEntity) {
		return; // World doesn't support entities
	}
	
	// Create ItemStack for the block
	// Always use the registered item from ITEM_REGISTRY to ensure consistency
	var item = ITEM_REGISTRY.getByBlock(block);
	if (!item) {
		// Block doesn't have an item registered, try to find it in ITEM global object
		// by matching the BLOCK property name
		for (var prop in BLOCK) {
			if (BLOCK.hasOwnProperty(prop) && BLOCK[prop] === block) {
				if (typeof ITEM !== 'undefined' && ITEM[prop]) {
					item = ITEM[prop];
					break;
				}
			}
		}
		
		// If still not found, create and register a new one
		if (!item) {
			// Use blockId as parameter to ensure it's set correctly
			item = new Item(block.id, block.name || "Block", ITEM_TYPE.BLOCK, { 
				block: block, 
				blockId: block.id, // Store block ID in data too
				maxStack: 64 
			}, block.id); // Also pass blockId as parameter
			
			// Register it so future drops use the same instance
			ITEM_REGISTRY.register(item);
			
			// Also store in ITEM global object
			for (var prop in BLOCK) {
				if (BLOCK.hasOwnProperty(prop) && BLOCK[prop] === block) {
					if (typeof ITEM !== 'undefined') {
						ITEM[prop] = item;
					}
					break;
				}
			}
		}
	}
	
	var itemStack = new ItemStack(item, 1);
	
	// Create ItemEntity
	var itemEntity = new ItemEntity(null, itemStack, this.world);
	
	// Position at block center with slight random offset
	itemEntity.pos = new Vector(
		x + 0.5 + (Math.random() - 0.5) * 0.3,
		y + 0.5,
		z + 0.5 + (Math.random() - 0.5) * 0.3
	);
	
	// Add small random velocity
	itemEntity.velocity = new Vector(
		(Math.random() - 0.5) * 0.1,
		0.1 + Math.random() * 0.1,
		(Math.random() - 0.5) * 0.1
	);
	
	// Add to world
	this.world.addEntity(itemEntity);
}

// getEyePos()
//
// Returns the position of the eyes of the player for rendering.

Player.prototype.getEyePos = function()
{
	// En modo espectador, siempre usar primera persona (sin offset de altura)
	if ( this.spectatorMode ) {
		return this.pos;
	}
	
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	var eyePos = this.pos.add( new Vector( 0.0, 1.7, 0.0 ) );
	
	// Ajustar posición de la cámara según el modo de perspectiva
	// En modo espectador, solo primera persona está permitida
	if ( this.cameraMode === 1 ) {
		// Primera persona: cámara en los ojos del jugador
		return eyePos;
	} else if ( this.cameraMode === 2 ) {
		// Segunda persona: cámara detrás del jugador, conectada rígidamente a la cabeza
		// Como si hubiera un fierro invisible entre la cabeza y la cámara
		// Si la cabeza baja, la cámara sube (y viceversa)
		var yaw = this.angles[1];
		var pitch = this.angles[0];
		var distance = 2.0; // Distancia fija desde la cabeza
		
		// Calcular posición horizontal basada en yaw
		// La cámara está detrás del jugador (opuesta a donde mira)
		// yawOffset = PI para estar detrás del jugador
		var yawOffset = Math.PI;
		var adjustedYaw = yaw + yawOffset;
		
		// Calcular posición horizontal (X, Z)
		// Ejes: X y Z = horizontal, Y = vertical (altura)
		// El sistema usa: Math.cos(Math.PI/2 - yaw) para X y Math.sin(Math.PI/2 - yaw) para Z
		var cosPitch = Math.cos( pitch );
		var offsetX = Math.cos( Math.PI / 2 - adjustedYaw ) * distance * cosPitch;
		var offsetZ = Math.sin( Math.PI / 2 - adjustedYaw ) * distance * cosPitch;
		
		// Calcular posición vertical: si la cabeza baja (pitch negativo), la cámara sube (offsetY positivo)
		// El pitch se invierte para que la cámara esté en el extremo opuesto
		var offsetY = -Math.sin( pitch ) * distance;
		
		// La cabeza está en pos.y + 1.7, la cámara está a offsetY de esa altura
		return this.pos.add( new Vector( offsetX, 1.7 + offsetY, offsetZ ) );
	} else if ( this.cameraMode === 3 ) {
		// Tercera persona: cámara delante del jugador, conectada rígidamente a la cabeza
		// Como si hubiera un fierro invisible entre la cabeza y la cámara (de frente a Steve)
		// Si la cabeza baja, la cámara también baja (pero la cámara mira hacia arriba)
		var yaw = this.angles[1];
		var pitch = this.angles[0];
		var distance = 2.5; // 1/4 más lejos que segunda persona (2.0 * 1.25 = 2.5)
		
		// Calcular posición horizontal basada en yaw
		// La cámara está delante del jugador (en la dirección donde mira)
		// yawOffset = 0 para estar delante del jugador
		var yawOffset = 0;
		var adjustedYaw = yaw + yawOffset;
		
		// Calcular posición horizontal (X, Z)
		// Ejes: X y Z = horizontal, Y = vertical (altura)
		// El sistema usa: Math.cos(Math.PI/2 - yaw) para X y Math.sin(Math.PI/2 - yaw) para Z
		var cosPitch = Math.cos( pitch );
		var offsetX = Math.cos( Math.PI / 2 - adjustedYaw ) * distance * cosPitch;
		var offsetZ = Math.sin( Math.PI / 2 - adjustedYaw ) * distance * cosPitch;
		
		// Calcular posición vertical: si la cabeza baja (pitch negativo), la cámara también baja (offsetY negativo)
		// NO se invierte el pitch, la cámara sigue el movimiento de la cabeza
		var offsetY = Math.sin( pitch ) * distance;
		
		// La cabeza está en pos.y + 1.7, la cámara está a offsetY de esa altura
		return this.pos.add( new Vector( offsetX, 1.7 + offsetY, offsetZ ) );
	}
	
	return eyePos;
}

// update()
//
// Updates this local player (gravity, movement)

Player.prototype.update = function()
{
	var world = this.world;
	var velocity = this.velocity;
	var pos = this.pos;
	var bPos = new Vector( Math.floor( pos.x ), Math.floor( pos.y ), Math.floor( pos.z ) );

	if ( this.lastUpdate != null )
	{
		var delta = ( new Date().getTime() - this.lastUpdate ) / 1000;
		
		// Limit delta to prevent large jumps when game is paused/resumed
		// This prevents the player from falling through the world or moving too fast
		var maxDelta = 0.1; // Maximum 100ms delta (10 FPS equivalent)
		if ( delta > maxDelta ) {
			delta = maxDelta;
		}

		// View
		if ( this.dragging )
		{
			this.angles[0] += ( this.targetPitch - this.angles[0] ) * 30 * delta;
			this.angles[1] += ( this.targetYaw - this.angles[1] ) * 30 * delta;
			if ( this.angles[0] < -Math.PI/2 ) this.angles[0] = -Math.PI/2;
			if ( this.angles[0] > Math.PI/2 ) this.angles[0] = Math.PI/2;
		}

		// Modo creativo: no recibir daño ni hambre
		if ( this.gameMode === GAME_MODE.CREATIVE ) {
			this.health = this.maxHealth;
			this.hunger = this.maxHunger;
		}
		
		// Update block breaking progress
		this.updateBreakingProgress(delta);
		
		// Modo espectador: volar libremente sin colisiones ni gravedad
		if ( this.spectatorMode || this.gameMode === GAME_MODE.SPECTATOR )
		{
			// Velocidad de vuelo más rápida
			var flySpeed = 12;
			
			// Movimiento horizontal (WASD)
			// Ejes: X y Z = horizontal, Y = vertical (altura)
			var walkVelocity = new Vector( 0, 0, 0 );
			if ( this.keys["w"] ) {
				walkVelocity.x += Math.cos( Math.PI / 2 - this.angles[1] );
				walkVelocity.z += Math.sin( Math.PI / 2 - this.angles[1] ); // Z es horizontal
			}
			if ( this.keys["s"] ) {
				walkVelocity.x += Math.cos( Math.PI + Math.PI / 2 - this.angles[1] );
				walkVelocity.z += Math.sin( Math.PI + Math.PI / 2 - this.angles[1] ); // Z es horizontal
			}
			if ( this.keys["a"] ) {
				walkVelocity.x += Math.cos( Math.PI / 2 + Math.PI / 2 - this.angles[1] );
				walkVelocity.z += Math.sin( Math.PI / 2 + Math.PI / 2 - this.angles[1] ); // Z es horizontal
			}
			if ( this.keys["d"] ) {
				walkVelocity.x += Math.cos( -Math.PI / 2 + Math.PI / 2 - this.angles[1] );
				walkVelocity.z += Math.sin( -Math.PI / 2 + Math.PI / 2 - this.angles[1] ); // Z es horizontal
			}
			
			// Movimiento vertical (Espacio para subir, Shift para bajar)
			// Ejes: X y Z = horizontal, Y = vertical (altura)
			if ( this.keys[" "] ) {
				walkVelocity.y = 1; // Subir (Y es altura)
			}
			if ( this.keys["Shift"] || this.keys[16] ) {
				walkVelocity.y = -1; // Bajar
			}
			
			// Aplicar velocidad
			// Ejes: X y Z = horizontal, Y = vertical (altura)
			if ( walkVelocity.length() > 0 ) {
				walkVelocity = walkVelocity.normal();
				velocity.x = walkVelocity.x * flySpeed; // X horizontal
				velocity.y = walkVelocity.y * flySpeed; // Y altura
				velocity.z = walkVelocity.z * flySpeed; // Z horizontal
			} else {
				velocity.x /= 1.5;
				velocity.y /= 1.5;
				velocity.z /= 1.5;
			}
			
			// En modo espectador, simplemente mover sin colisiones
			this.pos = pos.add( velocity.mul( delta ) );
			this.falling = false;
		}
		else
		{
			// Modo normal: con gravedad y colisiones
			// Ejes: X y Z = horizontal, Y = vertical (altura)
			// Gravity
			if ( this.falling )
				velocity.y += -0.5; // Y es altura

			// Jumping
			if ( this.keys[" "] && !this.falling )
				velocity.y = 8; // Y es altura

			// Walking
			// Ejes: X y Z = horizontal, Y = vertical (altura)
			var walkVelocity = new Vector( 0, 0, 0 );
			if ( !this.falling )
			{
				if ( this.keys["w"] ) {
					walkVelocity.x += Math.cos( Math.PI / 2 - this.angles[1] );
					walkVelocity.z += Math.sin( Math.PI / 2 - this.angles[1] ); // Z es horizontal
				}
				if ( this.keys["s"] ) {
					walkVelocity.x += Math.cos( Math.PI + Math.PI / 2 - this.angles[1] );
					walkVelocity.z += Math.sin( Math.PI + Math.PI / 2 - this.angles[1] ); // Z es horizontal
				}
				if ( this.keys["a"] ) {
					walkVelocity.x += Math.cos( Math.PI / 2 + Math.PI / 2 - this.angles[1] );
					walkVelocity.z += Math.sin( Math.PI / 2 + Math.PI / 2 - this.angles[1] ); // Z es horizontal
				}
				if ( this.keys["d"] ) {
					walkVelocity.x += Math.cos( -Math.PI / 2 + Math.PI / 2 - this.angles[1] );
					walkVelocity.z += Math.sin( -Math.PI / 2 + Math.PI / 2 - this.angles[1] ); // Z es horizontal
				}
			}
			if ( walkVelocity.length() > 0 ) {
					walkVelocity = walkVelocity.normal();
					velocity.x = walkVelocity.x * 4; // X horizontal
					velocity.z = walkVelocity.z * 4; // Z horizontal
			} else {
				velocity.x /= this.falling ? 1.01 : 1.5;
				velocity.z /= this.falling ? 1.01 : 1.5;
			}

			// Resolve collision
			this.pos = this.resolveCollision( pos, bPos, velocity.mul( delta ) );
		}
		
		// Clamp player position to world bounds to prevent falling through
		// Keep player slightly inside bounds (0.1 margin) to avoid edge cases
		// Ejes: X y Z = horizontal, Y = vertical (altura)
		var margin = 0.1;
		if ( this.pos.x < margin ) this.pos.x = margin;
		if ( this.pos.y < margin ) this.pos.y = margin; // Y es altura
		if ( this.pos.z < margin ) this.pos.z = margin; // Z es horizontal
		if ( this.pos.x > world.sx - 1 - margin ) this.pos.x = world.sx - 1 - margin;
		if ( this.pos.y > world.sy - 1.7 - margin ) { // Y es altura
			this.pos.y = world.sy - 1.7 - margin;
			this.velocity.y = 0; // Y es altura
			this.falling = false;
		}
		if ( this.pos.z > world.sz - 1 - margin ) this.pos.z = world.sz - 1 - margin; // Z es horizontal
	}

	this.lastUpdate = new Date().getTime();
	
	// Update health/hunger icons periodically in survival mode
	if (this.gameMode === GAME_MODE.SURVIVAL) {
		if (!this._lastIconUpdate || (new Date().getTime() - this._lastIconUpdate) > 100) {
			this.updateHealthHungerIcons();
			this._lastIconUpdate = new Date().getTime();
		}
	}
}

// setGameMode( mode )
//
// Sets the game mode (SURVIVAL, CREATIVE, SPECTATOR) and updates UI accordingly.

Player.prototype.setGameMode = function(mode)
{
	if (mode !== GAME_MODE.SURVIVAL && mode !== GAME_MODE.CREATIVE && mode !== GAME_MODE.SPECTATOR) {
		console.error('Invalid game mode: ' + mode);
		return;
	}
	
	this.gameMode = mode;
	
	// Clear inventory when changing game mode
	this.clearInventory();
	
	this.updateGameModeUI();
	
	// Reset health/hunger to max in creative mode
	if (mode === GAME_MODE.CREATIVE) {
		this.health = this.maxHealth;
		this.hunger = this.maxHunger;
	}
	
	// Enable spectator mode for spectator game mode
	this.spectatorMode = (mode === GAME_MODE.SPECTATOR);
}

// updateGameModeUI()
//
// Updates UI elements based on current game mode.

Player.prototype.updateGameModeUI = function()
{
	var hotbar = document.getElementById("hotbar");
	var healthIcons = document.getElementById("healthIcons");
	var hungerIcons = document.getElementById("hungerIcons");
	var creativeInventoryButton = document.getElementById("creativeInventoryButton");
	
	if (!hotbar) return;
	
	// Spectator mode: hide hotbar
	if (this.gameMode === GAME_MODE.SPECTATOR) {
		hotbar.style.display = "none";
		if (healthIcons) healthIcons.style.display = "none";
		if (hungerIcons) hungerIcons.style.display = "none";
		if (creativeInventoryButton) creativeInventoryButton.style.display = "none";
	} else {
		hotbar.style.display = "flex";
	}
	
	// Creative mode: hide status icons, show creative inventory button
	if (this.gameMode === GAME_MODE.CREATIVE) {
		document.body.classList.add("creative-mode");
		if (healthIcons) healthIcons.style.display = "none";
		if (hungerIcons) hungerIcons.style.display = "none";
		if (creativeInventoryButton) creativeInventoryButton.style.display = "block";
	} else {
		document.body.classList.remove("creative-mode");
		if (creativeInventoryButton) creativeInventoryButton.style.display = "none";
	}
	
	// Survival mode: show status icons, hide creative inventory button
	if (this.gameMode === GAME_MODE.SURVIVAL) {
		document.body.classList.add("survival-mode");
		document.body.classList.remove("creative-mode");
		if (healthIcons) {
			healthIcons.style.display = "flex";
		}
		if (hungerIcons) {
			hungerIcons.style.display = "flex";
		}
		if (creativeInventoryButton) creativeInventoryButton.style.display = "none";
		// Update icons after a small delay to ensure DOM is ready
		var pl = this;
		setTimeout(function() {
			pl.updateHealthHungerIcons();
		}, 50);
	} else {
		document.body.classList.remove("survival-mode");
	}
}

// updateHealthHungerIcons()
//
// Updates the health and hunger icons display using icons.png texture.
// Only visible in SURVIVAL mode.

Player.prototype.updateHealthHungerIcons = function()
{
	if (this.gameMode !== GAME_MODE.SURVIVAL) return;
	
	var healthContainer = document.getElementById("healthIcons");
	var hungerContainer = document.getElementById("hungerIcons");
	
	if (!healthContainer || !hungerContainer) return;
	
	// Clear existing icons
	healthContainer.innerHTML = "";
	hungerContainer.innerHTML = "";
	
	// Load icons.png once
	if (!this._iconsImage) {
		this._iconsImage = new Image();
		this._iconsImage.onload = function() {
			if (this.world && this.world.localPlayer) {
				this.world.localPlayer.updateHealthHungerIcons();
			}
		}.bind(this);
		this._iconsImage.src = "media/gui/icons.png";
		return; // Will be called again when image loads
	}
	
	// icons.png texture coordinates for health/hunger
	// Health: full heart at (52, 0), half heart at (61, 0), empty heart at (16, 0)
	// Hunger: full drumstick at (52, 27), half drumstick at (61, 27), empty drumstick at (16, 27)
	// Outline icons (always visible, show max health/hunger):
	// Health outline: (16, 9) - heart outline (white with black border)
	// Hunger outline: (16, 36) - drumstick outline (white with black border)
	// Each icon is 9x9 pixels in the texture
	
	var iconsImg = this._iconsImage;
	var iconSize = 9; // Base size of each icon in icons.png
	
	// Render health icons
	// Each heart represents 2 health points
	var maxHearts = Math.ceil(this.maxHealth / 2); // Maximum hearts (10 for 20 health)
	var currentHealth = Math.max(0, Math.min(this.health, this.maxHealth));
	
	for (var i = 0; i < maxHearts; i++) {
		// Create container for this heart (to layer outline + fill)
		var heartContainer = document.createElement("div");
		heartContainer.className = "health-icon-container";
		
		// 1. Render outline icon (always visible, shows max health)
		var outlineIcon = document.createElement("div");
		outlineIcon.className = "health-icon-outline";
		heartContainer.appendChild(outlineIcon);
		
		// 2. Render filled icon (shows current health)
		var filledIcon = document.createElement("div");
		filledIcon.className = "health-icon-filled";
		
		var heartHealth = currentHealth - (i * 2); // Health for this specific heart
		var texX, texY;
		
		if (heartHealth >= 2) {
			// Full heart
			texX = 52;
			texY = 0;
		} else if (heartHealth >= 1) {
			// Half heart
			texX = 61;
			texY = 0;
		} else {
			// Empty heart (but we still show the outline)
			texX = 16;
			texY = 0;
		}
		
		filledIcon.style.backgroundImage = "url(" + iconsImg.src + ")";
		filledIcon.style.backgroundPosition = "-" + texX + "px -" + texY + "px";
		heartContainer.appendChild(filledIcon);
		
		healthContainer.appendChild(heartContainer);
	}
	
	// Render hunger icons
	// Each drumstick represents 2 hunger points
	var maxHungerIcons = Math.ceil(this.maxHunger / 2); // Maximum drumsticks (10 for 20 hunger)
	var currentHunger = Math.max(0, Math.min(this.hunger, this.maxHunger));
	
	for (var i = 0; i < maxHungerIcons; i++) {
		// Create container for this drumstick (to layer outline + fill)
		var drumstickContainer = document.createElement("div");
		drumstickContainer.className = "hunger-icon-container";
		
		// 1. Render outline icon (always visible, shows max hunger)
		var outlineIcon = document.createElement("div");
		outlineIcon.className = "hunger-icon-outline";
		drumstickContainer.appendChild(outlineIcon);
		
		// 2. Render filled icon (shows current hunger)
		var filledIcon = document.createElement("div");
		filledIcon.className = "hunger-icon-filled";
		
		var hungerAmount = currentHunger - (i * 2); // Hunger for this specific drumstick
		var texX, texY;
		
		if (hungerAmount >= 2) {
			// Full drumstick
			texX = 52;
			texY = 27;
		} else if (hungerAmount >= 1) {
			// Half drumstick
			texX = 61;
			texY = 27;
		} else {
			// Empty drumstick (but we still show the outline)
			texX = 16;
			texY = 27;
		}
		
		filledIcon.style.backgroundImage = "url(" + iconsImg.src + ")";
		filledIcon.style.backgroundPosition = "-" + texX + "px -" + texY + "px";
		drumstickContainer.appendChild(filledIcon);
		
		hungerContainer.appendChild(drumstickContainer);
	}
}

// resolveCollision( pos, bPos, velocity )
//
// Resolves collisions between the player and blocks on XY level for the next movement step.

Player.prototype.resolveCollision = function( pos, bPos, velocity )
{
	var world = this.world;
	
	// El sistema de colisiones original ya maneja las colisiones correctamente
	// Solo necesitamos confiar en él y no agregar verificaciones adicionales que bloqueen el movimiento
	
	// Ejes: X y Z = horizontal, Y = vertical (altura)
	// playerRect usa X y Z para colisiones horizontales
	var playerRect = { x: pos.x + velocity.x, y: pos.z + velocity.z, size: 0.25 };

	// Collect XZ collision sides (horizontal)
	var collisionCandidates = [];

	for ( var x = bPos.x - 1; x <= bPos.x + 1; x++ )
	{
		for ( var y = bPos.y; y <= bPos.y + 1; y++ ) // Y es altura
		{
			for ( var z = bPos.z - 1; z <= bPos.z + 1; z++ ) // Z es horizontal
			{
				if ( world.getBlock( x, y, z ) != BLOCK.AIR )
				{
					if ( world.getBlock( x - 1, y, z ) == BLOCK.AIR ) collisionCandidates.push( { x: x, dir: -1, y1: z, y2: z + 1 } );
					if ( world.getBlock( x + 1, y, z ) == BLOCK.AIR ) collisionCandidates.push( { x: x + 1, dir: 1, y1: z, y2: z + 1 } );
					if ( world.getBlock( x, y, z - 1 ) == BLOCK.AIR ) collisionCandidates.push( { y: z, dir: -1, x1: x, x2: x + 1 } );
					if ( world.getBlock( x, y, z + 1 ) == BLOCK.AIR ) collisionCandidates.push( { y: z + 1, dir: 1, x1: x, x2: x + 1 } );
				}
			}
		}
	}

	// Solve XZ collisions (horizontal)
	for( var i in collisionCandidates )
	{
		var side = collisionCandidates[i];

		if ( lineRectCollide( side, playerRect ) )
		{
			if ( side.x != null && velocity.x * side.dir < 0 ) {
				pos.x = side.x + playerRect.size / 2 * ( velocity.x > 0 ? -1 : 1 );
				velocity.x = 0;
			} else if ( side.y != null && velocity.z * side.dir < 0 ) {
				pos.z = side.y + playerRect.size / 2 * ( velocity.z > 0 ? -1 : 1 );
				velocity.z = 0;
			}
		}
	}

	// playerFace usa X y Z para colisiones verticales (Y es altura)
	var playerFace = { x1: pos.x + velocity.x - 0.125, y1: pos.z + velocity.z - 0.125, x2: pos.x + velocity.x + 0.125, y2: pos.z + velocity.z + 0.125 };
	var newBYLower = Math.floor( pos.y + velocity.y ); // Y es altura
	var newBYUpper = Math.floor( pos.y + 1.7 + velocity.y * 1.1 ); // Y es altura

	// Collect Y collision sides (vertical, altura)
	collisionCandidates = [];

	for ( var x = bPos.x - 1; x <= bPos.x + 1; x++ ) 
	{
		for ( var z = bPos.z - 1; z <= bPos.z + 1; z++ ) // Z es horizontal
		{
			if ( world.getBlock( x, newBYLower, z ) != BLOCK.AIR )
				collisionCandidates.push( { z: newBYLower + 1, dir: 1, x1: x, y1: z, x2: x + 1, y2: z + 1 } );
			if ( world.getBlock( x, newBYUpper, z ) != BLOCK.AIR )
				collisionCandidates.push( { z: newBYUpper, dir: -1, x1: x, y1: z, x2: x + 1, y2: z + 1 } );
		}
	}

	// Solve Y collisions (vertical, altura)
	this.falling = true;
	for ( var i in collisionCandidates )
	{
		var face = collisionCandidates[i];

		if ( rectRectCollide( face, playerFace ) && velocity.y * face.dir < 0 ) // Y es altura
		{
			if ( velocity.y < 0 ) {
				this.falling = false;
				pos.y = face.z; // face.z almacena la altura Y
				velocity.y = 0;
				this.velocity.y = 0;
			} else {
				pos.y = face.z - 1.8; // face.z almacena la altura Y
				velocity.y = 0;
				this.velocity.y = 0;
			}

			break;
		}
	}

	// Return solution
	return pos.add( velocity );
}
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
	this.hunger = 20; // Hunger (0-20, like Minecraft) - visible hunger bar
	this.maxHunger = 20;
	this.saturation = 2; // Saturation (hidden hunger points) - starts with 1 drumstick extra (2 points)
	this.maxSaturation = 20; // Maximum saturation (can store up to 20 extra points)
	
	// Bonus Energy System (hunger x2)
	this.bonusEnergyActive = false; // Whether bonus energy is currently active
	this.bonusEnergyHungerThreshold = 20; // Hunger level needed to activate bonus (full hunger)
	this.effectiveHunger = 20; // Effective hunger (hunger + saturation, can be doubled with bonus)
	
	// Inventory system
	this.hotbar = new Array(9).fill(null); // 9 slots del hotbar (can be Block or ItemStack)
	this.inventory = new Array(27).fill(null); // 27 slots del inventario (3 filas x 9 columnas)
	this.selectedHotbarSlot = 0; // Slot seleccionado (0-8)
	this.inventoryOpen = false;
	
	// Crafting table system (3x3 grid - separate GUI)
	this.craftingTableGrid = [null, null, null, null, null, null, null, null, null]; // 9 slots for 3x3 crafting
	this.craftingTableResult = null; // Result of current crafting recipe
	this.craftingTableOpen = false; // Whether crafting table GUI is open
	// Crafting inventory system (2x2 grid in inventory)
	this.craftingInventory = new Array(4).fill(null); // 4 slots for crafting inventory ( 2 rows x 2 columns) 
	this.craftingInventoryResult = null; // Result of current 2x2 crafting recipe
	this.craftingSelectedSlot = 0; // Slot seleccionado (0-8)
	this.craftingInventoryOpen = false; // Whether crafting inventory GUI is open

	// Inventory management - for manual organization
	this.draggedSlot = null; // {type: 'hotbar'|'inventory'|'crafting', index: number} - slot being dragged
	
	// Item system support - now enabled by default
	this.useItemSystem = true; // Use ItemStack instead of Block for better item management
	
	// Block breaking system (survival mode)
	this.breakingBlock = null; // {x, y, z} - current block being broken
	this.breakingProgress = 0; // Progress from 0 to 9 (every block is diferent and has a different breaking time)
	this.breakingStartTime = 0; // Time when breaking started
	this.isMouseDown = false; // Whether mouse button is currently held down
	this.lastBreakTarget = null; // Last block targeted for breaking
	this.lastDigSoundTime = 0; // Time when last dig sound was played
	this.digSoundInterval = 250; // Interval between dig sounds in ms
	
	// Preload dig sounds
	this.digSounds = {
		grass: [],
		stone: [],
		wood: [],
		gravel: [],
		sand: [],
		cloth: [],
		snow: []
	};
	this.preloadDigSounds();
	
	// Step sounds system
	this.lastStepSoundTime = 0; // Time when last step sound was played
	this.stepSoundInterval = 350; // Interval between step sounds in ms
	this.lastStepPos = null; // Last position when step sound played
	
	// Preload step sounds
	this.stepSounds = {
		grass: [],
		stone: [],
		wood: [],
		gravel: [],
		sand: [],
		cloth: [],
		snow: []
	};
	this.preloadStepSounds();
	
	// Fall damage system
	this.fallStartY = null; // Y position when fall started
	this.wasFalling = false; // Whether player was falling in previous frame
	this.fallDamageThreshold = 3; // Blocks before taking damage (like Minecraft)
	this.lastDamageTime = 0; // Time when last damage was taken (for invincibility frames)
	this.invincibilityDuration = 500; // Invincibility duration in ms after taking damage
	
	// Health regeneration system (like Minecraft vanilla)
	// Regeneration occurs when hunger is >= 18 (9 drumsticks)
	// Each regen tick heals 1 health point and costs some hunger
	// In vanilla: ~4 seconds per half heart with saturation, slower without
	this.lastRegenTime = 0; // Time when last regeneration occurred
	this.regenInterval = 8000; // 8 seconds between regen ticks (slow like vanilla natural regen)
	this.regenHungerThreshold = 18; // Minimum hunger to regenerate (18/20 = 9 drumsticks)
	this.regenHungerCost = 0.5; // Hunger cost per health point regenerated (lower cost for slower regen)
	
	// Starvation damage system (when hunger = 0)
	this.lastStarvationTime = 0; // Time when last starvation damage occurred
	this.starvationInterval = 4000; // 4 seconds between starvation damage (faster than regen)
	this.starvationDamage = 1; // Damage per starvation tick
	
	// Preload damage sounds
	this.damageSounds = {
		fall: [],
		hurt: []
	};
	this.preloadDamageSounds();
	
	// Initialize game mode UI
	// Use setTimeout to ensure DOM is ready
	setTimeout(function() {
		if (this.updateGameModeUI) {
			this.updateGameModeUI();
		}
	}.bind(this), 100);
}

// preloadDigSounds()
//
// Preloads all dig sounds for different block materials.

Player.prototype.preloadDigSounds = function()
{
	var materials = ['grass', 'stone', 'wood', 'gravel', 'sand', 'cloth', 'snow'];
	var self = this;
	
	for (var m = 0; m < materials.length; m++) {
		var material = materials[m];
		for (var i = 1; i <= 4; i++) {
			var audio = new Audio('sounds/game/sound3/dig/' + material + i + '.ogg');
			audio.preload = 'auto';
			audio.volume = 0.5;
			this.digSounds[material].push(audio);
		}
	}
}

// preloadStepSounds()
//
// Preloads all step sounds for different block materials.

Player.prototype.preloadStepSounds = function()
{
	// Step sounds have varying counts per material
	var materialCounts = {
		grass: 6,
		stone: 6,
		wood: 6,
		gravel: 4,
		sand: 5,
		cloth: 4,
		snow: 4
	};
	
	for (var material in materialCounts) {
		var count = materialCounts[material];
		for (var i = 1; i <= count; i++) {
			var audio = new Audio('sounds/game/sound3/step/' + material + i + '.ogg');
			audio.preload = 'auto';
			audio.volume = 0.3;
			this.stepSounds[material].push(audio);
		}
	}
}

// preloadDamageSounds()
//
// Preloads all damage sounds (fall damage and hurt sounds).

Player.prototype.preloadDamageSounds = function()
{
	// Fall damage sounds
	var fallSounds = ['fallbig.ogg', 'fallsmall.ogg'];
	for (var i = 0; i < fallSounds.length; i++) {
		var audio = new Audio('sounds/game/sound3/damage/' + fallSounds[i]);
		audio.preload = 'auto';
		audio.volume = 0.6;
		this.damageSounds.fall.push(audio);
	}
	
	// Hurt sounds
	for (var i = 1; i <= 3; i++) {
		var audio = new Audio('sounds/game/sound3/damage/hit' + i + '.ogg');
		audio.preload = 'auto';
		audio.volume = 0.5;
		this.damageSounds.hurt.push(audio);
	}
}

// takeDamage( amount, source )
//
// Applies damage to the player.
// amount: damage points (1 heart = 2 points)
// source: 'fall', 'attack', etc.

Player.prototype.takeDamage = function(amount, source)
{
	// Only take damage in survival mode
	if (this.gameMode !== GAME_MODE.SURVIVAL) return;
	
	// Check invincibility frames
	var now = Date.now();
	if (now - this.lastDamageTime < this.invincibilityDuration) return;
	
	// Apply damage
	this.health = Math.max(0, this.health - amount);
	this.lastDamageTime = now;
	
	// Play appropriate sound
	if (source === 'fall') {
		this.playFallDamageSound(amount);
	} else {
		this.playHurtSound();
	}
	
	// Update health display
	this.updateHealthHungerIcons();
	
	// Check for death
	if (this.health <= 0) {
		this.onDeath();
	}
	
	console.log("Player took " + amount + " damage from " + source + ". Health: " + this.health);
}

// playFallDamageSound( damage )
//
// Plays a fall damage sound based on damage amount.

Player.prototype.playFallDamageSound = function(damage)
{
	var sounds = this.damageSounds.fall;
	if (sounds && sounds.length > 0) {
		// Use fallbig for high damage, fallsmall for low damage
		var soundIndex = damage >= 6 ? 0 : 1; // fallbig.ogg for 3+ hearts, fallsmall.ogg otherwise
		if (soundIndex >= sounds.length) soundIndex = sounds.length - 1;
		
		var sound = sounds[soundIndex];
		var soundClone = sound.cloneNode();
		soundClone.volume = Math.min(0.8, 0.4 + damage * 0.05);
		soundClone.play().catch(function(e) {});
	}
	
	// Also play hurt sound
	this.playHurtSound();
}

// playHurtSound()
//
// Plays a random hurt sound.

Player.prototype.playHurtSound = function()
{
	var sounds = this.damageSounds.hurt;
	if (sounds && sounds.length > 0) {
		var randomIndex = Math.floor(Math.random() * sounds.length);
		var sound = sounds[randomIndex];
		var soundClone = sound.cloneNode();
		soundClone.volume = 0.5;
		soundClone.play().catch(function(e) {});
	}
}

// updateFallDamage()
//
// Checks if player has landed and applies fall damage if necessary.
// Called every frame from update().

Player.prototype.updateFallDamage = function()
{
	// Only apply fall damage in survival mode
	if (this.gameMode !== GAME_MODE.SURVIVAL) {
		this.fallStartY = null;
		this.wasFalling = false;
		return;
	}
	
	// Spectator mode doesn't take fall damage
	if (this.spectatorMode) {
		this.fallStartY = null;
		this.wasFalling = false;
		return;
	}
	
	var currentlyFalling = this.falling;
	
	// Started falling
	if (currentlyFalling && !this.wasFalling) {
		this.fallStartY = this.pos.y;
	}
	
	// Track highest point during fall (in case of upward momentum at start)
	if (currentlyFalling && this.fallStartY !== null) {
		if (this.pos.y > this.fallStartY) {
			this.fallStartY = this.pos.y;
		}
	}
	
	// Landed (was falling, now not falling)
	if (!currentlyFalling && this.wasFalling && this.fallStartY !== null) {
		var fallDistance = this.fallStartY - this.pos.y;
		
		// Apply damage if fell more than threshold
		if (fallDistance > this.fallDamageThreshold) {
			// Minecraft formula: damage = (fall_distance - 3) health points
			// Each block above 3 = 1 health point (half a heart)
			var damage = Math.floor(fallDistance - this.fallDamageThreshold);
			
			if (damage > 0) {
				this.takeDamage(damage, 'fall');
			}
		}
		
		// Reset fall tracking
		this.fallStartY = null;
	}
	
	this.wasFalling = currentlyFalling;
}

// onDeath()
//
// esto deberia mostrar un menu de game over con el boton de respawn
// y el boton de volver al menu principal
// Called when player health reaches 0.

Player.prototype.onDeath = function()
{
	console.log("Player died!");
	
	// Reset health and hunger
	this.health = this.maxHealth;
	this.hunger = this.maxHunger;
	this.saturation = 2; // Reset to default (1 drumstick extra = 2 points)
	
	// Respawn at world spawn
	if (this.world && this.world.spawn) {
		this.pos = new Vector(this.world.spawn.x, this.world.spawn.y, this.world.spawn.z);
	}
	
	// Reset velocity
	this.velocity = new Vector(0, 0, 0);
	this.falling = false;
	this.fallStartY = null;
	this.wasFalling = false;
	
	// Clear inventory on death (like Minecraft survival)
	// Items would drop in the world, but for now just clear
	this.clearInventory();
	
	// Update UI
	this.updateHealthHungerIcons();
	this.updateHotbarDisplay();
}

// updateHealthRegeneration()
//
// Handles health regeneration when player has enough hunger.
// Like Minecraft vanilla:
// - Hunger >= 18 (9 drumsticks): regenerate 1 health every 4 seconds
// - Hunger = 0: take starvation damage every 4 seconds
// Called every frame from update().

Player.prototype.updateHealthRegeneration = function()
{
	// Only in survival mode
	if (this.gameMode !== GAME_MODE.SURVIVAL) return;
	
	var now = Date.now();
	
	// Update bonus energy system (hunger x2)
	this.updateBonusEnergy();
	
	// Use effective hunger for regeneration checks (can be doubled with bonus)
	var effectiveHunger = this.effectiveHunger;
	
	// Check for health regeneration (hunger >= 18)
	if (effectiveHunger >= this.regenHungerThreshold && this.health < this.maxHealth) {
		// Check if enough time has passed since last regen
		if (now - this.lastRegenTime >= this.regenInterval) {
			// Regenerate health
			var healAmount = 1;
			var hungerCost = this.regenHungerCost;
			
			// Fast regeneration when hunger is full (20) or bonus energy is active
			if (this.hunger >= this.maxHunger || this.bonusEnergyActive) {
				healAmount = 1; // Still 1 health point
				// With bonus energy, regeneration is faster (half the interval)
				if (this.bonusEnergyActive) {
					// Regenerate twice as fast when bonus energy is active
					if (now - this.lastRegenTime >= this.regenInterval / 2) {
						healAmount = 1;
					} else {
						return; // Wait for next tick
					}
				}
			}
			
			// Check if we have enough effective hunger to pay the cost
			if (effectiveHunger >= hungerCost) {
				// Apply healing
				this.health = Math.min(this.maxHealth, this.health + healAmount);
				
				// Consume hunger (first from saturation, then from visible hunger)
				// With bonus energy, consume at half rate
				var actualHungerCost = this.bonusEnergyActive ? hungerCost / 2 : hungerCost;
				this.consumeHunger(actualHungerCost);
				
				// Update UI
				this.updateHealthHungerIcons();
				
				this.lastRegenTime = now;
			}
		}
	}
	
	// Check for starvation damage (hunger = 0)
	if (this.hunger <= 0) {
		// Check if enough time has passed since last starvation damage
		if (now - this.lastStarvationTime >= this.starvationInterval) {
			// In Minecraft, starvation can only kill on Hard difficulty
			// On Normal, it leaves you at 1 health. On Easy, at 10 health.
			// For simplicity, we'll use Normal rules (can't kill, min 1 health)
			if (this.health > 1) {
				this.takeDamage(this.starvationDamage, 'starvation');
				
				// Prevent death from starvation (like Normal difficulty)
				if (this.health < 1) {
					this.health = 1;
					this.updateHealthHungerIcons();
				}
			}
			
			this.lastStarvationTime = now;
		}
	}
}

// updateBonusEnergy()
//
// Updates the bonus energy system (hunger x2).
// When hunger is full (20/20), effective hunger is doubled (40).
// This provides benefits like faster regeneration and reduced hunger consumption.

Player.prototype.updateBonusEnergy = function()
{
	// Only in survival mode
	if (this.gameMode !== GAME_MODE.SURVIVAL) {
		this.bonusEnergyActive = false;
		this.effectiveHunger = this.hunger + this.saturation;
		return;
	}
	
	// Effective hunger = visible hunger + saturation (hidden hunger points)
	var totalHunger = this.hunger + this.saturation;
	this.effectiveHunger = totalHunger;
	
	// Check if visible hunger is at maximum (full hunger = 20/20)
	// Bonus energy activates when visible hunger bar is full, regardless of saturation
	if (this.hunger >= this.bonusEnergyHungerThreshold) {
		// Activate bonus energy (double effective hunger)
		this.bonusEnergyActive = true;
		this.effectiveHunger = totalHunger * 2; // Double the effective hunger
	} else {
		// Deactivate bonus energy
		this.bonusEnergyActive = false;
		this.effectiveHunger = totalHunger; // Normal effective hunger (hunger + saturation)
	}
}

// consumeHunger( amount )
//
// Reduces player's hunger by the specified amount.
// Used for actions like sprinting, jumping, etc.
// Like Minecraft vanilla: first consumes saturation (hidden), then visible hunger bar.

Player.prototype.consumeHunger = function(amount)
{
	if (this.gameMode !== GAME_MODE.SURVIVAL) return;
	
	// First, consume from saturation (hidden hunger points)
	if (this.saturation > 0) {
		var saturationToConsume = Math.min(this.saturation, amount);
		this.saturation = Math.max(0, this.saturation - saturationToConsume);
		amount -= saturationToConsume;
	}
	
	// Remaining amount consumes from visible hunger bar
	if (amount > 0) {
		this.hunger = Math.max(0, this.hunger - amount);
	}
	
	this.updateHealthHungerIcons();
}

// restoreHunger( amount )
//
// Increases player's hunger by the specified amount.
// Used when eating food.
// Like Minecraft vanilla: first fills visible hunger bar, then stores excess in saturation (hidden).

Player.prototype.restoreHunger = function(amount)
{
	if (this.gameMode !== GAME_MODE.SURVIVAL) return;
	
	// First, fill visible hunger bar
	var hungerNeeded = this.maxHunger - this.hunger;
	var hungerToAdd = Math.min(hungerNeeded, amount);
	this.hunger = Math.min(this.maxHunger, this.hunger + hungerToAdd);
	
	// Remaining amount goes to saturation (hidden hunger points)
	var remainingAmount = amount - hungerToAdd;
	if (remainingAmount > 0) {
		// Store excess in saturation (up to maxSaturation)
		this.saturation = Math.min(this.maxSaturation, this.saturation + remainingAmount);
	}
	
	this.updateHealthHungerIcons();
}

// restoreHealth( amount )
//
// Increases player's health by the specified amount.
// Used for healing items like golden apples.

Player.prototype.restoreHealth = function(amount)
{
	this.health = Math.min(this.maxHealth, this.health + amount);
	this.updateHealthHungerIcons();
}

// getBlockDigSound( block )
//
// Returns the dig sound type for a given block.

Player.prototype.getBlockDigSound = function(block)
{
	if (!block) return 'stone';
	
	// Determine sound type based on block properties
	if (block === BLOCK.GRASS || block === BLOCK.DIRT || block === BLOCK.LEAVES) {
		return 'grass';
	}
	if (block === BLOCK.SAND) {
		return 'sand';
	}
	if (block === BLOCK.GRAVEL) {
		return 'gravel';
	}
	if (block === BLOCK.WOOD || block === BLOCK.PLANK || block === BLOCK.BOOKCASE || 
	    block === BLOCK.PLANKS_STAIRS) {
		return 'wood';
	}
	if (block === BLOCK.WHITE_WOOL) {
		return 'cloth';
	}
	// Default to stone for most blocks
	return 'stone';
}

// playDigSound( block )
//
// Plays a random dig sound for the given block type.

Player.prototype.playDigSound = function(block)
{
	var soundType = this.getBlockDigSound(block);
	var sounds = this.digSounds[soundType];
	
	if (sounds && sounds.length > 0) {
		var randomIndex = Math.floor(Math.random() * sounds.length);
		var sound = sounds[randomIndex];
		
		// Clone the audio to allow overlapping sounds
		var soundClone = sound.cloneNode();
		soundClone.volume = 0.4;
		soundClone.play().catch(function(e) {
			// Ignore autoplay errors
		});
	}
}

// playBlockBreakSound( block )
//
// Plays the block break sound (final destruction sound).

Player.prototype.playBlockBreakSound = function(block)
{
	var soundType = this.getBlockDigSound(block);
	var sounds = this.digSounds[soundType];
	
	if (sounds && sounds.length > 0) {
		var randomIndex = Math.floor(Math.random() * sounds.length);
		var sound = sounds[randomIndex];
		
		// Clone the audio for the break sound (slightly louder)
		var soundClone = sound.cloneNode();
		soundClone.volume = 0.7;
		soundClone.play().catch(function(e) {
			// Ignore autoplay errors
		});
	}
}

// getBlockBelowPlayer()
//
// Returns the block directly below the player's feet.

Player.prototype.getBlockBelowPlayer = function()
{
	if (!this.world) return null;
	
	// Player position: pos.y is the bottom of the player
	// Check the block at y-1 (directly below feet)
	var blockX = Math.floor(this.pos.x);
	var blockY = Math.floor(this.pos.y - 0.1); // Slightly below to detect ground
	var blockZ = Math.floor(this.pos.z);
	
	return this.world.getBlock(blockX, blockY, blockZ);
}

// getBlockStepSound( block )
//
// Returns the step sound type for a given block.

Player.prototype.getBlockStepSound = function(block)
{
	if (!block || block === BLOCK.AIR) return 'stone';
	
	// Determine sound type based on block properties
	if (block === BLOCK.GRASS || block === BLOCK.DIRT || block === BLOCK.LEAVES) {
		return 'grass';
	}
	if (block === BLOCK.SAND) {
		return 'sand';
	}
	if (block === BLOCK.GRAVEL) {
		return 'gravel';
	}
	if (block === BLOCK.WOOD || block === BLOCK.PLANK || block === BLOCK.BOOKCASE || 
	    block === BLOCK.PLANKS_STAIRS) {
		return 'wood';
	}
	if (block === BLOCK.WHITE_WOOL) {
		return 'cloth';
	}
	// Default to stone for most blocks (cobblestone, brick, concrete, etc.)
	return 'stone';
}

// playStepSound()
//
// Plays a random step sound based on the block below the player.

Player.prototype.playStepSound = function()
{
	var blockBelow = this.getBlockBelowPlayer();
	if (!blockBelow || blockBelow === BLOCK.AIR) return;
	
	var soundType = this.getBlockStepSound(blockBelow);
	var sounds = this.stepSounds[soundType];
	
	if (sounds && sounds.length > 0) {
		var randomIndex = Math.floor(Math.random() * sounds.length);
		var sound = sounds[randomIndex];
		
		// Clone the audio to allow overlapping sounds
		var soundClone = sound.cloneNode();
		soundClone.volume = 0.25;
		soundClone.play().catch(function(e) {
			// Ignore autoplay errors
		});
	}
}

// updateStepSounds()
//
// Called every frame to check if player is walking and play step sounds.

Player.prototype.updateStepSounds = function()
{
	// Don't play step sounds if falling, in spectator mode, or inventory is open
	if (this.falling || this.spectatorMode || this.inventoryOpen) return;
	
	// Check if player is moving horizontally
	var isMoving = Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1;
	if (!isMoving) return;
	
	// Check time interval
	var now = Date.now();
	if (now - this.lastStepSoundTime < this.stepSoundInterval) return;
	
	// Play step sound
	this.playStepSound();
	this.lastStepSoundTime = now;
}

// setClient( client )
//
// Assign the local player to a socket client.

Player.prototype.setClient = function( client )
{
	this.client = client;
}

// serializePlayerData()
//
// Serializes the player's state to an object for saving.
// Returns an object with position, inventory, health, hunger, etc.

Player.prototype.serializePlayerData = function()
{
	var playerData = {
		// Position
		pos: {
			x: this.pos.x,
			y: this.pos.y,
			z: this.pos.z
		},
		// View angles
		angles: this.angles.slice(),
		// Health and hunger
		health: this.health,
		hunger: this.hunger,
		saturation: this.saturation, // Hidden hunger points (saturation)
		// Selected hotbar slot
		selectedHotbarSlot: this.selectedHotbarSlot,
		// Hotbar items (serialize ItemStacks)
		hotbar: [],
		// Inventory items (serialize ItemStacks)
		inventory: []
	};
	
	// Serialize hotbar
	for (var i = 0; i < this.hotbar.length; i++) {
		var item = this.hotbar[i];
		if (item && item !== BLOCK.AIR) {
			if (item instanceof ItemStack) {
				playerData.hotbar[i] = {
					type: 'itemstack',
					itemId: item.item ? item.item.id : null,
					blockId: item.item ? item.item.blockId : null,
					count: item.count
				};
			} else if (item && item.id !== undefined) {
				// Legacy block format
				playerData.hotbar[i] = {
					type: 'block',
					blockId: item.id
				};
			} else {
				playerData.hotbar[i] = null;
			}
		} else {
			playerData.hotbar[i] = null;
		}
	}
	
	// Serialize inventory
	for (var i = 0; i < this.inventory.length; i++) {
		var item = this.inventory[i];
		if (item && item !== BLOCK.AIR) {
			if (item instanceof ItemStack) {
				playerData.inventory[i] = {
					type: 'itemstack',
					itemId: item.item ? item.item.id : null,
					blockId: item.item ? item.item.blockId : null,
					count: item.count
				};
			} else if (item && item.id !== undefined) {
				// Legacy block format
				playerData.inventory[i] = {
					type: 'block',
					blockId: item.id
				};
			} else {
				playerData.inventory[i] = null;
			}
		} else {
			playerData.inventory[i] = null;
		}
	}
	
	return playerData;
}

// loadPlayerData( playerData )
//
// Loads the player's state from a saved object.
// playerData: object from serializePlayerData()

Player.prototype.loadPlayerData = function(playerData)
{
	if (!playerData) return;
	
	// Load position
	if (playerData.pos) {
		this.pos = new Vector(playerData.pos.x, playerData.pos.y, playerData.pos.z);
	}
	
	// Load view angles
	if (playerData.angles && Array.isArray(playerData.angles)) {
		this.angles = playerData.angles.slice();
		this.targetPitch = this.angles[0];
		this.targetYaw = this.angles[1];
	}
	
	// Load health and hunger
	if (playerData.health !== undefined) {
		this.health = Math.max(0, Math.min(this.maxHealth, playerData.health));
	} else {
		// Default: full health
		this.health = this.maxHealth;
	}
	if (playerData.hunger !== undefined) {
		this.hunger = Math.max(0, Math.min(this.maxHunger, playerData.hunger));
	} else {
		// Default: full hunger bar (20/20)
		this.hunger = this.maxHunger;
	}
	if (playerData.saturation !== undefined) {
		this.saturation = Math.max(0, Math.min(this.maxSaturation, playerData.saturation));
	} else {
		// Default: 1 drumstick bonus (2 points) - starts with full bar + bonus
		this.saturation = 2;
	}
	
	// Load selected hotbar slot
	if (playerData.selectedHotbarSlot !== undefined) {
		this.selectedHotbarSlot = playerData.selectedHotbarSlot;
	}
	
	// Load hotbar
	if (playerData.hotbar && Array.isArray(playerData.hotbar)) {
		for (var i = 0; i < playerData.hotbar.length && i < this.hotbar.length; i++) {
			var itemData = playerData.hotbar[i];
			if (itemData) {
				this.hotbar[i] = this.deserializeItem(itemData);
			} else {
				this.hotbar[i] = null;
			}
		}
	}
	
	// Load inventory
	if (playerData.inventory && Array.isArray(playerData.inventory)) {
		for (var i = 0; i < playerData.inventory.length && i < this.inventory.length; i++) {
			var itemData = playerData.inventory[i];
			if (itemData) {
				this.inventory[i] = this.deserializeItem(itemData);
			} else {
				this.inventory[i] = null;
			}
		}
	}
	
	// Update UI
	this.updateHotbarDisplay();
	this.updateInventoryDisplay();
	this.selectHotbarSlot(this.selectedHotbarSlot);
	this.updateHealthHungerIcons();
}

// deserializeItem( itemData )
//
// Deserializes an item from saved data.
// Returns an ItemStack or Block.

Player.prototype.deserializeItem = function(itemData)
{
	if (!itemData) return null;
	
	if (itemData.type === 'itemstack') {
		// Reconstruct ItemStack
		var block = null;
		if (itemData.blockId !== undefined && itemData.blockId !== null) {
			block = BLOCK.fromId(itemData.blockId);
		}
		
		if (block) {
			// Get or create item from registry
			var item = ITEM_REGISTRY.getByBlock(block);
			if (!item) {
				// Create new item if not found
				item = new Item(itemData.itemId || block.id, block.name || "Block", ITEM_TYPE.BLOCK, {
					block: block,
					blockId: block.id,
					maxStack: 64
				}, block.id);
				ITEM_REGISTRY.register(item);
			}
			return new ItemStack(item, itemData.count || 1);
		}
	} else if (itemData.type === 'block') {
		// Legacy block format - convert to ItemStack
		var block = BLOCK.fromId(itemData.blockId);
		if (block) {
			var item = ITEM_REGISTRY.getByBlock(block);
			if (!item) {
				item = new Item(block.id, block.name || "Block", ITEM_TYPE.BLOCK, {
					block: block,
					blockId: block.id,
					maxStack: 64
				}, block.id);
				ITEM_REGISTRY.register(item);
			}
			return new ItemStack(item, 1);
		}
	}
	
	return null;
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
	
	// Setup crafting table slots
	this.setupCraftingTableSlots();
	
	// Setup inventory crafting (2x2) slots
	this.setupInventoryCraftingSlots();
	
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

// setupCraftingTableSlots()
//
// Sets up click handlers for crafting table slots (3x3 grid).

Player.prototype.setupCraftingTableSlots = function()
{
	var pl = this;
	
	// Setup crafting table grid slots (3x3) - will be set up when GUI opens
	// This is handled in openCraftingTable()
}

// setupInventoryCraftingSlots()
//
// Sets up click handlers for inventory crafting slots (2x2 grid).

Player.prototype.setupInventoryCraftingSlots = function()
{
	var pl = this;
	
	// Setup 2x2 crafting grid slots
	var craftingSlots = document.querySelectorAll('.inventory-crafting-slot');
	craftingSlots.forEach(function(slot) {
		slot.onclick = function(e) {
			var index = parseInt(this.getAttribute('data-craft-inv'));
			pl.handleInventoryCraftingSlotClick(index, e);
		};
	});
	
	// Setup crafting result slot
	var resultSlot = document.getElementById('inventoryCraftingResult');
	if (resultSlot) {
		resultSlot.onclick = function(e) {
			pl.handleInventoryCraftingResultClick(e);
		};
	}
}

// handleInventoryCraftingSlotClick( index, event )
//
// Handles click on an inventory crafting slot (2x2 grid).

Player.prototype.handleInventoryCraftingSlotClick = function(index, e)
{
	if (index < 0 || index >= 4) return;
	
	var currentItem = this.craftingInventory[index];
	
	if (this.draggedSlot) {
		// Place dragged item into crafting slot
		if (this.draggedSlot.type === 'inventory-crafting' && this.draggedSlot.index === index) {
			// Clicking same slot - clear drag
			this.draggedSlot = null;
			this.hideDraggedItemCursor();
		} else {
			// Swap or place
			var draggedItem = this.getDraggedItem();
			this.setDraggedItem(currentItem);
			this.craftingInventory[index] = draggedItem;
			
			if (!currentItem) {
				this.draggedSlot = null;
				this.hideDraggedItemCursor();
			}
		}
	} else if (currentItem) {
		// Pick up item from crafting slot
		this.draggedSlot = { type: 'inventory-crafting', index: index };
		this.showDraggedItemCursor(currentItem);
		this.craftingInventory[index] = null;
	}
	
	// Update crafting result after grid change
	this.updateInventoryCraftingResult();
	this.updateInventoryDisplay();
}

// handleInventoryCraftingResultClick( event )
//
// Handles click on inventory crafting result slot - crafts the item.

Player.prototype.handleInventoryCraftingResultClick = function(e)
{
	if (!this.craftingInventoryResult) return;
	if (typeof CRAFTING === 'undefined') return;
	
	var isShiftClick = e && e.shiftKey;
	
	// Convert crafting grid to 2x2 array
	var grid = [
		[this.craftingInventory[0], this.craftingInventory[1]],
		[this.craftingInventory[2], this.craftingInventory[3]]
	];
	
	if (isShiftClick) {
		// Shift+Click: Craft maximum possible and place directly in inventory
		this.craftMaximumAndPlace(grid, 'inventory-crafting');
	} else {
		// Normal click: Craft once
		var times = 1;
		var maxCraft = CRAFTING.getCraftingCount(grid);
		if (maxCraft === 0) return;
		
		// Check if we have space for the result
		var resultStack = this.craftingInventoryResult.clone();
		if (!this.canAddItemStack(resultStack)) {
			return; // No space in inventory
		}
		
		// Create a copy of the grid for crafting
		var gridCopy = [];
		for (var y = 0; y < grid.length; y++) {
			gridCopy[y] = [];
			for (var x = 0; x < grid[y].length; x++) {
				if (grid[y][x]) {
					gridCopy[y][x] = grid[y][x].clone();
				} else {
					gridCopy[y][x] = null;
				}
			}
		}
		
		// Only craft recipes that fit in 2x2 (check before crafting)
		var recipe2x2 = CRAFTING.findRecipe2x2(gridCopy);
		if (!recipe2x2) return;
		
		// Use the 2x2 recipe for crafting
		var result = CRAFTING.craft(gridCopy, times);
		if (result) {
			// Apply changes back to crafting grid
			for (var y = 0; y < grid.length; y++) {
				for (var x = 0; x < grid[y].length; x++) {
					var idx = y * 2 + x;
					this.craftingInventory[idx] = gridCopy[y][x];
				}
			}
			
			// Add result to inventory
			if (this.draggedSlot && this.draggedSlot.type === 'inventory') {
				var draggedItem = this.getDraggedItem();
				if (!draggedItem || (draggedItem.item.id === result.item.id && draggedItem.count + result.count <= draggedItem.item.maxStack)) {
					if (!draggedItem) {
						this.setDraggedItem(result);
					} else {
						draggedItem.count += result.count;
					}
				} else {
					var added = this.addItemStack(result);
					if (!added) {
						this.setDraggedItem(result);
					}
				}
			} else {
				var added = this.addItemStack(result);
				if (!added && !this.draggedSlot) {
					this.draggedSlot = { type: 'temp-result' };
					this.setDraggedItem(result);
				}
			}
			
			// Update displays
			this.updateInventoryCraftingResult();
			this.updateInventoryDisplay();
			this.updateHotbarDisplay();
		}
	}
}

// updateInventoryCraftingResult()
//
// Checks if current inventory crafting grid (2x2) matches any recipe.

Player.prototype.updateInventoryCraftingResult = function()
{
	if (typeof CRAFTING === 'undefined') {
		this.craftingInventoryResult = null;
		return;
	}
	
	// Convert crafting grid to 2x2 array for recipe matching
	var grid = [
		[this.craftingInventory[0], this.craftingInventory[1]],
		[this.craftingInventory[2], this.craftingInventory[3]]
	];
	
	// Only find recipes that fit in 2x2
	this.craftingInventoryResult = CRAFTING.getResult2x2(grid);
}

// updateInventoryCraftingDisplay()
//
// Updates the inventory crafting (2x2) slots display.

Player.prototype.updateInventoryCraftingDisplay = function()
{
	if (!this.inventoryOpen) return;
	
	var pl = this;
	var craftingSlots = document.querySelectorAll('.inventory-crafting-slot');
	var craftingResultSlot = document.getElementById('inventoryCraftingResult');
	
	// Update crafting grid slots (2x2)
	if (craftingSlots) {
		craftingSlots.forEach(function(slot, i) {
			pl.updateSlotDisplay(slot, pl.craftingInventory[i]);
		});
	}
	
	// Update result slot
	if (craftingResultSlot) {
		this.updateSlotDisplay(craftingResultSlot, this.craftingInventoryResult);
	}
}

// openCraftingTable()
//
// Opens the crafting table GUI.

Player.prototype.openCraftingTable = function()
{
	var craftingTable = document.getElementById("craftingTable");
	if (!craftingTable) return;
	
	var pl = this;
	
	// Close inventory if open
	if (this.inventoryOpen) {
		this.toggleInventory();
	}
	
	craftingTable.style.display = "flex";
	this.craftingTableOpen = true;
	
	// Release pointer lock
	if (this.pointerLocked) {
		document.exitPointerLock();
	}
	
	// Disable pointer events on canvas
	if (this.canvas) {
		this.canvas.style.pointerEvents = "none";
	}
	
	// Setup click handlers for crafting table slots
	this.setupCraftingTableClickHandlers();
	
	// Close crafting table when clicking overlay
	var overlay = document.getElementById("craftingTableOverlay");
	if (overlay) {
		overlay.onclick = function(e) {
			if (e.target === overlay) {
				pl.closeCraftingTable();
			}
		};
	}
	
	// Update displays
	this.updateCraftingTableDisplay();
	this.updateInventoryDisplay();
	this.updateHotbarDisplay();
}

// closeCraftingTable()
//
// Closes the crafting table GUI.

Player.prototype.closeCraftingTable = function()
{
	var craftingTable = document.getElementById("craftingTable");
	if (craftingTable) {
		craftingTable.style.display = "none";
	}
	
	this.craftingTableOpen = false;
	this.draggedSlot = null;
	this.hideDraggedItemCursor();
	
	// Return items from crafting grid to inventory
	this.clearCraftingTableGrid();
	
	// Re-enable pointer events on canvas
	if (this.canvas) {
		this.canvas.style.pointerEvents = "auto";
	}
	
	// Request pointer lock
	if (this.canvas && !this.pointerLocked) {
		this.canvas.requestPointerLock();
	}
}

// setupCraftingTableClickHandlers()
//
// Sets up click handlers for all crafting table slots.

Player.prototype.setupCraftingTableClickHandlers = function()
{
	var pl = this;
	
	// Setup crafting grid slots (3x3)
	var craftingSlots = document.querySelectorAll('.crafting-table-grid .crafting-table-slot');
	craftingSlots.forEach(function(slot) {
		slot.onclick = function(e) {
			var craftIndex = parseInt(this.getAttribute('data-craft-table'));
			pl.handleCraftingTableSlotClick(craftIndex, e);
		};
	});
	
	// Setup result slot
	var craftingResult = document.querySelector('.crafting-table-result');
	if (craftingResult) {
		craftingResult.onclick = function(e) {
			pl.handleCraftingTableResultClick(e);
		};
	}
	
	// Setup inventory slots in crafting table GUI
	var inventorySlots = document.querySelectorAll('.crafting-table-inventory-grid .crafting-table-slot');
	inventorySlots.forEach(function(slot) {
		slot.onclick = function(e) {
			var invIndex = parseInt(this.getAttribute('data-inv-slot'));
			pl.handleSlotClick('inventory', invIndex, e);
		};
	});
	
	// Setup hotbar slots in crafting table GUI
	var hotbarSlots = document.querySelectorAll('.crafting-table-hotbar .crafting-table-slot');
	hotbarSlots.forEach(function(slot) {
		slot.onclick = function(e) {
			var hotbarIndex = parseInt(this.getAttribute('data-inv-slot'));
			pl.handleSlotClick('hotbar', hotbarIndex, e);
		};
	});
}

// handleCraftingTableSlotClick( index, event )
//
// Handles click on a crafting table slot (3x3 grid).

Player.prototype.handleCraftingTableSlotClick = function(index, e)
{
	if (index < 0 || index >= 9) return;
	
	var currentItem = this.craftingTableGrid[index];
	
	if (this.draggedSlot) {
		// Place dragged item into crafting slot
		if (this.draggedSlot.type === 'crafting-table' && this.draggedSlot.index === index) {
			// Clicking same slot - clear drag
			this.draggedSlot = null;
			this.hideDraggedItemCursor();
		} else {
			// Swap or place
			var draggedItem = this.getDraggedItem();
			this.setDraggedItem(currentItem);
			this.craftingTableGrid[index] = draggedItem;
			
			if (!currentItem) {
				this.draggedSlot = null;
				this.hideDraggedItemCursor();
			}
		}
	} else if (currentItem) {
		// Pick up item from crafting slot
		this.draggedSlot = { type: 'crafting-table', index: index };
		this.showDraggedItemCursor(currentItem);
		this.craftingTableGrid[index] = null;
	}
	
	// Update crafting result after grid change
	this.updateCraftingTableResult();
	this.updateCraftingTableDisplay();
}

// handleSlotClick should also update crafting result when items change in crafting table

// handleCraftingTableResultClick( event )
//
// Handles click on crafting table result slot - crafts the item.
// Shift+Click crafts maximum possible and places directly in inventory.

Player.prototype.handleCraftingTableResultClick = function(e)
{
	if (!this.craftingTableResult) return;
	if (typeof CRAFTING === 'undefined') return;
	
	var isShiftClick = e && e.shiftKey;
	
	// Convert crafting grid to 3x3 array
	var grid = [
		[this.craftingTableGrid[0], this.craftingTableGrid[1], this.craftingTableGrid[2]],
		[this.craftingTableGrid[3], this.craftingTableGrid[4], this.craftingTableGrid[5]],
		[this.craftingTableGrid[6], this.craftingTableGrid[7], this.craftingTableGrid[8]]
	];
	
	if (isShiftClick) {
		// Shift+Click: Craft maximum possible and place directly in inventory
		this.craftMaximumAndPlace(grid, 'crafting-table');
	} else {
		// Normal click: Craft once and let player place manually
		var times = 1;
		var maxCraft = CRAFTING.getCraftingCount(grid);
		if (maxCraft === 0) return;
		
		// Check if we have space for the result
		var resultStack = this.craftingTableResult.clone();
		if (!this.canAddItemStack(resultStack)) {
			return; // No space in inventory
		}
		
		// Create a copy of the grid for crafting
		var gridCopy = [];
		for (var y = 0; y < grid.length; y++) {
			gridCopy[y] = [];
			for (var x = 0; x < grid[y].length; x++) {
				if (grid[y][x]) {
					gridCopy[y][x] = grid[y][x].clone();
				} else {
					gridCopy[y][x] = null;
				}
			}
		}
		
		var result = CRAFTING.craft(gridCopy, times);
		if (result) {
			// Apply changes back to crafting grid
			for (var y = 0; y < grid.length; y++) {
				for (var x = 0; x < grid[y].length; x++) {
					var idx = y * 3 + x;
					this.craftingTableGrid[idx] = gridCopy[y][x];
				}
			}
			
			// Add result to inventory
			if (this.draggedSlot && this.draggedSlot.type === 'inventory') {
				// If holding an item, try to add to it or swap
				var draggedItem = this.getDraggedItem();
				if (!draggedItem || (draggedItem.item.id === result.item.id && draggedItem.count + result.count <= draggedItem.item.maxStack)) {
					// Can merge
					if (!draggedItem) {
						this.setDraggedItem(result);
					} else {
						draggedItem.count += result.count;
					}
				} else {
					// Can't merge, try to add to inventory first
					var added = this.addItemStack(result);
					if (!added) {
						// Inventory full, swap with dragged item
						this.setDraggedItem(result);
					}
				}
			} else {
				// Not holding anything, add to inventory
				var added = this.addItemStack(result);
				if (!added && !this.draggedSlot) {
					// Inventory full, hold the result
					this.draggedSlot = { type: 'temp-result' };
					this.setDraggedItem(result);
				}
			}
			
			// Update displays
			this.updateCraftingTableResult();
			this.updateCraftingTableDisplay();
			this.updateHotbarDisplay();
			this.updateInventoryDisplay();
		}
	}
}

// craftMaximumAndPlace( grid, gridType )
//
// Crafts the maximum possible amount and places directly in inventory (Shift+Click behavior).

Player.prototype.craftMaximumAndPlace = function(grid, gridType)
{
	if (typeof CRAFTING === 'undefined') return;
	
	var maxCraft = CRAFTING.getCraftingCount(grid);
	if (maxCraft === 0) return;
	
	// Find recipe based on grid type (2x2 vs 3x3)
	var recipe;
	if (gridType === 'inventory-crafting') {
		recipe = CRAFTING.findRecipe2x2(grid);
	} else {
		recipe = CRAFTING.findRecipe(grid);
	}
	if (!recipe) return;
	
	var resultItem = recipe.result;
	if (typeof resultItem === 'number') {
		resultItem = ITEM_REGISTRY.get(resultItem);
	}
	if (!resultItem) return;
	
	var totalResultCount = recipe.resultCount * maxCraft;
	var resultStack = new ItemStack(resultItem, totalResultCount);
	
	// Check if we have space for all results
	var canFit = this.canAddItemStack(resultStack);
	if (!canFit) {
		// Calculate how many we can actually fit
		var canFitCount = this.getSpaceForItemStack(resultStack.item);
		if (canFitCount === 0) return;
		
		maxCraft = Math.min(maxCraft, Math.floor(canFitCount / recipe.resultCount));
		if (maxCraft === 0) return;
		
		totalResultCount = recipe.resultCount * maxCraft;
		resultStack = new ItemStack(resultItem, totalResultCount);
	}
	
	// Create a copy of the grid for crafting
	var gridCopy = [];
	for (var y = 0; y < grid.length; y++) {
		gridCopy[y] = [];
		for (var x = 0; x < grid[y].length; x++) {
			if (grid[y][x]) {
				gridCopy[y][x] = grid[y][x].clone();
			} else {
				gridCopy[y][x] = null;
			}
		}
	}
	
	// Craft the items
	var result = CRAFTING.craft(gridCopy, maxCraft);
	if (result) {
		// Apply changes back to crafting grid
		if (gridType === 'crafting-table') {
			for (var y = 0; y < grid.length; y++) {
				for (var x = 0; x < grid[y].length; x++) {
					var idx = y * 3 + x;
					this.craftingTableGrid[idx] = gridCopy[y][x];
				}
			}
		} else if (gridType === 'inventory-crafting') {
			for (var i = 0; i < 4; i++) {
				var y = Math.floor(i / 2);
				var x = i % 2;
				this.craftingInventory[i] = (gridCopy[y] && gridCopy[y][x]) ? gridCopy[y][x] : null;
			}
		}
		
		// Add all results to inventory (auto-distribute)
		var remaining = this.addItemStackAuto(result);
		if (remaining && remaining.count > 0) {
			// Drop remaining items (shouldn't happen if canFit check worked)
			console.warn("Could not fit all crafted items in inventory");
		}
		
		// Update displays
		if (gridType === 'crafting-table') {
			this.updateCraftingTableResult();
			this.updateCraftingTableDisplay();
		} else {
			this.updateInventoryCraftingResult();
		}
		this.updateHotbarDisplay();
		this.updateInventoryDisplay();
	}
}

// updateCraftingTableResult()
//
// Checks if current crafting table grid (3x3) matches any recipe.

Player.prototype.updateCraftingTableResult = function()
{
	if (typeof CRAFTING === 'undefined') {
		this.craftingTableResult = null;
		return;
	}
	
	// Convert crafting grid to 3x3 array for recipe matching
	var grid = [
		[this.craftingTableGrid[0], this.craftingTableGrid[1], this.craftingTableGrid[2]],
		[this.craftingTableGrid[3], this.craftingTableGrid[4], this.craftingTableGrid[5]],
		[this.craftingTableGrid[6], this.craftingTableGrid[7], this.craftingTableGrid[8]]
	];
	
	// Find matching recipe
	this.craftingTableResult = CRAFTING.getResult(grid);
}

// updateCraftingTableDisplay()
//
// Updates the crafting table slots display.

Player.prototype.updateCraftingTableDisplay = function()
{
	if (!this.craftingTableOpen) return;
	
	var pl = this;
	var craftingSlots = document.querySelectorAll('.crafting-table-grid .crafting-table-slot');
	var craftingResultSlot = document.querySelector('.crafting-table-result');
	
	// Update crafting grid slots (3x3)
	craftingSlots.forEach(function(slot, i) {
		pl.updateSlotDisplay(slot, pl.craftingTableGrid[i]);
	});
	
	// Update result slot
	if (craftingResultSlot) {
		this.updateSlotDisplay(craftingResultSlot, this.craftingTableResult);
	}
	
	// Populate and update inventory grid (3x9) in crafting table GUI
	this.populateCraftingTableInventoryGrid();
	
	// Update inventory slots in crafting table GUI
	var inventorySlots = document.querySelectorAll('.crafting-table-inventory-grid .crafting-table-slot');
	inventorySlots.forEach(function(slot, i) {
		pl.updateSlotDisplay(slot, pl.inventory[i]);
	});
	
	// Update hotbar slots in crafting table GUI
	var hotbarSlots = document.querySelectorAll('.crafting-table-hotbar .crafting-table-slot');
	hotbarSlots.forEach(function(slot, i) {
		pl.updateSlotDisplay(slot, pl.hotbar[i]);
	});
}

// populateCraftingTableInventoryGrid()
//
// Populates the inventory grid in crafting table GUI with slots.

Player.prototype.populateCraftingTableInventoryGrid = function()
{
	var inventoryGrid = document.querySelector('.crafting-table-inventory-grid');
	if (!inventoryGrid) return;
	
	// Clear existing slots
	inventoryGrid.innerHTML = '';
	
	// Create 3 rows x 9 columns = 27 slots
	for (var i = 0; i < 27; i++) {
		var slot = document.createElement('div');
		slot.className = 'crafting-table-slot';
		slot.setAttribute('data-inv-slot', i);
		inventoryGrid.appendChild(slot);
	}
	
	// Re-setup click handlers
	var pl = this;
	var inventorySlots = document.querySelectorAll('.crafting-table-inventory-grid .crafting-table-slot');
	inventorySlots.forEach(function(slot) {
		slot.onclick = function(e) {
			var invIndex = parseInt(this.getAttribute('data-inv-slot'));
			pl.handleSlotClick('inventory', invIndex, e);
		};
	});
}

// clearCraftingTableGrid()
//
// Returns crafting table items to inventory and clears the grid.

Player.prototype.clearCraftingTableGrid = function()
{
	for (var i = 0; i < 9; i++) {
		if (this.craftingTableGrid[i]) {
			// Try to add back to inventory
			this.addItemStack(this.craftingTableGrid[i]);
			this.craftingTableGrid[i] = null;
		}
	}
	this.craftingTableResult = null;
	this.updateCraftingTableDisplay();
}

// updateSlotDisplay( slotElement, itemStack )
//
// Updates a single slot's visual display with the given item.

Player.prototype.updateSlotDisplay = function(slotElement, itemStack)
{
	if (!slotElement) return;
	
	// Clear existing content
	slotElement.innerHTML = '';
	
	if (!itemStack || (itemStack instanceof ItemStack && itemStack.isEmpty())) {
		return;
	}
	
	// Get the block to render
	var block = null;
	if (itemStack instanceof ItemStack && itemStack.item) {
		if (itemStack.item.data && itemStack.item.data.block) {
			block = itemStack.item.data.block;
		} else if (itemStack.item.blockId !== undefined) {
			block = BLOCK.fromId(itemStack.item.blockId);
		}
	} else if (itemStack && itemStack.id !== undefined) {
		// Direct block reference
		block = itemStack;
	}
	
	if (block && block !== BLOCK.AIR) {
		// Create thumbnail
		var thumb = this.renderBlockThumbnail(block, 16);
		thumb.classList.add('block-thumbnail');
		slotElement.appendChild(thumb);
		
		// Show count if more than 1
		if (itemStack instanceof ItemStack && itemStack.count > 1) {
			var countEl = document.createElement('span');
			countEl.className = 'item-count';
			countEl.textContent = itemStack.count;
			slotElement.appendChild(countEl);
		}
	}
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
	
	// Release pointer lock to allow mouse interaction with inventory
	if (this.pointerLocked) {
		document.exitPointerLock();
	}
	// Disable pointer events on canvas so clicks go to inventory
	if (this.canvas) {
		this.canvas.style.pointerEvents = "none";
	}
	
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
	this.hideDraggedItemCursor();
	
	// Re-enable pointer events on canvas
	if (this.canvas) {
		this.canvas.style.pointerEvents = "auto";
	}
	// Re-enable pointer lock
	if (this.canvas && !this.pointerLocked) {
		this.canvas.requestPointerLock();
	}
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

Player.prototype.selectHotbarSlot = function(index, showTitle)
{
	if (index < 0 || index >= 9) return;
	
	// Check if slot actually changed
	var slotChanged = (this.selectedHotbarSlot !== index);
	
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
	
	// Only show item title if slot actually changed OR explicitly requested
	// This prevents showing title when hotbar is just being refreshed
	if (slotChanged || showTitle === true) {
		this.showItemTitle(block);
	}
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
	// If inventory is not open and crafting table is not open, just select the hotbar slot
	if (type === 'hotbar' && !this.inventoryOpen && !this.craftingTableOpen) {
		this.selectHotbarSlot(index);
		return;
	}
	
	// If inventory or crafting table is open, handle item movement
	if (this.inventoryOpen || this.craftingTableOpen) {
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
				
				// Update crafting table display if open
				if (this.craftingTableOpen) {
					this.updateCraftingTableDisplay();
				}
				
				// Update inventory crafting result if inventory is open
				if (this.inventoryOpen) {
					this.updateInventoryCraftingResult();
					this.updateInventoryCraftingDisplay();
				}
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
				
				// Update crafting table display if open
				if (this.craftingTableOpen) {
					this.updateCraftingTableDisplay();
				}
				
				// Update inventory crafting result if inventory is open
				if (this.inventoryOpen) {
					this.updateInventoryCraftingResult();
					this.updateInventoryCraftingDisplay();
				}
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

// getDraggedItem()
//
// Gets the currently dragged item from the dragged slot.

Player.prototype.getDraggedItem = function()
{
	if (!this.draggedSlot) {
		return null;
	}
	
	var draggedItem = null;
	if (this.draggedSlot.type === 'hotbar') {
		draggedItem = this.hotbar[this.draggedSlot.index];
	} else if (this.draggedSlot.type === 'inventory') {
		draggedItem = this.inventory[this.draggedSlot.index];
	} else if (this.draggedSlot.type === 'inventory-crafting') {
		draggedItem = this.craftingInventory[this.draggedSlot.index];
	} else if (this.draggedSlot.type === 'crafting-table') {
		draggedItem = this.craftingTableGrid[this.draggedSlot.index];
	} else if (this.draggedSlot.type === 'temp-result') {
		// For temporary result items that aren't in a specific slot yet
		// Return the item from a temporary storage (stored on draggedSlot)
		return this.draggedSlot.item || null;
	}
	
	return draggedItem;
}

// setDraggedItem( item )
//
// Sets the item being dragged. Updates the dragged slot and shows the cursor.

Player.prototype.setDraggedItem = function(item)
{
	if (!this.draggedSlot) {
		return;
	}
	
	// Update the slot with the new item
	if (this.draggedSlot.type === 'hotbar') {
		this.hotbar[this.draggedSlot.index] = item;
	} else if (this.draggedSlot.type === 'inventory') {
		this.inventory[this.draggedSlot.index] = item;
	} else if (this.draggedSlot.type === 'inventory-crafting') {
		this.craftingInventory[this.draggedSlot.index] = item;
	} else if (this.draggedSlot.type === 'crafting-table') {
		this.craftingTableGrid[this.draggedSlot.index] = item;
	} else if (this.draggedSlot.type === 'temp-result') {
		// Store item on draggedSlot for temp-result type
		this.draggedSlot.item = item;
	}
	
	// Update the cursor display
	if (item) {
		// Get the last mouse event or create a default one
		var lastEvent = this._lastMouseEvent || { clientX: 0, clientY: 0 };
		this.showDraggedItemCursor(item, lastEvent);
	} else {
		this.hideDraggedItemCursor();
	}
}

// showDraggedItemCursor( item, event )
//
// Shows the dragged item cursor with the specified item.

Player.prototype.showDraggedItemCursor = function(item, event)
{
	// Use updateDraggedItemCursor which handles the display
	this.updateDraggedItemCursor(item, event);
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

// canAddItemStack( itemStack )
//
// Checks if the entire item stack can be added to inventory.

Player.prototype.canAddItemStack = function(itemStack) {
	if (!itemStack || !itemStack.item || itemStack.isEmpty()) {
		return true; // Empty stack can always be "added"
	}
	
	var needed = itemStack.count;
	var availableSpace = this.getSpaceForItemStack(itemStack.item);
	return availableSpace >= needed;
};

// getSpaceForItemStack( item )
//
// Calculates how many of the given item can fit in inventory (hotbar + inventory).

Player.prototype.getSpaceForItemStack = function(item) {
	if (!item) return 0;
	
	var available = 0;
	
	// Check hotbar for existing stacks and empty slots
	for (var i = 0; i < this.hotbar.length; i++) {
		var slot = this.hotbar[i];
		if (!slot || (slot instanceof ItemStack && slot.isEmpty())) {
			available += item.maxStack;
		} else if (slot instanceof ItemStack && slot.item && slot.item.id === item.id) {
			available += item.maxStack - slot.count;
		}
	}
	
	// Check inventory for existing stacks and empty slots
	for (var i = 0; i < this.inventory.length; i++) {
		var slot = this.inventory[i];
		if (!slot || (slot instanceof ItemStack && slot.isEmpty())) {
			available += item.maxStack;
		} else if (slot instanceof ItemStack && slot.item && slot.item.id === item.id) {
			available += item.maxStack - slot.count;
		}
	}
	
	return available;
};

// addItemStackAuto( itemStack )
//
// Adds item stack to inventory and returns remaining items (if any).

Player.prototype.addItemStackAuto = function(itemStack) {
	if (!itemStack || !itemStack.item || itemStack.isEmpty()) {
		return null;
	}
	
	var remainingCount = itemStack.count;
	var itemAdded = false;
	
	// Try to add to existing stacks first (hotbar)
	for (var i = 0; i < this.hotbar.length && remainingCount > 0; i++) {
		var slot = this.hotbar[i];
		if (slot && slot instanceof ItemStack && slot.item) {
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
	
	// Return remaining items (if any)
	if (remainingCount > 0) {
		return new ItemStack(itemStack.item, remainingCount);
	}
	return null;
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
	
	// Update inventory crafting (2x2) display
	this.updateInventoryCraftingDisplay();
	
	// Update inventory crafting result
	this.updateInventoryCraftingResult();
	
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
	// Don't allow opening inventory if pause menu is open
	var pauseMenu = document.getElementById("pauseMenu");
	if (pauseMenu && pauseMenu.style.display !== "none") {
		return; // Pause menu is open, don't open inventory
	}
	
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
		this.hideDraggedItemCursor();
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

// toggleCraftingTable()
//
// Opens or closes the crafting table GUI.

Player.prototype.toggleCraftingTable = function()
{
	if (this.craftingTableOpen) {
		this.closeCraftingTable();
	} else {
		this.openCraftingTable();
	}
}

// isCraftingTable( block )
//
// Checks if a block is a crafting table using interaction properties.

Player.prototype.isCraftingTable = function(block)
{
	if (!block) return false;
	
	// Check by interaction type
	if (block.interactive && block.interaction === "crafting_table") {
		return true;
	}
	
	// Check by interactionData type
	if (block.interactionData && block.interactionData.type === "crafting_table") {
		return true;
	}
	
	// Fallback: Check by ID
	if (block.id === 27) return true; // CRAFTING_TABLE ID
	
	// Fallback: Check by reference
	if (block === BLOCK.CRAFTING_TABLE) return true;
	
	return false;
}

// getBlockInteractionType( block )
//
// Gets the interaction type of a block, or null if not interactive.

Player.prototype.getBlockInteractionType = function(block)
{
	if (!block || !block.interactive) return null;
	
	// Check interaction property first
	if (block.interaction) {
		return block.interaction;
	}
	
	// Check interactionData
	if (block.interactionData && block.interactionData.type) {
		return block.interactionData.type;
	}
	
	return null;
}

// canInteractWithBlock( block )
//
// Checks if a block can be interacted with (right-clicked).

Player.prototype.canInteractWithBlock = function(block)
{
	if (!block) return false;
	return block.interactive === true;
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
	
	// If crafting table is open, only process E and Esc keys
	if (this.craftingTableOpen) {
		// Close crafting table with E or ESC
		if ( !down && ((keyCode == 69 || key == "e") || keyCode == 27) ) {
			this.closeCraftingTable();
		}
		// Don't process any other keys when crafting table is open
		return;
	}
	
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
	
	// Inventory toggle (E key) - only if pause menu is not open
	if ( !down && (keyCode == 69 || key == "e") ) {
		// Check if pause menu is open
		var pauseMenu = document.getElementById("pauseMenu");
		if (pauseMenu && pauseMenu.style.display !== "none") {
			return; // Don't open inventory if pause menu is open
		}
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
	
	// Drop item (Q key - keyCode 81)
	if ( !down && (keyCode == 81 || key == "q") ) {
		this.dropSelectedItem();
	}
}

// dropSelectedItem()
//
// Drops one item from the currently selected hotbar slot.

Player.prototype.dropSelectedItem = function()
{
	// Only in survival mode
	if (this.gameMode !== GAME_MODE.SURVIVAL) return;
	
	var slot = this.hotbar[this.selectedHotbarSlot];
	if (!slot || slot.count <= 0) return;
	
	if (!this.world || !this.world.addEntity) return;
	
	// Get the item to drop
	var item = slot.item;
	if (!item) return;
	
	// Create ItemStack with 1 item
	var droppedStack = new ItemStack(item, 1);
	
	// Reduce count in hotbar
	slot.count--;
	if (slot.count <= 0) {
		this.hotbar[this.selectedHotbarSlot] = null;
	}
	
	// Update hotbar display
	this.updateHotbarDisplay();
	
	// Create ItemEntity
	var itemEntity = new ItemEntity(null, droppedStack, this.world);
	
	// Position in front of player
	var throwDir = new Vector(
		Math.sin(this.angles[1]),
		0,
		Math.cos(this.angles[1])
	);
	
	itemEntity.pos = new Vector(
		this.pos.x + throwDir.x * 0.5,
		this.pos.y + 1.5, // Eye level
		this.pos.z + throwDir.z * 0.5
	);
	
	// Throw velocity (forward and slightly up)
	itemEntity.velocity = new Vector(
		throwDir.x * 0.3,
		0.2,
		throwDir.z * 0.3
	);
	
	// Add to world
	this.world.addEntity(itemEntity);
	
	console.log("Dropped item:", item.name);
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
		
		// Get the clicked block
		var clickedBlock = world.getBlock( block.x, block.y, block.z );

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
			// Right-click action (place block or interact)
			// Check if clicking on an interactive block
			if (clickedBlock && this.canInteractWithBlock(clickedBlock)) {
				var interactionType = this.getBlockInteractionType(clickedBlock);
				
				// Handle different interaction types
				if (interactionType === "crafting_table") {
					// Open crafting table GUI
					this.openCraftingTable();
					return; // Don't place block
				}
				// Future: Add other interaction types here (chest, furnace, etc.)
				// else if (interactionType === "chest") { ... }
			}
			
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
			
			// Special placement rules for LADDER: can only be placed on solid blocks (walls)
			if ( blockToPlace.bloctype === "ladder" ) {
				// LADDER can only be placed if there's a solid block adjacent to it (on the face being clicked)
				// The ladder is placed in the block space next to the clicked face
				// So we need to check if the clicked block (the one we're clicking on) is solid
				// The clicked block should be solid for the ladder to attach to it
				var clickedBlock = world.getBlock( block.x, block.y, block.z );
				if ( !clickedBlock || clickedBlock === BLOCK.AIR ) {
					return; // Cannot place ladder if clicking on air
				}
				// Check if clicked block is solid (default to true if not explicitly false)
				var isSolid = (clickedBlock.solid !== false);
				if ( !isSolid || clickedBlock.transparent === true ) {
					return; // LADDER can only be placed on solid, non-transparent blocks
				}
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
			this.lastDigSoundTime = 0; // Reset sound timer to play immediately
			
			// Play initial dig sound
			this.playDigSound(currentBlock);
			this.lastDigSoundTime = Date.now();
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
	
	// Play dig sound at intervals
	var now = Date.now();
	if (now - this.lastDigSoundTime >= this.digSoundInterval) {
		this.playDigSound(currentBlock);
		this.lastDigSoundTime = now;
	}
	
	// Break the block when progress reaches 1.0
	if (this.breakingProgress >= 1.0) {
		var obj = this.client ? this.client : this.world;
		
		// Play break sound (louder final sound)
		this.playBlockBreakSound(this.breakingBlock.block);
		
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
// Uses block.itemdrop property if defined (e.g., grass drops dirt)

Player.prototype.dropBlockItem = function(block, x, y, z)
{
	if (!block || !block.spawnable || block === BLOCK.AIR) {
		return; // Can't drop air or non-spawnable blocks
	}
	
	if (!this.world || !this.world.addEntity) {
		return; // World doesn't support entities
	}
	
	// Check if block has a different itemdrop (e.g., grass -> dirt)
	var dropBlock = block;
	if (block.itemdrop !== undefined) {
		var dropBlockType = BLOCK.fromId(block.itemdrop);
		if (dropBlockType && dropBlockType !== BLOCK.AIR) {
			dropBlock = dropBlockType;
		}
	}
	
	// Create ItemStack for the block
	// Check if ITEM_REGISTRY is available
	if (typeof ITEM_REGISTRY === 'undefined') {
		console.warn("ITEM_REGISTRY not defined, cannot drop item");
		return;
	}
	
	var item = ITEM_REGISTRY.getByBlock(dropBlock);
	if (!item) {
		// Block doesn't have an item registered, try to find it in ITEM global object
		for (var prop in BLOCK) {
			if (BLOCK.hasOwnProperty(prop) && BLOCK[prop] === dropBlock) {
				if (typeof ITEM !== 'undefined' && ITEM[prop]) {
					item = ITEM[prop];
					break;
				}
			}
		}
		
		// If still not found, create and register a new one
		if (!item && typeof Item !== 'undefined') {
			item = new Item(dropBlock.id, dropBlock.name || "Block", ITEM_TYPE.BLOCK, { 
				block: dropBlock, 
				blockId: dropBlock.id,
				maxStack: 64 
			}, dropBlock.id);
			
			ITEM_REGISTRY.register(item);
			
			// Store in ITEM global object
			for (var prop in BLOCK) {
				if (BLOCK.hasOwnProperty(prop) && BLOCK[prop] === dropBlock) {
					if (typeof ITEM !== 'undefined') {
						ITEM[prop] = item;
					}
					break;
				}
			}
		}
	}
	
	if (!item) {
		console.warn("Could not create item for block:", dropBlock);
		return;
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

		// Initialize physics accumulator if not set
		if (this.physicsAccumulator === undefined) this.physicsAccumulator = 0;

		// Fixed time step for physics updates (120 Hz = ~8.33ms = 0.00833 seconds)
		// Increased from 60 Hz for more responsive and accurate physics
		var fixedTimeStep = 1/120; // 120 Hz physics updates

		// Accumulate time for physics updates
		this.physicsAccumulator += delta;

		// View (update every frame for smooth camera movement)
		if ( this.dragging )
		{
			this.angles[0] += ( this.targetPitch - this.angles[0] ) * 30 * delta;
			this.angles[1] += ( this.targetYaw - this.angles[1] ) * 30 * delta;
			if ( this.angles[0] < -Math.PI/2 ) this.angles[0] = -Math.PI/2;
			if ( this.angles[0] > Math.PI/2 ) this.angles[0] = Math.PI/2;
		}

		// Update block breaking progress (every frame)
		this.updateBreakingProgress(delta);

		// Update step sounds (play footstep sounds while walking)
		this.updateStepSounds();

		// Update fall damage (check if player landed from a fall)
		this.updateFallDamage();

		// Update health regeneration (heal when hunger is high, damage when starving)
		this.updateHealthRegeneration();

		// Check for ladders BEFORE movement calculation
		// This allows movement to be modified based on ladder state
		this.checkLadderContact(pos, world);

		// Fixed 120 Hz physics updates for consistent physics behavior
		while (this.physicsAccumulator >= fixedTimeStep) {
			this.physicsAccumulator -= fixedTimeStep;

			// Modo creativo: no recibir daño ni hambre
			if ( this.gameMode === GAME_MODE.CREATIVE ) {
				this.health = this.maxHealth;
				this.hunger = this.maxHunger;
			}

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
				this.pos = pos.add( velocity.mul( fixedTimeStep ) );
				this.falling = false;
			}
			else
			{
				// Modo normal: con gravedad y colisiones
					// Ejes: X y Z = horizontal, Y = vertical (altura)
					// Gravity (fixed 60 Hz updates)
					// Don't apply gravity if player is on a ladder (ladder prevents falling)
					if ( this.falling && !this.onLadder ) {
						var gravity = 20; // blocks/second² (same as physics.js)
						velocity.y += -gravity * fixedTimeStep; // Y es altura
					}

				// Jumping
				if ( this.keys[" "] && !this.falling ) {
					velocity.y = 8; // Y es altura
					// Consume hunger when jumping (survival mode)
					if (this.gameMode === GAME_MODE.SURVIVAL) {
						this.consumeHunger(0.05); // Small hunger cost per jump
					}
				}

				// Walking
				// Ejes: X y Z = horizontal, Y = vertical (altura)
				var walkVelocity = new Vector( 0, 0, 0 );

				// If player is on a ladder, W/S move vertically instead of horizontally
				if ( this.onLadder ) {
					// On ladder: W/S move vertically, A/D move horizontally along the wall
					if ( this.keys["w"] ) {
						// Climb up (handled in ladder logic, but also allow here for consistency)
						walkVelocity.y = 2.0; // Vertical movement up
					}
					if ( this.keys["s"] ) {
						// Climb down (handled in ladder logic, but also allow here for consistency)
						walkVelocity.y = -2.0; // Vertical movement down
					}
					// A/D can still move horizontally along the wall
					if ( this.keys["a"] ) {
						walkVelocity.x += Math.cos( Math.PI / 2 + Math.PI / 2 - this.angles[1] );
						walkVelocity.z += Math.sin( Math.PI / 2 + Math.PI / 2 - this.angles[1] ); // Z es horizontal
					}
					if ( this.keys["d"] ) {
						walkVelocity.x += Math.cos( -Math.PI / 2 + Math.PI / 2 - this.angles[1] );
						walkVelocity.z += Math.sin( -Math.PI / 2 + Math.PI / 2 - this.angles[1] ); // Z es horizontal
					}
				} else if ( !this.falling ) {
					// Normal walking (not on ladder)
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
					if ( this.onLadder ) {
						// On ladder: apply vertical movement directly, horizontal movement reduced
						// Vertical movement (W/S) should be continuous while key is pressed
						if ( walkVelocity.y != 0 ) {
							velocity.y = walkVelocity.y; // Vertical movement for climbing (2.0 up or -2.0 down)
						} else {
							// If no vertical input, prevent falling (stay in place)
							if ( velocity.y < 0 ) {
								velocity.y = 0; // Prevent falling
							}
						}
						// Horizontal movement (A/D) along the wall
						if ( walkVelocity.x != 0 || walkVelocity.z != 0 ) {
							var horizontalVel = new Vector( walkVelocity.x, 0, walkVelocity.z );
							if ( horizontalVel.length() > 0 ) {
								horizontalVel = horizontalVel.normal();
								velocity.x = horizontalVel.x * 2; // Reduced horizontal speed on ladder
								velocity.z = horizontalVel.z * 2;
							}
						} else {
							// No horizontal input - reduce horizontal velocity
							velocity.x *= 0.8;
							velocity.z *= 0.8;
						}
					} else {
						// Normal walking
						walkVelocity = walkVelocity.normal();
						velocity.x = walkVelocity.x * 4; // X horizontal
						velocity.z = walkVelocity.z * 4; // Z horizontal

						// Consume hunger while walking (survival mode)
						// Very small amount per physics step, adds up over time
						if (this.gameMode === GAME_MODE.SURVIVAL && !this.falling) {
							this.consumeHunger(0.001 * fixedTimeStep); // Gradual hunger drain while walking
						}
					}
				} else {
					velocity.x /= this.falling ? 1.01 : 1.5;
					velocity.z /= this.falling ? 1.01 : 1.5;
				}

				// Apply ladder physics (pull player to wall, restrict movement)
				this.applyLadderPhysics( pos, velocity, world );

				// Resolve collision
				this.pos = this.resolveCollision( pos, bPos, velocity.mul( fixedTimeStep ) );
			}
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
	
	// Update world's gameMode if world exists and has worldId
	if (this.world && this.world.worldId && typeof worldManager !== "undefined" && worldManager) {
		worldManager.updateWorldMetadata(this.world.worldId, { gameMode: mode }).catch(function(e) {
			console.warn("Failed to save game mode to world:", e);
		});
		// Also update world object
		if (this.world) {
			this.world.gameMode = mode;
		}
	}
	
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
	// In Minecraft vanilla, hunger bar fills from RIGHT to LEFT
	// (rightmost drumsticks fill first, leftmost empty first)
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
		
		// Inverted calculation: fills from right to left (like vanilla Minecraft)
		// i=0 (leftmost) shows last hunger points, i=9 (rightmost) shows first hunger points
		var hungerAmount = currentHunger - ((maxHungerIcons - 1 - i) * 2);
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
				var block = world.getBlock( x, y, z );
				// Default: blocks are solid unless explicitly set to solid: false
				// Non-solid blocks act as AIR (except LADDER which acts as climbable surface)
				// LADDER does NOT block horizontal movement - player can walk through it
				var isSolid = (block.solid !== false); // Default to true if not explicitly false
				var isLadder = (block && block.bloctype === "ladder");
				
				// Ladders don't block horizontal movement (player can walk through them)
				// Only solid blocks block horizontal movement
				if ( block != BLOCK.AIR && isSolid && !isLadder )
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
			var blockBelow = world.getBlock( x, newBYLower, z );
			var blockAbove = world.getBlock( x, newBYUpper, z );
			
			// Check for blocks below (only solid blocks or LADDER act as surfaces)
			// Default: blocks are solid unless explicitly set to solid: false
			// Non-solid blocks act as AIR (except LADDER which acts as climbable surface)
			if ( blockBelow != BLOCK.AIR ) {
				var isSolidBelow = (blockBelow.solid !== false); // Default to true if not explicitly false
				var isLadderBelow = (blockBelow.bloctype === "ladder");
				
				if ( isSolidBelow || isLadderBelow ) {
					// Stairs allow the player to stand on them (full block height for collision)
					// But they also allow easier climbing
					if ( blockBelow.isStairs ) {
						// Stairs: player can stand on them at full height
						collisionCandidates.push( { z: newBYLower + 1, dir: 1, x1: x, y1: z, x2: x + 1, y2: z + 1, isStairs: true } );
					} else {
						// Normal solid block or LADDER
						collisionCandidates.push( { z: newBYLower + 1, dir: 1, x1: x, y1: z, x2: x + 1, y2: z + 1 } );
					}
				}
			}
			
			// Check for blocks above (only solid blocks block movement)
			// Default: blocks are solid unless explicitly set to solid: false
			if ( blockAbove != BLOCK.AIR ) {
				var isSolidAbove = (blockAbove.solid !== false); // Default to true if not explicitly false
				if ( isSolidAbove ) {
					collisionCandidates.push( { z: newBYUpper, dir: -1, x1: x, y1: z, x2: x + 1, y2: z + 1 } );
				}
			}
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
	
	
	// Stairs climbing logic: allow player to climb stairs more easily
	// This makes stairs functional - player can walk up stairs without jumping
	if ( !this.falling && (Math.abs(velocity.x) > 0.1 || Math.abs(velocity.z) > 0.1) ) {
		// Check the block the player is moving towards
		var moveDirX = velocity.x > 0 ? 1 : (velocity.x < 0 ? -1 : 0);
		var moveDirZ = velocity.z > 0 ? 1 : (velocity.z < 0 ? -1 : 0);
		
		if ( moveDirX != 0 || moveDirZ != 0 ) {
			// Check block ahead at player's current Y level
			var aheadX = Math.floor(pos.x + moveDirX * 0.3);
			var aheadZ = Math.floor(pos.z + moveDirZ * 0.3);
			var currentY = Math.floor(pos.y);
			
			// Check if there's a stair ahead at the same level or one level up
			var blockAhead = world.getBlock(aheadX, currentY, aheadZ);
			var blockAheadUp = world.getBlock(aheadX, currentY + 1, aheadZ);
			
			// If there's a stair ahead and space above it, allow climbing
			if ( blockAhead && blockAhead.isStairs ) {
				// Check if there's space above the stair for the player to move into
				var spaceAbove = world.getBlock(aheadX, currentY + 1, aheadZ);
				var spaceAbove2 = world.getBlock(aheadX, currentY + 2, aheadZ);
				
				if ( (spaceAbove == BLOCK.AIR || (spaceAbove && spaceAbove.transparent)) &&
				     (spaceAbove2 == BLOCK.AIR || (spaceAbove2 && spaceAbove2.transparent)) ) {
					// Player can climb up this stair
					// Give upward velocity to climb the stair
					if ( velocity.y <= 0 && pos.y < currentY + 1.1 ) {
						velocity.y = Math.max(velocity.y, 0.4); // Upward boost to climb stairs
					}
				}
			}
			
			// Also check if player is currently on a stair and moving forward
			var blockBelow = world.getBlock(Math.floor(pos.x), Math.floor(pos.y - 0.1), Math.floor(pos.z));
			if ( blockBelow && blockBelow.isStairs ) {
				// Player is standing on a stair
				// Check if there's another stair or air ahead at a higher level
				if ( blockAheadUp && blockAheadUp.isStairs ) {
					// There's a stair ahead at a higher level - allow climbing
					var spaceAboveStair = world.getBlock(aheadX, currentY + 2, aheadZ);
					if ( spaceAboveStair == BLOCK.AIR || (spaceAboveStair && spaceAboveStair.transparent) ) {
						if ( velocity.y <= 0 && pos.y < currentY + 1.1 ) {
							velocity.y = Math.max(velocity.y, 0.5); // Stronger boost for consecutive stairs
						}
					}
				} else if ( blockAheadUp == BLOCK.AIR || (blockAheadUp && blockAheadUp.transparent) ) {
					// There's air ahead at a higher level - allow climbing onto it
					if ( velocity.y <= 0 && pos.y < currentY + 1.1 ) {
						velocity.y = Math.max(velocity.y, 0.3); // Moderate boost
					}
				}
			}
		}
	}

	// Return solution
	return pos.add( velocity );
}

// checkLadderContact( pos, world )
//
// Checks if player is in contact with a ladder and sets this.onLadder flag.
// This must be called BEFORE movement calculation so movement can be modified.

Player.prototype.checkLadderContact = function( pos, world )
{
	var playerBlockX = Math.floor(pos.x);
	var playerBlockY = Math.floor(pos.y);
	var playerBlockZ = Math.floor(pos.z);
	
	// Check blocks around player for ladders
	// Only allow climbing if player is touching the face that's against a solid block
	var ladderFound = false;
	var ladderFace = null; // Direction of the face that's against a solid block
	
	for ( var checkX = playerBlockX - 1; checkX <= playerBlockX + 1; checkX++ ) {
		for ( var checkY = playerBlockY; checkY <= playerBlockY + 1; checkY++ ) {
			for ( var checkZ = playerBlockZ - 1; checkZ <= playerBlockZ + 1; checkZ++ ) {
				var checkBlock = world.getBlock( checkX, checkY, checkZ );
				if ( checkBlock && checkBlock.bloctype === "ladder" ) {
					// Check which face of the ladder is against a solid block
					// The ladder only renders faces against solid blocks (same logic as shouldRenderFaceBetweenBlocks)
					// Check all 4 horizontal directions to find which face has a solid block
					var blockLeft = world.getBlock( checkX - 1, checkY, checkZ );
					var blockRight = world.getBlock( checkX + 1, checkY, checkZ );
					var blockFront = world.getBlock( checkX, checkY, checkZ - 1 );
					var blockBack = world.getBlock( checkX, checkY, checkZ + 1 );
					
					// Find which face is against a solid block (same logic as shouldRenderFaceBetweenBlocks for wall stairs)
					// Only render face if adjacent block is solid (not transparent)
					var solidFace = null;
					if ( blockLeft && blockLeft !== BLOCK.AIR && !blockLeft.transparent ) {
						solidFace = "left"; // Face at x-1
					} else if ( blockRight && blockRight !== BLOCK.AIR && !blockRight.transparent ) {
						solidFace = "right"; // Face at x+1
					} else if ( blockFront && blockFront !== BLOCK.AIR && !blockFront.transparent ) {
						solidFace = "front"; // Face at z-1
					} else if ( blockBack && blockBack !== BLOCK.AIR && !blockBack.transparent ) {
						solidFace = "back"; // Face at z+1
					}
					
					if ( solidFace ) {
						// Check if player is inside or touching the ladder block
						// In Minecraft vanilla, ladders work when player is inside the block space
						// Player position relative to ladder block center
						var playerRelX = pos.x - (checkX + 0.5);
						var playerRelZ = pos.z - (checkZ + 0.5);
						
						// Player is inside the ladder block if they're within the block bounds
						// Check if player's X and Z are within the block boundaries (with some margin)
						var playerBlockX = Math.floor(pos.x);
						var playerBlockZ = Math.floor(pos.z);
						var isInsideBlock = (playerBlockX === checkX && playerBlockZ === checkZ);
						
						// Also check if player is very close to the block center (within 0.6 blocks)
						var distanceFromCenter = Math.sqrt(playerRelX * playerRelX + playerRelZ * playerRelZ);
						var isNearBlock = distanceFromCenter < 0.6;
						
						// Determine if player is on the correct side of the ladder (towards the rendered face)
						// The face is rendered on the side opposite to the solid block
						// So if solid block is on left (x-1), the face is on the right side (towards x+1)
						var isOnCorrectSide = false;
						if ( solidFace === "left" && playerRelX >= -0.3 ) {
							// Solid block is on left, face is on right - player should be on right side or center
							isOnCorrectSide = true;
						} else if ( solidFace === "right" && playerRelX <= 0.3 ) {
							// Solid block is on right, face is on left - player should be on left side or center
							isOnCorrectSide = true;
						} else if ( solidFace === "front" && playerRelZ >= -0.3 ) {
							// Solid block is on front (z-1), face is on back - player should be on back side or center
							isOnCorrectSide = true;
						} else if ( solidFace === "back" && playerRelZ <= 0.3 ) {
							// Solid block is on back (z+1), face is on front - player should be on front side or center
							isOnCorrectSide = true;
						}
						
						// Player is on ladder if they're inside the block OR very close to it on the correct side
						if ( isInsideBlock || (isNearBlock && isOnCorrectSide) ) {
							ladderFound = true;
							ladderFace = solidFace;
							this.ladderBlockX = checkX;
							this.ladderBlockY = checkY;
							this.ladderBlockZ = checkZ;
							break;
						}
					}
				}
			}
			if ( ladderFound ) break;
		}
		if ( ladderFound ) break;
	}
	
	// Set ladder state
	this.onLadder = ladderFound;
	this.ladderFace = ladderFace;
	
	// Clear ladder block position if not on ladder
	if ( !ladderFound ) {
		this.ladderBlockX = undefined;
		this.ladderBlockY = undefined;
		this.ladderBlockZ = undefined;
	}
};

// applyLadderPhysics( pos, velocity, world )
//
// Applies ladder physics: keeps player attached to wall, allows vertical movement only.
// Called AFTER movement calculation to modify velocity based on ladder state.

Player.prototype.applyLadderPhysics = function( pos, velocity, world )
{
	// If player is on a ladder, apply ladder-specific physics
	if ( !this.onLadder || !this.ladderFace ) {
		return; // Not on ladder, no special physics needed
	}
	
	// Get ladder block position (stored in checkLadderContact)
	var ladderBlockX = this.ladderBlockX;
	var ladderBlockY = this.ladderBlockY;
	var ladderBlockZ = this.ladderBlockZ;
	
	if ( ladderBlockX === undefined || ladderBlockY === undefined || ladderBlockZ === undefined ) {
		return; // Ladder block position not set
	}
	
	// Determine wall direction based on ladder face
	var wallDirX = 0;
	var wallDirZ = 0;
	
	if ( this.ladderFace === "left" ) {
		wallDirX = -1; // Wall is on the left (x-1)
	} else if ( this.ladderFace === "right" ) {
		wallDirX = 1; // Wall is on the right (x+1)
	} else if ( this.ladderFace === "front" ) {
		wallDirZ = -1; // Wall is on the front (z-1)
	} else if ( this.ladderFace === "back" ) {
		wallDirZ = 1; // Wall is on the back (z+1)
	}
	
	// Keep player attached to the ladder face (which is opposite to the wall)
	// The ladder face is on the OPPOSITE side of the solid block
	// So if wall is on left (x-1), ladder face is on right (x+1)
	// Target position: ladder block center + small offset AWAY from wall (towards ladder face)
	var targetX = ladderBlockX + 0.5 + wallDirX * 0.25; // 0.25 blocks from center, AWAY from wall
	var targetZ = ladderBlockZ + 0.5 + wallDirZ * 0.25;
	
	// Calculate distance from target position
	var distX = targetX - pos.x;
	var distZ = targetZ - pos.z;
	var dist = Math.sqrt(distX * distX + distZ * distZ);
	
	// Only apply pull force if player is actively moving
	// This prevents unwanted movement when player is stationary
	var isMoving = Math.abs(velocity.x) > 0.01 || Math.abs(velocity.z) > 0.01;
	var hasInput = this.keys["a"] || this.keys["d"] || this.keys["w"] || this.keys["s"];
	
	// Only apply pull force if player has input AND is moving AND is too far from ladder
	// This prevents the player from being pushed into blocks when stationary
	if ( hasInput && isMoving && dist > 0.2 ) {
		var pullStrength = Math.min(dist * 1.0, 0.3); // Weak pull, only when player is moving
		velocity.x += distX * pullStrength * 0.01; // Very reduced force
		velocity.z += distZ * pullStrength * 0.01;
	}
	
	// Restrict horizontal movement away from the wall
	// Player can move along the wall, but not away from it
	// Only apply restriction if player is actively trying to move
	var hasHorizontalInput = this.keys["a"] || this.keys["d"] || this.keys["w"] || this.keys["s"];
	
	if ( hasHorizontalInput ) {
		if ( wallDirX != 0 ) {
			// Wall is on X axis, restrict Z movement away from wall
			// Calculate movement direction relative to wall
			var moveDirZ = velocity.z;
			// If moving away from wall (in wrong direction), reduce it more
			if ( Math.abs(moveDirZ) > 0.1 ) {
				velocity.z *= 0.3; // Stronger restriction when moving away
			}
		} else if ( wallDirZ != 0 ) {
			// Wall is on Z axis, restrict X movement away from wall
			var moveDirX = velocity.x;
			// If moving away from wall (in wrong direction), reduce it more
			if ( Math.abs(moveDirX) > 0.1 ) {
				velocity.x *= 0.3; // Stronger restriction when moving away
			}
		}
	} else {
		// No input - stop horizontal movement completely to prevent drift
		velocity.x *= 0.8;
		velocity.z *= 0.8;
	}
	
	// Vertical movement is handled in the walking section (W/S move vertically on ladder)
	// The walking section already handles preventing falling when no input
}
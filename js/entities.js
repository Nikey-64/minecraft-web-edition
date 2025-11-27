// ==========================================
// Entity System
//
// This file contains the entity management system for the game.
// Entities include players, mobs (cows, pigs, sheep), items dropped, etc.
// ==========================================

// Entity Types
var ENTITY_TYPE = {};
ENTITY_TYPE.PLAYER = 1;
ENTITY_TYPE.MOB = 2;
ENTITY_TYPE.ITEM_ENTITY = 3; // Dropped items
ENTITY_TYPE.OTHER = 4;

// Mob Types
var MOB_TYPE = {};
MOB_TYPE.COW = 1;
MOB_TYPE.PIG = 2;
MOB_TYPE.SHEEP = 3;
MOB_TYPE.CHICKEN = 4;

// Base Entity Class
// All entities in the game extend from this
function Entity(id, type, world) {
	this.id = id || Entity.generateId();
	this.type = type || ENTITY_TYPE.OTHER;
	this.world = world || null;
	
	// Position and movement
	this.pos = new Vector(0, 0, 0);
	this.velocity = new Vector(0, 0, 0);
	this.angles = [0, 0, 0]; // [pitch, yaw, roll]
	
	// Physics
	this.onGround = false;
	this.falling = false;
	this.gravity = true;
	this.collisionBox = { width: 0.6, height: 1.8, depth: 0.6 }; // Default player-like size
	
	// State
	this.health = 20;
	this.maxHealth = 20;
	this.dead = false;
	this.age = 0; // Ticks since spawn
	
	// Rendering
	this.model = null; // 3D model reference
	this.texture = null; // Texture reference
	this.visible = true;
	
	// AI/Behavior (for mobs)
	this.ai = null;
	this.target = null; // Target entity (for hostile mobs)
	
	// Custom data
	this.data = {};
}

// Generate unique entity ID
Entity.nextId = 1;
Entity.generateId = function() {
	return "entity_" + (Entity.nextId++);
};

// Update entity (called every frame)
Entity.prototype.update = function(deltaTime) {
	if (this.dead) return;
	
	this.age += deltaTime;
	
	// Apply gravity
	if (this.gravity && !this.onGround) {
		this.velocity.y -= 9.8 * deltaTime; // Gravity acceleration
		this.falling = true;
	} else {
		this.falling = false;
	}
	
	// Update position
	this.pos.x += this.velocity.x * deltaTime;
	this.pos.y += this.velocity.y * deltaTime;
	this.pos.z += this.velocity.z * deltaTime;
	
	// Apply friction
	this.velocity.x *= 0.8;
	this.velocity.z *= 0.8;
	
	// Check collisions with world
	this.checkWorldCollisions();
	
	// Update AI if present
	if (this.ai && typeof this.ai.update === 'function') {
		this.ai.update(this, deltaTime);
	}
	
	// Custom update logic (override in subclasses)
	this.onUpdate(deltaTime);
};

// Check collisions with world blocks
Entity.prototype.checkWorldCollisions = function() {
	if (!this.world) return;
	
	var box = this.collisionBox;
	var halfWidth = box.width / 2;
	var halfDepth = box.depth / 2;
	
	// Check ground collision
	var groundY = Math.floor(this.pos.y);
	var blockBelow = this.world.getBlock(
		Math.floor(this.pos.x),
		groundY - 1,
		Math.floor(this.pos.z)
	);
	
	if (blockBelow && blockBelow.id !== 0 && !blockBelow.transparent) {
		// On ground
		if (this.pos.y - groundY < 0.1) {
			this.pos.y = groundY;
			this.velocity.y = 0;
			this.onGround = true;
		}
	} else {
		this.onGround = false;
	}
	
	// Simple horizontal collision check
	var checkX = Math.floor(this.pos.x + (this.velocity.x > 0 ? halfWidth : -halfWidth));
	var checkZ = Math.floor(this.pos.z + (this.velocity.z > 0 ? halfDepth : -halfDepth));
	
	var blockX = this.world.getBlock(checkX, Math.floor(this.pos.y), Math.floor(this.pos.z));
	var blockZ = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y), checkZ);
	
	if (blockX && blockX.id !== 0 && !blockX.transparent) {
		this.velocity.x = 0;
	}
	if (blockZ && blockZ.id !== 0 && !blockZ.transparent) {
		this.velocity.z = 0;
	}
};

// Custom update logic (override in subclasses)
Entity.prototype.onUpdate = function(deltaTime) {
	// Override in subclasses
};

// Damage entity
Entity.prototype.damage = function(amount, source) {
	if (this.dead) return;
	
	this.health -= amount;
	if (this.health <= 0) {
		this.health = 0;
		this.kill(source);
	}
};

// Heal entity
Entity.prototype.heal = function(amount) {
	if (this.dead) return;
	
	this.health = Math.min(this.health + amount, this.maxHealth);
};

// Kill entity
Entity.prototype.kill = function(source) {
	if (this.dead) return;
	
	this.dead = true;
	this.onDeath(source);
};

// Called when entity dies (override in subclasses)
Entity.prototype.onDeath = function(source) {
	// Override in subclasses
};

// Get distance to another entity
Entity.prototype.distanceTo = function(entity) {
	if (!entity) return Infinity;
	var dx = this.pos.x - entity.pos.x;
	var dy = this.pos.y - entity.pos.y;
	var dz = this.pos.z - entity.pos.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

// Look at a position
Entity.prototype.lookAt = function(x, y, z) {
	var dx = x - this.pos.x;
	var dy = y - this.pos.y;
	var dz = z - this.pos.z;
	
	var dist = Math.sqrt(dx * dx + dz * dz);
	this.angles[0] = Math.atan2(dy, dist); // Pitch
	this.angles[1] = Math.atan2(dx, dz); // Yaw
};

// Mob Class (extends Entity)
function Mob(id, mobType, world) {
	Entity.call(this, id, ENTITY_TYPE.MOB, world);
	this.mobType = mobType || MOB_TYPE.COW;
	this.ai = new MobAI(this);
	
	// Mob-specific properties
	this.speed = 0.02; // Movement speed
	this.wanderRadius = 10; // How far mob can wander
	this.spawnPos = new Vector(0, 0, 0); // Where mob spawned
	
	// Initialize based on mob type
	this.initMobType();
}

Mob.prototype = Object.create(Entity.prototype);
Mob.prototype.constructor = Mob;

Mob.prototype.initMobType = function() {
	switch (this.mobType) {
		case MOB_TYPE.COW:
			this.maxHealth = 10;
			this.health = 10;
			this.collisionBox = { width: 0.9, height: 1.4, depth: 0.9 };
			break;
		case MOB_TYPE.PIG:
			this.maxHealth = 10;
			this.health = 10;
			this.collisionBox = { width: 0.9, height: 0.9, depth: 0.9 };
			break;
		case MOB_TYPE.SHEEP:
			this.maxHealth = 8;
			this.health = 8;
			this.collisionBox = { width: 1.2, height: 1.3, depth: 1.2 };
			break;
		case MOB_TYPE.CHICKEN:
			this.maxHealth = 4;
			this.health = 4;
			this.collisionBox = { width: 0.4, height: 0.7, depth: 0.4 };
			break;
	}
};

Mob.prototype.onUpdate = function(deltaTime) {
	// Store spawn position on first update
	if (this.spawnPos.x === 0 && this.spawnPos.y === 0 && this.spawnPos.z === 0) {
		this.spawnPos = new Vector(this.pos.x, this.pos.y, this.pos.z);
	}
};

Mob.prototype.onDeath = function(source) {
	// Drop items when killed (override for specific mobs)
	// For now, just remove the entity
	if (this.world && this.world.removeEntity) {
		// Will be handled by world entity manager
	}
};

// Mob AI Class
function MobAI(mob) {
	this.mob = mob;
	this.state = "idle"; // idle, wandering, following, fleeing
	this.wanderTarget = null;
	this.wanderTimer = 0;
	this.wanderInterval = 2000; // Change wander target every 2 seconds
}

MobAI.prototype.update = function(entity, deltaTime) {
	if (!entity || entity.dead) return;
	
	this.wanderTimer += deltaTime * 1000; // Convert to milliseconds
	
	switch (this.state) {
		case "idle":
			this.updateIdle(entity, deltaTime);
			break;
		case "wandering":
			this.updateWandering(entity, deltaTime);
			break;
	}
};

MobAI.prototype.updateIdle = function(entity, deltaTime) {
	// Randomly start wandering
	if (Math.random() < 0.01) { // 1% chance per frame
		this.state = "wandering";
		this.setNewWanderTarget(entity);
	}
};

MobAI.prototype.updateWandering = function(entity, deltaTime) {
	if (!this.wanderTarget) {
		this.setNewWanderTarget(entity);
		return;
	}
	
	// Check if reached target or timer expired
	var dist = entity.distanceTo({ pos: this.wanderTarget });
	if (dist < 0.5 || this.wanderTimer >= this.wanderInterval) {
		// Reached target or time to change direction
		if (Math.random() < 0.3) {
			this.state = "idle";
			this.wanderTarget = null;
		} else {
			this.setNewWanderTarget(entity);
		}
		this.wanderTimer = 0;
		return;
	}
	
	// Move towards target
	var dx = this.wanderTarget.x - entity.pos.x;
	var dz = this.wanderTarget.z - entity.pos.z;
	var dist2D = Math.sqrt(dx * dx + dz * dz);
	
	if (dist2D > 0.1) {
		var speed = entity.speed || 0.02;
		entity.velocity.x = (dx / dist2D) * speed;
		entity.velocity.z = (dz / dist2D) * speed;
		
		// Look at target
		entity.lookAt(this.wanderTarget.x, this.wanderTarget.y, this.wanderTarget.z);
	}
};

MobAI.prototype.setNewWanderTarget = function(entity) {
	var radius = entity.wanderRadius || 10;
	var angle = Math.random() * Math.PI * 2;
	var distance = Math.random() * radius;
	
	this.wanderTarget = {
		x: entity.spawnPos.x + Math.cos(angle) * distance,
		y: entity.spawnPos.y,
		z: entity.spawnPos.z + Math.sin(angle) * distance
	};
};

// ItemEntity Class (for dropped items)
function ItemEntity(id, itemStack, world) {
	Entity.call(this, id, ENTITY_TYPE.ITEM_ENTITY, world);
	this.itemStack = itemStack || null;
	this.collisionBox = { width: 0.25, height: 0.25, depth: 0.25 };
	this.gravity = true;
	this.pickupDelay = 40; // Ticks before item can be picked up
	this.age = 0;
	this.floatOffset = 0.25; // Height offset above ground (item floats slightly)
	this.spawnTime = Date.now(); // Use absolute time for animations
	this.baseGroundY = null; // Store ground Y when landing
}

ItemEntity.prototype = Object.create(Entity.prototype);
ItemEntity.prototype.constructor = ItemEntity;

// Override collision check for items to float above ground
ItemEntity.prototype.checkWorldCollisions = function() {
	if (!this.world) return;
	
	// Check ground collision - item should rest on top of blocks
	var checkY = Math.floor(this.pos.y - 0.1);
	var blockBelow = this.world.getBlock(
		Math.floor(this.pos.x),
		checkY,
		Math.floor(this.pos.z)
	);
	
	if (blockBelow && blockBelow.id !== 0 && !blockBelow.transparent) {
		// Land on top of the block
		var groundLevel = checkY + 1 + this.floatOffset;
		if (this.pos.y < groundLevel) {
			this.pos.y = groundLevel;
			this.velocity.y = 0;
			this.onGround = true;
			// Store base ground Y for bobbing animation
			if (this.baseGroundY === null) {
				this.baseGroundY = groundLevel;
			}
		}
	} else {
		this.onGround = false;
		this.baseGroundY = null;
	}
};

ItemEntity.prototype.onUpdate = function(deltaTime) {
	this.age += deltaTime * 20; // Convert to ticks
	
	// Use absolute time for rotation (prevents acceleration issues)
	var timeSinceSpawn = (Date.now() - this.spawnTime) / 1000;
	this.angles[1] = timeSinceSpawn * 2; // Rotate around Y axis
	
	// No bobbing animation - item stays still on ground
	// (bobbing was causing jumping behavior)
	
	// Check if player is nearby and can pick up
	if (this.age >= this.pickupDelay && this.world && this.world.localPlayer) {
		var player = this.world.localPlayer;
		var dist = this.distanceTo(player);
		if (dist < 1.5) {
			// Try to add to player inventory
			if (player.addItemStack && typeof player.addItemStack === 'function' && this.itemStack) {
				// Clone the ItemStack to avoid modifying the original
				var stackToAdd = this.itemStack.clone();
				var added = player.addItemStack(stackToAdd);
				if (added) {
					// Item picked up, remove entity
					if (this.world.removeEntity) {
						this.world.removeEntity(this.id);
					}
				}
			}
		}
	}
};

// Export for Node.js
if (typeof exports !== 'undefined') {
	exports.Entity = Entity;
	exports.Mob = Mob;
	exports.ItemEntity = ItemEntity;
	exports.MobAI = MobAI;
	exports.ENTITY_TYPE = ENTITY_TYPE;
	exports.MOB_TYPE = MOB_TYPE;
}


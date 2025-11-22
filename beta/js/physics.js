// ==========================================
// Physics
//
// This class contains the code that takes care of simulating
// processes like gravity and fluid flow in the world.
// ==========================================

// Constructor()
//
// Creates a new physics simulator.

function Physics()
{
	this.lastStep = -1;
}

// setWorld( world )
//
// Assigns a world to simulate to this physics simulator.

Physics.prototype.setWorld = function( world )
{
	this.world = world;
}

// simulate()
//
// Perform one iteration of physics simulation.
// Should be called about once every second.

Physics.prototype.simulate = function()
{
	var world = this.world;
	// Old physics expects a full world.blocks array; if we're using the
	// chunk-based world, skip block physics to avoid runtime errors.
	if ( !world || !world.blocks ) return;
	
	var blocks = world.blocks;
	var renderer = world.renderer;

	var step = Math.floor( new Date().getTime() / 100 );
	if ( step == this.lastStep ) return;
	this.lastStep = step;

	// Gravity
	if ( step % 1 == 0 )
	{
		for ( var x = 0; x < world.sx; x++ ) {
			for ( var y = 0; y < world.sy; y++ ) {
				for ( var z = 0; z < world.sz; z++ ) {
					// Only simulate physics for active chunks (disabled for performance)
					// if ( renderer && !this.isBlockInActiveChunk( x, y, z ) ) continue;

					if ( blocks[x][y][z].gravity && z > 0 && blocks[x][y][z-1] == BLOCK.AIR )
					{
						world.setBlock( x, y, z - 1, blocks[x][y][z] );
						world.setBlock( x, y, z, BLOCK.AIR );
					}
				}
			}
		}
	}

	// Fluids
	if ( step % 10 == 0 )
	{
		// Newly spawned fluid blocks are stored so that those aren't
		// updated in the same step, creating a simulation avalanche.
		var newFluidBlocks = {};

		for ( var x = 0; x < world.sx; x++ ) {
			for ( var y = 0; y < world.sy; y++ ) {
				for ( var z = 0; z < world.sz; z++ ) {
					// Only simulate physics for active chunks (disabled for performance)
					// if ( renderer && !this.isBlockInActiveChunk( x, y, z ) ) continue;

					var material = blocks[x][y][z];
					if ( material.fluid && newFluidBlocks[x+","+y+","+z] == null )
					{
						if ( x > 0 && blocks[x-1][y][z] == BLOCK.AIR ) {
							world.setBlock( x - 1, y, z, material );
							newFluidBlocks[(x-1)+","+y+","+z] = true;
						}
						if ( x < world.sx - 1 && blocks[x+1][y][z] == BLOCK.AIR ) {
							world.setBlock( x + 1, y, z, material );
							newFluidBlocks[(x+1)+","+y+","+z] = true;
						}
						if ( y > 0 && blocks[x][y-1][z] == BLOCK.AIR ) {
							world.setBlock( x, y - 1, z, material );
							newFluidBlocks[x+","+(y-1)+","+z] = true;
						}
						if ( y < world.sy - 1 && blocks[x][y+1][z] == BLOCK.AIR ) {
							world.setBlock( x, y + 1, z, material );
							newFluidBlocks[x+","+(y+1)+","+z] = true;
						}
					}
				}
			}
		}
	}
}

// isBlockInActiveChunk( x, y, z )
//
// Checks if a block position is within an active chunk.

Physics.prototype.isBlockInActiveChunk = function( x, y, z )
{
	var renderer = this.world.renderer;
	if ( !renderer || !renderer.chunks ) return false;

	for ( var i = 0; i < renderer.chunks.length; i++ )
	{
		var chunk = renderer.chunks[i];
		if ( chunk.active &&
			 x >= chunk.start[0] && x < chunk.end[0] &&
			 y >= chunk.start[1] && y < chunk.end[1] &&
			 z >= chunk.start[2] && z < chunk.end[2] )
		{
			return true;
		}
	}
	return false;
}

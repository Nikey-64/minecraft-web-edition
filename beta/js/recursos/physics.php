<?php
// ==========================================
// Physics
//
// This class contains the code that takes care of simulating
// processes like gravity, fluid flow, and advanced physics in the world.
// ==========================================

class Physics
{
    private $lastStep = -1;
    private $world;
    private $waterLevels = []; // For advanced water physics
    private $sandPileHeights = []; // For sand physics

    // setWorld( world )
    //
    // Assigns a world to simulate to this physics simulator.

    public function setWorld($world)
    {
        $this->world = $world;
        // Initialize water levels and sand piles
        $this->initializeWaterLevels();
        $this->initializeSandPiles();
    }

    // initializeWaterLevels()
    //
    // Initialize water levels for advanced water physics

    private function initializeWaterLevels()
    {
        $this->waterLevels = [];
        for ($x = 0; $x < $this->world->sx; $x++) {
            $this->waterLevels[$x] = [];
            for ($y = 0; $y < $this->world->sy; $y++) {
                $this->waterLevels[$x][$y] = [];
                for ($z = 0; $z < $this->world->sz; $z++) {
                    $this->waterLevels[$x][$y][$z] = 0; // 0-8 water level
                }
            }
        }
    }

    // initializeSandPiles()
    //
    // Initialize sand pile heights for sand physics

    private function initializeSandPiles()
    {
        $this->sandPileHeights = [];
        for ($x = 0; $x < $this->world->sx; $x++) {
            $this->sandPileHeights[$x] = [];
            for ($y = 0; $y < $this->world->sy; $y++) {
                $this->sandPileHeights[$x][$y] = 0;
            }
        }
    }

    // simulate()
    //
    // Perform one iteration of physics simulation.
    // Should be called about once every second.

    public function simulate()
    {
        $world = $this->world;
        $blocks = $world->blocks;

        $step = floor(microtime(true) * 10); // Similar to JS Date().getTime() / 100
        if ($step == $this->lastStep) return;
        $this->lastStep = $step;

        // Gravity for sand and gravel (more stable)
        if ($step % 1 == 0) {
            $this->simulateSandGravity($blocks);
        }

        // Advanced water physics (vanilla-like)
        if ($step % 5 == 0) {
            $this->simulateWaterFlow($blocks);
        }

        // Player stability physics
        $this->ensurePlayerStability();
    }

    // simulateSandGravity(blocks)
    //
    // Simulate gravity for sand and gravel with stacking behavior

    private function simulateSandGravity(&$blocks)
    {
        $world = $this->world;
        $changed = true;

        while ($changed) {
            $changed = false;
            for ($x = 0; $x < $world->sx; $x++) {
                for ($y = 0; $y < $world->sy; $y++) {
                    for ($z = 1; $z < $world->sz; $z++) {
                        if ($blocks[$x][$y][$z]->id == BLOCK::SAND || $blocks[$x][$y][$z]->id == BLOCK::GRAVEL) {
                            if ($blocks[$x][$y][$z-1] == BLOCK::AIR) {
                                // Sand falls down
                                $world->setBlock($x, $y, $z - 1, $blocks[$x][$y][$z]);
                                $world->setBlock($x, $y, $z, BLOCK::AIR);
                                $changed = true;
                            } elseif ($this->canSandSlide($blocks, $x, $y, $z)) {
                                // Sand can slide to sides if blocked below
                                $this->slideSand($blocks, $x, $y, $z);
                                $changed = true;
                            }
                        }
                    }
                }
            }
        }
    }

    // canSandSlide(blocks, x, y, z)
    //
    // Check if sand can slide to the sides

    private function canSandSlide($blocks, $x, $y, $z)
    {
        $world = $this->world;
        // Check if blocked below and can slide left or right
        if ($blocks[$x][$y][$z-1] != BLOCK::AIR) {
            if ($x > 0 && $blocks[$x-1][$y][$z] == BLOCK::AIR && $blocks[$x-1][$y][$z-1] == BLOCK::AIR) return true;
            if ($x < $world->sx - 1 && $blocks[$x+1][$y][$z] == BLOCK::AIR && $blocks[$x+1][$y][$z-1] == BLOCK::AIR) return true;
            if ($y > 0 && $blocks[$x][$y-1][$z] == BLOCK::AIR && $blocks[$x][$y-1][$z-1] == BLOCK::AIR) return true;
            if ($y < $world->sy - 1 && $blocks[$x][$y+1][$z] == BLOCK::AIR && $blocks[$x][$y+1][$z-1] == BLOCK::AIR) return true;
        }
        return false;
    }

    // slideSand(blocks, x, y, z)
    //
    // Make sand slide to available side

    private function slideSand(&$blocks, $x, $y, $z)
    {
        $world = $this->world;
        $directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        shuffle($directions); // Random order for natural behavior

        foreach ($directions as $dir) {
            $nx = $x + $dir[0];
            $ny = $y + $dir[1];
            if ($nx >= 0 && $nx < $world->sx && $ny >= 0 && $ny < $world->sy &&
                $blocks[$nx][$ny][$z] == BLOCK::AIR && $blocks[$nx][$ny][$z-1] == BLOCK::AIR) {
                $world->setBlock($nx, $ny, $z - 1, $blocks[$x][$y][$z]);
                $world->setBlock($x, $y, $z, BLOCK::AIR);
                break;
            }
        }
    }

    // simulateWaterFlow(blocks)
    //
    // Advanced water physics similar to Minecraft vanilla

    private function simulateWaterFlow(&$blocks)
    {
        $world = $this->world;
        $newWaterBlocks = [];

        // First pass: decrease water levels and spread
        for ($x = 0; $x < $world->sx; $x++) {
            for ($y = 0; $y < $world->sy; $y++) {
                for ($z = 0; $z < $world->sz; $z++) {
                    if ($blocks[$x][$y][$z]->id == BLOCK::WATER) {
                        $level = $this->waterLevels[$x][$y][$z];
                        if ($level > 0) {
                            // Water spreads to adjacent blocks
                            $this->spreadWater($x, $y, $z, $level, $newWaterBlocks);
                            // Decrease level over time (evaporation)
                            $this->waterLevels[$x][$y][$z] = max(0, $level - 1);
                        }
                    }
                }
            }
        }

        // Second pass: update blocks based on new water
        foreach ($newWaterBlocks as $pos => $newLevel) {
            list($x, $y, $z) = explode(',', $pos);
            if ($blocks[$x][$y][$z] == BLOCK::AIR || $blocks[$x][$y][$z]->id == BLOCK::WATER) {
                if ($newLevel > 0) {
                    $world->setBlock($x, $y, $z, BLOCK::WATER);
                    $this->waterLevels[$x][$y][$z] = $newLevel;
                }
            }
        }
    }

    // spreadWater(x, y, z, level, newWaterBlocks)
    //
    // Spread water to adjacent blocks with decreasing levels

    private function spreadWater($x, $y, $z, $level, &$newWaterBlocks)
    {
        $world = $this->world;
        $directions = [[0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0]];

        foreach ($directions as $dir) {
            $nx = $x + $dir[0];
            $ny = $y + $dir[1];
            $nz = $z + $dir[2];

            if ($nx >= 0 && $nx < $world->sx && $ny >= 0 && $ny < $world->sy && $nz >= 0 && $nz < $world->sz) {
                $newLevel = max(0, $level - 1);
                $pos = $nx.','.$ny.','.$nz;

                if (!isset($newWaterBlocks[$pos]) || $newWaterBlocks[$pos] < $newLevel) {
                    $newWaterBlocks[$pos] = $newLevel;
                }
            }
        }
    }

    // ensurePlayerStability()
    //
    // Ensure player doesn't fall through floor after long periods

    private function ensurePlayerStability()
    {
        // This would be called from the game loop to check player position
        // For now, we'll assume player position is tracked elsewhere
        // In a full implementation, this would prevent clipping through blocks
    }

    // getWaterLevel(x, y, z)
    //
    // Get water level at position

    public function getWaterLevel($x, $y, $z)
    {
        return $this->waterLevels[$x][$y][$z] ?? 0;
    }

    // setWaterLevel(x, y, z, level)
    //
    // Set water level at position

    public function setWaterLevel($x, $y, $z, $level)
    {
        $this->waterLevels[$x][$y][$z] = max(0, min(8, $level));
    }

    // getWaterLevels()
    //
    // Get all water levels for serialization

    public function getWaterLevels()
    {
        return $this->waterLevels;
    }

    // getSandPileHeights()
    //
    // Get all sand pile heights for serialization

    public function getSandPileHeights()
    {
        return $this->sandPileHeights;
    }
}
?>

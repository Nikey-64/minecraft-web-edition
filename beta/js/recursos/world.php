<?php
// ==========================================
// World Chunk Generator API
//
// Generates chunks with Perlin noise for terrain,
// caves, and trees for Minecraft Web Edition
// ==========================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Simple Perlin Noise implementation
class PerlinNoise {
    private $permutation = [];
    private $p = [];
    
    public function __construct($seed = null) {
        $this->p = [];
        for ($i = 0; $i < 256; $i++) {
            $this->p[$i] = $i;
        }
        
        // Shuffle using seed
        if ($seed !== null) {
            mt_srand($seed);
        }
        for ($i = 255; $i > 0; $i--) {
            $j = mt_rand(0, $i);
            $tmp = $this->p[$i];
            $this->p[$i] = $this->p[$j];
            $this->p[$j] = $tmp;
        }
        
        // Duplicate permutation array
        for ($i = 0; $i < 512; $i++) {
            $this->permutation[$i] = $this->p[$i & 255];
        }
    }
    
    private function fade($t) {
        return $t * $t * $t * ($t * ($t * 6 - 15) + 10);
    }
    
    private function lerp($a, $b, $t) {
        return $a + $t * ($b - $a);
    }
    
    private function grad($hash, $x, $y, $z) {
        $h = $hash & 15;
        $u = $h < 8 ? $x : $y;
        $v = $h < 4 ? $y : (($h == 12 || $h == 14) ? $x : $z);
        return (($h & 1) == 0 ? $u : -$u) + (($h & 2) == 0 ? $v : -$v);
    }
    
    public function noise($x, $y, $z) {
        $X = floor($x) & 255;
        $Y = floor($y) & 255;
        $Z = floor($z) & 255;
        
        $x -= floor($x);
        $y -= floor($y);
        $z -= floor($z);
        
        $u = $this->fade($x);
        $v = $this->fade($y);
        $w = $this->fade($z);
        
        $A = $this->permutation[$X] + $Y;
        $AA = $this->permutation[$A] + $Z;
        $AB = $this->permutation[$A + 1] + $Z;
        $B = $this->permutation[$X + 1] + $Y;
        $BA = $this->permutation[$B] + $Z;
        $BB = $this->permutation[$B + 1] + $Z;
        
        return $this->lerp(
            $this->lerp(
                $this->lerp(
                    $this->grad($this->permutation[$AA], $x, $y, $z),
                    $this->grad($this->permutation[$BA], $x - 1, $y, $z),
                    $u
                ),
                $this->lerp(
                    $this->grad($this->permutation[$AB], $x, $y - 1, $z),
                    $this->grad($this->permutation[$BB], $x - 1, $y - 1, $z),
                    $u
                ),
                $v
            ),
            $this->lerp(
                $this->lerp(
                    $this->grad($this->permutation[$AA + 1], $x, $y, $z - 1),
                    $this->grad($this->permutation[$BA + 1], $x - 1, $y, $z - 1),
                    $u
                ),
                $this->lerp(
                    $this->grad($this->permutation[$AB + 1], $x, $y - 1, $z - 1),
                    $this->grad($this->permutation[$BB + 1], $x - 1, $y - 1, $z - 1),
                    $u
                ),
                $v
            ),
            $w
        );
    }
}

// Block IDs (matching JavaScript BLOCK constants)
define('BLOCK_AIR', 0);
define('BLOCK_GRASS', 1);
define('BLOCK_DIRT', 2);
define('BLOCK_STONE', 3);
define('BLOCK_WOOD', 4);
define('BLOCK_LEAVES', 5);

// Generate chunk
if (isset($_GET['action']) && $_GET['action'] === 'generate') {
    $cx = isset($_GET['cx']) ? (int)$_GET['cx'] : 0;
    $cy = isset($_GET['cy']) ? (int)$_GET['cy'] : 0;
    $cz = isset($_GET['cz']) ? (int)$_GET['cz'] : 0;
    $sx = isset($_GET['sx']) ? (int)$_GET['sx'] : 16;
    $sy = isset($_GET['sy']) ? (int)$_GET['sy'] : 16;
    $sz = isset($_GET['sz']) ? (int)$_GET['sz'] : 16;
    $worldX = isset($_GET['worldX']) ? (int)$_GET['worldX'] : 64;
    $worldY = isset($_GET['worldY']) ? (int)$_GET['worldY'] : 64;
    $worldZ = isset($_GET['worldZ']) ? (int)$_GET['worldZ'] : 128;
    
    // Calculate world coordinates
    $startX = $cx * 16;
    $startY = $cy * 16;
    $startZ = $cz * 16;
    
    // Initialize Perlin noise generators
    $terrainNoise = new PerlinNoise(12345); // Terrain seed
    $caveNoise = new PerlinNoise(54321);    // Cave seed
    $treeNoise = new PerlinNoise(98765);    // Tree placement seed
    
    // Generate blocks
    $blocks = [];
    $seaLevel = 32;
    $baseHeight = 40;
    
    for ($x = 0; $x < $sx; $x++) {
        $blocks[$x] = [];
        for ($y = 0; $y < $sy; $y++) {
            $blocks[$x][$y] = [];
            $worldXCoord = $startX + $x;
            $worldYCoord = $startY + $y;
            
            // Terrain height using Perlin noise
            $terrainHeight = $baseHeight + $terrainNoise->noise($worldXCoord * 0.05, $worldYCoord * 0.05, 0) * 20;
            $terrainHeight = (int)max($seaLevel - 5, min($worldZ - 10, $terrainHeight));
            
            for ($z = 0; $z < $sz; $z++) {
                $worldZCoord = $startZ + $z;
                
                // Cave generation using 3D Perlin noise
                $caveValue = $caveNoise->noise($worldXCoord * 0.1, $worldYCoord * 0.1, $worldZCoord * 0.1);
                $isCave = $caveValue > 0.3 && $worldZCoord < $terrainHeight - 5;
                
                if ($worldZCoord >= $worldZ) {
                    $blocks[$x][$y][$z] = BLOCK_AIR;
                } elseif ($isCave) {
                    $blocks[$x][$y][$z] = BLOCK_AIR;
                } elseif ($worldZCoord > $terrainHeight) {
                    $blocks[$x][$y][$z] = BLOCK_AIR;
                } elseif ($worldZCoord == $terrainHeight && $worldZCoord >= $seaLevel) {
                    $blocks[$x][$y][$z] = BLOCK_GRASS;
                } elseif ($worldZCoord > $terrainHeight - 4 && $worldZCoord < $terrainHeight) {
                    $blocks[$x][$y][$z] = BLOCK_DIRT;
                } else {
                    $blocks[$x][$y][$z] = BLOCK_STONE;
                }
            }
        }
    }
    
    // Generate trees
    for ($x = 2; $x < $sx - 2; $x++) {
        for ($y = 2; $y < $sy - 2; $y++) {
            $worldXCoord = $startX + $x;
            $worldYCoord = $startY + $y;
            
            // Tree placement probability
            $treeValue = $treeNoise->noise($worldXCoord * 0.1, $worldYCoord * 0.1, 0);
            
            if ($treeValue > 0.7) {
                // Find terrain height at this position
                $terrainHeight = $baseHeight + $terrainNoise->noise($worldXCoord * 0.05, $worldYCoord * 0.05, 0) * 20;
                $terrainHeight = (int)max($seaLevel - 5, min($worldZ - 10, $terrainHeight));
                
                $treeZ = $terrainHeight + 1;
                $localZ = $treeZ - $startZ;
                
                // Check if tree fits in chunk
                if ($localZ >= 0 && $localZ < $sz && $treeZ < $worldZ - 5) {
                    // Check if there's grass at this position
                    if (isset($blocks[$x][$y][$localZ]) && $blocks[$x][$y][$localZ] == BLOCK_GRASS) {
                        // Generate tree trunk (4-6 blocks tall)
                        $treeHeight = 4 + mt_rand(0, 2);
                        for ($tz = 0; $tz < $treeHeight && ($localZ + $tz) < $sz; $tz++) {
                            if (($localZ + $tz) >= 0) {
                                $blocks[$x][$y][$localZ + $tz] = BLOCK_WOOD;
                            }
                        }
                        
                        // Generate leaves (simple cube)
                        $leafZ = $localZ + $treeHeight;
                        for ($lx = max(0, $x - 2); $lx < min($sx, $x + 3); $lx++) {
                            for ($ly = max(0, $y - 2); $ly < min($sy, $y + 3); $ly++) {
                                for ($lz = max(0, $leafZ - 1); $lz < min($sz, $leafZ + 2); $lz++) {
                                    // Don't replace trunk
                                    if (!($lx == $x && $ly == $y && $lz >= $localZ && $lz < $localZ + $treeHeight)) {
                                        // Random leaves pattern (not all blocks)
                                        if (mt_rand(0, 100) < 70) {
                                            $blocks[$lx][$ly][$lz] = BLOCK_LEAVES;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Convert blocks to string format (matching JavaScript format)
    $blockString = '';
    for ($x = 0; $x < $sx; $x++) {
        for ($y = 0; $y < $sy; $y++) {
            for ($z = 0; $z < $sz; $z++) {
                $blockId = isset($blocks[$x][$y][$z]) ? $blocks[$x][$y][$z] : BLOCK_AIR;
                $blockString .= chr(97 + $blockId); // 'a' + blockId
            }
        }
    }
    
    // Return JSON response
    echo json_encode([
        'success' => true,
        'cx' => $cx,
        'cy' => $cy,
        'cz' => $cz,
        'blocks' => $blockString
    ]);
} else {
    // Invalid request
    echo json_encode([
        'success' => false,
        'error' => 'Invalid action. Use ?action=generate&cx=0&cy=0&cz=0&sx=16&sy=16&sz=16'
    ]);
}
?>

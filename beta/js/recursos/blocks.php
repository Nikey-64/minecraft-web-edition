<?php
// ==========================================
// Block types
//
// This file contains all available block types and their properties.
// ==========================================

// Direction enumeration
class DIRECTION
{
    const UP = 1;
    const DOWN = 2;
    const LEFT = 3;
    const RIGHT = 4;
    const FORWARD = 5;
    const BACK = 6;
}

class BLOCK
{
    // Air
    const AIR = [
        'id' => 0,
        'spawnable' => false,
        'transparent' => true
    ];

    // Bedrock
    const BEDROCK = [
        'id' => 1,
        'spawnable' => false,
        'transparent' => false,
        'texture' => 'bedrock_texture'
    ];

    // Dirt
    const DIRT = [
        'id' => 2,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => false,
        'fluid' => false,
        'texture' => 'dirt_texture'
    ];

    // Wood
    const WOOD = [
        'id' => 3,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => false,
        'fluid' => false,
        'texture' => 'wood_texture'
    ];

    // TNT
    const TNT = [
        'id' => 4,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => false,
        'fluid' => false,
        'texture' => 'tnt_texture'
    ];

    // Bookcase
    const BOOKCASE = [
        'id' => 5,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => false,
        'fluid' => false,
        'texture' => 'bookcase_texture'
    ];

    // Lava
    const LAVA = [
        'id' => 6,
        'spawnable' => false,
        'transparent' => true,
        'selflit' => true,
        'gravity' => true,
        'fluid' => true,
        'texture' => 'lava_texture'
    ];

    // Plank
    const PLANK = [
        'id' => 7,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => false,
        'fluid' => false,
        'texture' => 'plank_texture'
    ];

    // Cobblestone
    const COBBLESTONE = [
        'id' => 8,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => false,
        'fluid' => false,
        'texture' => 'cobblestone_texture'
    ];

    // Concrete
    const CONCRETE = [
        'id' => 9,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => false,
        'fluid' => false,
        'texture' => 'concrete_texture'
    ];

    // Brick
    const BRICK = [
        'id' => 10,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => false,
        'fluid' => false,
        'texture' => 'brick_texture'
    ];

    // Sand
    const SAND = [
        'id' => 11,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => true,
        'fluid' => false,
        'texture' => 'sand_texture'
    ];

    // Gravel
    const GRAVEL = [
        'id' => 12,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => true,
        'fluid' => false,
        'texture' => 'gravel_texture'
    ];

    // Iron
    const IRON = [
        'id' => 13,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => false,
        'fluid' => false,
        'texture' => 'iron_texture'
    ];

    // Gold
    const GOLD = [
        'id' => 14,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => false,
        'fluid' => false,
        'texture' => 'gold_texture'
    ];

    // Diamond
    const DIAMOND = [
        'id' => 15,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => false,
        'fluid' => false,
        'texture' => 'diamond_texture'
    ];

    // Obsidian
    const OBSIDIAN = [
        'id' => 16,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => false,
        'fluid' => false,
        'texture' => 'obsidian_texture'
    ];

    // Glass
    const GLASS = [
        'id' => 17,
        'spawnable' => true,
        'transparent' => true,
        'selflit' => false,
        'gravity' => false,
        'fluid' => false,
        'texture' => 'glass_texture'
    ];

    // Sponge
    const SPONGE = [
        'id' => 18,
        'spawnable' => true,
        'transparent' => false,
        'selflit' => false,
        'gravity' => false,
        'fluid' => false,
        'texture' => 'sponge_texture'
    ];

    // fromId( id )
    //
    // Returns a block structure for the given id.

    public static function fromId($id)
    {
        $reflection = new ReflectionClass(__CLASS__);
        $constants = $reflection->getConstants();

        foreach ($constants as $name => $value) {
            if (is_array($value) && isset($value['id']) && $value['id'] == $id) {
                return (object) $value;
            }
        }
        return null;
    }
}

// Helper functions for textures (simplified for PHP)
function bedrock_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    return [1/16, 1/16, 2/16, 2/16];
}

function dirt_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    if ($dir == DIRECTION::UP && $lit) {
        return [14/16, 0/16, 15/16, 1/16];
    } elseif ($dir == DIRECTION::DOWN || !$lit) {
        return [2/16, 0/16, 3/16, 1/16];
    } else {
        return [3/16, 0/16, 4/16, 1/16];
    }
}

function wood_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    if ($dir == DIRECTION::UP || $dir == DIRECTION::DOWN) {
        return [5/16, 1/16, 6/16, 2/16];
    } else {
        return [4/16, 1/16, 5/16, 2/16];
    }
}

function tnt_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    if ($dir == DIRECTION::UP || $dir == DIRECTION::DOWN) {
        return [10/16, 0/16, 11/16, 1/16];
    } else {
        return [8/16, 0/16, 9/16, 1/16];
    }
}

function bookcase_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    if ($dir == DIRECTION::FORWARD || $dir == DIRECTION::BACK) {
        return [3/16, 2/16, 4/16, 3/16];
    } else {
        return [4/16, 0/16, 5/16, 1/16];
    }
}

function lava_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    return [13/16, 14/16, 14/16, 15/16];
}

function plank_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    return [4/16, 0/16, 5/16, 1/16];
}

function cobblestone_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    return [0/16, 1/16, 1/16, 2/16];
}

function concrete_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    return [1/16, 0/16, 2/16, 1/16];
}

function brick_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    return [7/16, 0/16, 8/16, 1/16];
}

function sand_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    return [2/16, 1/16, 3/16, 2/16];
}

function gravel_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    return [3/16, 1/16, 4/16, 2/16];
}

function iron_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    return [6/16, 1/16, 7/16, 2/16];
}

function gold_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    return [7/16, 1/16, 8/16, 2/16];
}

function diamond_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    return [8/16, 1/16, 9/16, 2/16];
}

function obsidian_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    return [5/16, 2/16, 6/16, 3/16];
}

function glass_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    return [1/16, 3/16, 2/16, 4/16];
}

function sponge_texture($world, $lightmap, $lit, $x, $y, $z, $dir) {
    return [0/16, 3/16, 1/16, 4/16];
}
?>

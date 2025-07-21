import Phaser from 'phaser';

/**
 * 获取第一个具有指定属性的帧号
 * @param {Phaser.Scene} scene - 当前场景
 * @param {string} tilesetName - tileset名称
 * @param {string} propertyName - 属性名（如'isKey', 'isSpring', 'isLockedChest'等）
 * @param {any} propertyValue - 属性值（通常为true）
 * @returns {number} 帧号（未找到则返回0）
 */
export function getItemFrameId(scene, tilesetName, propertyName, propertyValue = true) {
    const rawMap = scene.cache.tilemap.get('map1').data;
    const tileset = rawMap.tilesets.find(ts => ts.name === tilesetName);
    if (!tileset || !tileset.tiles) return 0;
    for (let i = 0; i < tileset.tiles.length; i++) {
        const frameId = tileset.tiles[i].id;
        if (getTilePropertyFromRawTileset({
            mapCache: rawMap,
            tilesetName,
            frameId,
            propertyName,
            propertyValue
        })) {
            return frameId;
        }
    }
    return 0;
}

/**
 * 从 Tiled 地图对象层批量创建游戏对象并添加到场景
 * @param {Phaser.Scene} scene - 当前场景
 * @param {string} arrayName - 场景中存放对象的数组名
 * @param {string} tilesetName - tileset 名称
 * @param {string} propertyName - 需要匹配的属性名
 * @param {any} propertyValue - 需要匹配的属性值（默认 true）
 * @param {string} spriteKey - Phaser 资源 key
 * @param {function} customInit - 自定义初始化回调 (sprite, obj, frameId)
 * @param {boolean} isStatic - 是否静态物体（默认 true）
 */
export function createObjectsFromTiled({
    scene,
    arrayName,
    tilesetName,
    propertyName,
    propertyValue = true,
    spriteKey,
    customInit,
    isStatic = true
}) {
    scene[arrayName] = [];
    scene.layers.object = scene.maps.map.getObjectLayer('object');
    const rawMap = scene.cache.tilemap.get('map1').data;
    const phaserTileset = scene.maps.map.tilesets.find(ts => ts.name === tilesetName);
    scene.layers.object.objects.forEach(obj => {
        if (!phaserTileset || obj.gid < phaserTileset.firstgid || obj.gid >= phaserTileset.firstgid + phaserTileset.tileCount) return;
        const frameId = obj.gid - phaserTileset.firstgid;
        const match = getTilePropertyFromRawTileset({
            mapCache: rawMap,
            tilesetName,
            frameId,
            propertyName,
            propertyValue
        });
        if (match) {
            let sprite = scene.physics.add.sprite(obj.x + obj.width / 2, obj.y - obj.height / 2, spriteKey, frameId);
            if (isStatic) {
                sprite.body.immovable = true;
                sprite.body.moves = false;
                sprite.body.allowGravity = false;
            } else {
                sprite.body.allowGravity = false;
            }
            sprite.setDepth(scene.CONFIG ? scene.CONFIG.DEPTH.thing : 1);
            setObjectCollisionBox(obj, sprite, scene.maps.map);
            if (customInit) customInit(sprite, obj, frameId);
            scene[arrayName].push(sprite);
        }
    });
}

/**
 * 判断指定帧号的 tile 是否具有某个属性
 * @param {object} mapCache - 原始地图数据
 * @param {string} tilesetName - tileset 名称
 * @param {number} frameId - 帧号
 * @param {string} propertyName - 属性名
 * @param {any} propertyValue - 属性值
 * @returns {boolean} 是否匹配
 */
export function getTilePropertyFromRawTileset({ mapCache, tilesetName, frameId, propertyName, propertyValue }) {
    if (!mapCache || !mapCache.tilesets) return false;
    const rawTileset = mapCache.tilesets.find(ts => ts.name === tilesetName);
    if (!rawTileset || !rawTileset.tiles || !Array.isArray(rawTileset.tiles)) return false;
    const tileObj = rawTileset.tiles.find(t => t.id === frameId);
    if (tileObj && tileObj.properties) {
        return tileObj.properties.some(p => p.name === propertyName && p.value === propertyValue);
    }
    return false;
}

/**
 * 设置对象或 tile 的碰撞盒到 sprite
 * @param {object} objOrTile - Tiled 对象或 tile
 * @param {Phaser.GameObjects.Sprite} sprite - 目标精灵
 * @param {Phaser.Tilemaps.Tilemap} map - Phaser 地图对象
 */
export function setObjectCollisionBox(objOrTile, sprite, map) {
    let gid = undefined;
    let tileInfo = undefined;
    let tileset = undefined;
    if (objOrTile.gid !== undefined) {
        gid = objOrTile.gid;
    } else if (objOrTile.index !== undefined) {
        gid = objOrTile.index;
    } else if (typeof objOrTile === 'object' && objOrTile.tilemapLayer && objOrTile.index !== undefined) {
        gid = objOrTile.index;
    }
    if (gid === undefined) return;
    tileset = map.tilesets.find(ts => gid >= ts.firstgid && gid < ts.firstgid + ts.total);
    if (!tileset) return;
    const frameId = gid - tileset.firstgid;
    tileInfo = tileset.tileData && tileset.tileData[frameId];
    const objectgroup = tileInfo && tileInfo.objectgroup;
    if (objectgroup && objectgroup.objects && objectgroup.objects.length > 0) {
        const box = objectgroup.objects[0];
        sprite.body.width = box.width;
        sprite.body.height = box.height;
        if (sprite.body.offset && typeof sprite.body.offset.set === 'function') {
            sprite.body.offset.set(box.x, box.y);
        } else {
            sprite.body.offset = new Phaser.Math.Vector2(box.x, box.y);
        }
    } else {
        sprite.body.width = objOrTile.width;
        sprite.body.height = objOrTile.height;
        if (sprite.body.offset && typeof sprite.body.offset.set === 'function') {
            sprite.body.offset.set(0, 0);
        } else {
            sprite.body.offset = new Phaser.Math.Vector2(0, 0);
        }
    }
}

/**
 * 检查两个物体的物理碰撞体是否重叠
 * @param {Phaser.GameObjects.Sprite} a - 物体 A
 * @param {Phaser.GameObjects.Sprite} b - 物体 B
 * @returns {boolean} 是否重叠
 */
export function checkBodyOverlap(a, b) {
    const ab = a.body;
    const bb = b.body;
    return Phaser.Geom.Intersects.RectangleToRectangle(
        new Phaser.Geom.Rectangle(ab.x, ab.y, ab.width, ab.height),
        new Phaser.Geom.Rectangle(bb.x, bb.y, bb.width, bb.height)
    );
}

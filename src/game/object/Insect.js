import Phaser from 'phaser';
import { createObjectsFromTiled } from '../utils/GameUtils.js';

export class Insect extends Phaser.Physics.Arcade.Sprite {
    static createInsectsFromTiled(scene) {
        scene.insects = [];
        const objectLayer = scene.maps.map.getObjectLayer('object');
        const rawMap = scene.cache.tilemap.get('map1').data;
        const phaserTileset = scene.maps.map.tilesets.find(ts => ts.name === 'characters_1');
        if (!objectLayer || !phaserTileset) return;
        objectLayer.objects.forEach(obj => {
            if (obj.gid < phaserTileset.firstgid || obj.gid >= phaserTileset.firstgid + phaserTileset.tileCount) return;
            const frameId = obj.gid - phaserTileset.firstgid;
            // 判断是否为昆虫对象
            const match = rawMap.tilesets
                .find(ts => ts.name === 'characters_1')
                ?.tiles?.find(t => t.id === frameId && t.properties?.some(p => p.name === 'isInsect' && p.value === true));
            if (match) {
                const insect = new Insect(scene, obj, scene.maps.map);
                scene.insects.push(insect);
            }
        });
    }

    /**
     * @param {Phaser.Scene} scene
     * @param {object} tiledObj - Tiled 对象
     * @param {Phaser.Tilemaps.Tilemap} map - Phaser 地图对象
     */
    constructor(scene, tiledObj, map) {
        // 自动计算 frameId
        const tileset = map.tilesets.find(ts => tiledObj.gid >= ts.firstgid && tiledObj.gid < ts.firstgid + ts.tileCount);
        const frameId = tileset ? (tiledObj.gid - tileset.firstgid) : 0;
        const x = tiledObj.x + tiledObj.width / 2;
        const y = tiledObj.y - tiledObj.height / 2;
        super(scene, x, y, 'characters', frameId);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDepth(scene.CONFIG ? scene.CONFIG.DEPTH.thing + 1 : 2);
        this.anims.play('flying insect', true);
        this.body.allowGravity = false;

        // 随机参数和初始状态
        this.setVelocity(0, 0);
        this._flyOriginX = x;
        this._flyOriginY = y;
        this._flyVX = 0;
        this._flyVY = 0;
        this._flyMaxDist = 800 + Math.random() * 16;
        this._flyRandom = 480 + Math.random() * 160;
        this._flyReturn = 0.18 + Math.random() * 0.04;
        this._flyDamping = 0.92 + Math.random() * 0.04;
    }

    update(dt) {
        // 随机游走动画
        this._flyVX += (Math.random() - 0.5) * 2 * this._flyRandom * dt;
        this._flyVY += (Math.random() - 0.5) * 2 * this._flyRandom * dt;
        // 回原点吸引
        this._flyVX += (this._flyOriginX - this.x) * this._flyReturn * dt;
        this._flyVY += (this._flyOriginY - this.y) * this._flyReturn * dt;
        // 阻尼
        this._flyVX *= this._flyDamping;
        this._flyVY *= this._flyDamping;
        // 移动
        this.x += this._flyVX * dt;
        this.y += this._flyVY * dt;
        // 限制最大活动半径
        const dx = this.x - this._flyOriginX;
        const dy = this.y - this._flyOriginY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this._flyMaxDist) {
            this.x = this._flyOriginX + dx / dist * this._flyMaxDist;
            this.y = this._flyOriginY + dy / dist * this._flyMaxDist;
            this._flyVX *= 0.5;
            this._flyVY *= 0.5;
        }
    }
}

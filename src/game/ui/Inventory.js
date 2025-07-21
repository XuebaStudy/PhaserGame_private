// 物品栏类，负责物品栏的创建和刷新
export class Inventory {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.inventorySlots = [];
        this.inventoryIcons = [];

        this.create();
    }

    create(slotCount = 3, slotSize = 28, slotMargin = 0, startX = 4, startY = 80) {
        this.inventorySlots = [];
        this.inventoryIcons = [];
        for (let i = 0; i < slotCount; i++) {
            const g = this.scene.add.graphics();
            g.fillStyle(0x000000, 0.35);
            g.fillRoundedRect(startX, startY + i * (slotSize + slotMargin), slotSize, slotSize, 8);
            g.lineStyle(2, 0xffffff, 0.5);
            g.strokeRoundedRect(startX, startY + i * (slotSize + slotMargin), slotSize, slotSize, 8);
            g.setDepth(this.config.DEPTH.foreground);
            g.setScrollFactor(0);
            this.inventorySlots.push(g);
            // 默认隐藏物品图标
            const icon = this.scene.add.image(startX + slotSize / 2, startY + i * (slotSize + slotMargin) + slotSize / 2, 'things', 0);
            icon.setVisible(false);
            icon.setDepth(this.config.DEPTH.foreground + 1);
            icon.setScrollFactor(0);
            icon.setScale(1.0);
            this.inventoryIcons.push(icon);
        }
    }

    update(hasKey, keyFrameId) {
        if (hasKey) {
            this.inventoryIcons[0].setFrame(keyFrameId);
            this.inventoryIcons[0].setVisible(true);
        } else {
            this.inventoryIcons[0].setVisible(false);
        }
    }
}

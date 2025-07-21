// 分数板类，负责分数板的创建和刷新
export class ScoreBoard {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.scoreText = null;

        this.create();
    }

    create() {
        // 桦木色（Birch）半透明底板
        const boardWidth = 90;
        const boardHeight = 30;
        const boardX = 8;
        const boardY = 8;
        this.bgGraphics = this.scene.add.graphics();
        this.bgGraphics.fillStyle(0xF7E7B4, 0.7); // 桦木色，70%透明
        this.bgGraphics.lineStyle(2, 0xC2B280, 0.8); // 深木色描边
        this.bgGraphics.fillRoundedRect(boardX, boardY, boardWidth, boardHeight, 8);
        this.bgGraphics.strokeRoundedRect(boardX, boardY, boardWidth, boardHeight, 8);
        this.bgGraphics.setScrollFactor(0);
        this.bgGraphics.setDepth(this.config.DEPTH.foreground + 9);

        // 分数文字（深棕色，木质风格）
        this.scoreText = this.scene.add.text(boardX + boardWidth / 2, boardY + boardHeight / 2, 'Score: 0', {
            fontFamily: 'Arial Narrow',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#6B4F1D',
            stroke: '#C2B280',
            strokeThickness: 2,
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#fffbe6',
                blur: 0,
                fill: true
            },
            align: 'center',
        });
        this.scoreText.setOrigin(0.5, 0.5); // 水平和垂直居中
        this.scoreText.setScrollFactor(0);
        this.scoreText.setDepth(this.config.DEPTH.foreground + 10);
    }

    update(score) {
        if (this.scoreText) {
            this.scoreText.setText(`Score: ${score}`);
        }
    }
}

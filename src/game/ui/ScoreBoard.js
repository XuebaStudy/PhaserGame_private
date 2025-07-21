// 分数板类，负责分数板的创建和刷新
export class ScoreBoard {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.scoreText = null;
    }

    create() {
        this.scoreText = this.scene.add.text(8, 8, '分数: 0', {
            fontFamily: 'Arial Narrow',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#000',
            backgroundColor: '#fffbe6',
            padding: { left: 8, right: 8, top: 4, bottom: 4 },
            align: 'left',
        });
        this.scoreText.setOrigin(0, 0);
        this.scoreText.setScrollFactor(0);
        this.scoreText.setDepth(this.config.DEPTH.foreground + 10);
    }

    update(score) {
        if (this.scoreText) {
            this.scoreText.setText(`分数: ${score}`);
        }
    }
}

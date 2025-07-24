## 🎮 PhaserGame

这是一个基于 [Phaser（一个常用于游戏制作的 js 库）](https://phaser.io/) 和 [Tiled](https://www.mapeditor.org/) 的 2D 平台游戏项目，支持角色移动、收集物品、积分统计等基础玩法。

> [点击直接游玩](https://game1.xuebasy.top/)

### 🕹️ 游戏玩法

- 使用 WASD 控制角色移动和跳跃。
- 左上角显示当前分数，左侧可查看背包物品。
- 在地图中收集物品，获得积分。
![](demo_1.gif)
- 躲避障碍物和敌人，避免失败。
![](demo_2.gif)


### 📁 目录结构

```
├── index.html                  # 入口 HTML 文件
├── package.json                # 项目依赖和脚本
├── src/                        # 源码目录
│   ├── main.js                 # 游戏主入口
│   └── game/                   # 游戏相关模块
│       ├── object/             # 游戏对象（如玩家、昆虫）
│       ├── ui/                 # UI 组件（如背包、记分板）
│       ├── utils/              # 工具类
│       └── styles/             # 样式文件
├── public/                     # 静态资源
│   └── assets/                 # 图片、地图、字体等
│       ├── fonts/              # 字体资源
│       └── Tiled/              # Tiled 地图相关资源
│           ├── background_1.json
│           ├── map1.json
│           └── Tilemap/        # 用于 Tiled 的图片资源
│               ├── background_1.png
│               ├── characters_1.png
│               └── platformer_1.png
├── scripts/                    # 部署和更新脚本
│   ├── deploy_gh-pages.bat     # Git 推送至云端，并部署到 GitHub Pages
│   └── update_git.bat          # 本地 Git 更新脚本
├── vite/                       # Vite 配置
│   ├── config.dev.mjs
│   └── config.prod.mjs
├── third_party/                # 第三方模板或依赖
│   └── Phaser_Vite_Template/   # Phaser + Vite 模板
├── README.md                   # 项目说明
├── LICENSE                     # 许可证文件
......
```

### 🚀 如何运行

1. 安装依赖：
   ```bash
   npm install
   ```
2. 启动开发服务器：
   ```bash
   npm run dev
   ```
3. 打开浏览器访问 `http://localhost:8080` 查看游戏。

如需打包生产环境版本：
```bash
npm run build
```
打包后文件位于 `dist/` 目录。

> 关于 Phaser_Vite_Template 的详细使用和配置，可以参考 [Phaser_Vite_Template](https://github.com/phaserjs/template-vite)


### 📦 主要依赖

- [Phaser](https://phaser.io/)
- [Vite](https://vitejs.dev/)

### 🎨 资源说明

- 地图与素材位于 `public/assets/` 目录
- 美术资源来自 [Kenney.nl](https://kenney.nl/assets/pixel-platformer) ，采用 CC0 许可证。
- 地图为作者用 Tiled 制作。

### 🤝 参与贡献

欢迎提交 issue 或 PR 改进本项目。
建议流程：
1. Fork 本仓库
2. 新建分支进行开发
3. 提交 PR 并描述修改内容

### 📄 许可证
本项目采用 MIT 许可证，您可以自由使用、修改和分发，但请保留原作者信息和许可证文件。

### 📬 联系方式

如有疑问或建议，请在 Issues 区留言。


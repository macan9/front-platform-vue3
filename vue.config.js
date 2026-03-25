const { defineConfig } = require('@vue/cli-service')
// import { globals_config } from '/public/config/globals_config'
const path = require('path');
module.exports = defineConfig({
  transpileDependencies: true,
  // Disable worker-based parallel compilation on Windows to avoid
  // thread-loader child_process spawn failures in some Node environments.
  parallel: false,
   devServer: {
    port: 8010,
    hot: true,
    // 关闭开发环境全屏红色错误遮罩（避免接口报错/运行时异常影响调试）
    client: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: 'http://139.196.158.225:3000',
        changeOrigin: true,
        secure: false,
        // pathRewrite: { '^/api': '' } // 移除，因为线上API带 /api
      },
      
      '/gitee': {
        target: 'https://gitee.com/',
        changeOrigin: true,
        secure: false,
        pathRewrite: {
          '^/gitee': ''
        }
      }
    }
  },
  // 配置公共路径
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    }
  },
  publicPath: './',
  // 配置vue文件中可以解析  lang = 'scss' 
  pluginOptions: {
    'style-resources-loader': {
      preProcessor: 'scss',
      patterns: []
    }
  },
  // 引入公共的  scss 文件
  css: {
    loaderOptions: {
      scss: { 
        // additionalData: ` @use '@/assets/styles/main' as main;`, // 引入公共样式变量 不要引入样式文件，否则会重复引入导致样式冲突
      },
    },
  },
})


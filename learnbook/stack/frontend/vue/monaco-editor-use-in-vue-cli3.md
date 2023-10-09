# monaco-editor 在 vue-cli3 使用

## monaco-editor 简介

[monaco-editor](https://microsoft.github.io/monaco-editor/)是为VS Code提供支持的代码编辑器，支持IE 11，Edge，Chrome，Firefox，Safari和Opera，兼容VS Code的快键键

## 安装依赖

```bash
npm install monaco-editor --save
npm install monaco-editor-webpack-plugin --save-dev
# OR
yarn add monaco-editor
yarn add monaco-editor-webpack-plugin
```

## 在vue.config.js文件下配置

```js
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

module.exports = {
  configureWebpack: {
    plugins: [
      new MonacoWebpackPlugin({
        languages: ["json"],// 配置需要的languages，减少打包后的体积
        output: "./static/js/monaco-editor"
      })
    ]
  }
}
```

## 定义monaco组件

```html
<template>
  <div
    ref="container"
    class="monaco-editor"
    :style="`height: ${height}px`"
  ></div>
</template>

<script>
import * as monaco from "monaco-editor";
export default {
  name: "Monaco",
  props: {
    monacoOptions: {
      type: Object,
      default: () => {
        return {
          value: "", // 编辑器的值
          theme: "vs-dark", // 编辑器主题：vs, hc-black, or vs-dark，更多选择详见官网
          roundedSelection: false, // 右侧不显示编辑器预览框
          autoIndent: true // 自动缩进
        };
      }
    },
    height: {
      type: Number,
      default: 300
    }
  },
  mounted() {
    this.init();
  },
  methods: {
    init() {
      // 初始化container的内容，销毁之前生成的编辑器
      this.$refs.container.innerHTML = "";

      this.editorOptions = this.monacoOptions;
      // 生成编辑器对象
      this.monacoEditor = monaco.editor.create(
        this.$refs.container,
        this.editorOptions
      );
      // 编辑器内容发生改变时触发
      this.monacoEditor.onDidChangeModelContent(() => {
        this.$emit("change", this.monacoEditor.getValue());
        this.$emit("input", this.monacoEditor.getValue());
      });
    },
    // 供父组件调用手动获取值
    getVal() {
      return this.monacoEditor.getValue();
    }
  }
};
</script>
```

## 使用组件

```html
<template>
  <div>
      <monaco
        ref="monaco"
        @change="handleChange"
        :monacoOptions="monacoOptions"
        v-model="monacoOptions.value"
        :height="580"
      ></monaco>
  </div>
</template>
<script>
import monaco from "../../Manaco/manaco";
export default {
  name: "demo",
  data() {
    return {
      monacoOptions: {
        value: "",
        readOnly: false, // 是否只读
        language: "json", // 语言类型
        theme: "vs-dark" // 编辑器主题
      }
    };
  },
  components: {
    monaco
  },
  methods:{
    handleChange(val){
      console.log(val)
    }
  }
};
</script>
```
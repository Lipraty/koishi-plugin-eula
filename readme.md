# koishi-plugin-eula

[![npm](https://img.shields.io/npm/v/koishi-plugin-eula?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-eula) ![Rating](https://badge.koishi.chat/rating/koishi-plugin-eula)

为你的 Koishi bot 添加一个 EULA(End-user licence agreement)

## 普通用户直接使用

在插件市场中搜索 `eula` 点击添加即可。

## 开发扩展 eula 能力 (1.0+)

首先需要添加 eula 开发模式依赖：

``` shell
# yarn:

yarn add koishi-plugin-eula -d

# or use npm

npm i koishi-plugin-eula -d
```

并且可以在 `package.json` 中加入如下 koishi 字段来声明 eula 依赖：

``` json
//package.json

...
    "koishi": {
        ...,
        "service": {
            "required": [..., "eula"]
        },
        ...
    },
...
```

然后，在您的插件中引入类型依赖来获得类型提示

以及添加 using 引用来让 koishi 正确的加载插件顺序：

``` TypeScript
import {} from 'koishi-plugin-eula'

export const using = ['eula', ...]
```
最后，在您的插件中通过 `eula/before` 事件来获得 eula 状态，并根据状态自行调整：

``` TypeScript
ctx.on('eula/update', (argv: Argv, eula: boolean) => {
    //more core
})
```

经过如上方式便可在您的插件中使用 eula 流程，或者基于 eula 的认证能力扩展出更多的玩法。

## API

### 服务：eula

#### `ctx.eula.vertify()`

> 一般情况下，更推荐使用 `eula` 事件来获得认证状态，这将得到完整 Session 支持

验证该用户是否同意 `eula`

- userId: `number` 用户 id，即 session.user.id

### 扩展事件

事件：`eula/before`

命令触发 eula 流程**前**发生该事件

事件：`eula/update`

当用户回复 eula 后触发，这将传入一个 eula boolean 来告知用户同意与否

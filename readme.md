# koishi-plugin-eula

[![npm](https://img.shields.io/npm/v/koishi-plugin-eula?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-eula) ![Rating](https://badge.koishi.chat/rating/koishi-plugin-eula)

为你的 Koishi bot 添加一个 EULA(End-user licence agreement)

## 普通用户直接使用

在插件市场中搜索 `eula` 点击添加即可。

## 开发扩展 eula 能力 (1.0+)

> 这是一个在 1.x 版本才开始支持的特性，可以在 commits 中关注 1.0.0 版本 bump。

首先需要添加 eula 依赖：

``` shell
# yarn:

yarn add koishi-plugin-eula

# or use npm

npm i koishi-plugin-eula
```

且可以在 `package.json` 中加入如下 koishi 字段来声明 eula 依赖：

``` json
//package.json

...
    "koishi": {
        ...,
        "service": {
            "required": [
                "eula"
            ]
        },
        ...
    },
...
```

然后，在您的插件中引入类型依赖以及添加 using 引用来让 koishi 正确的加载插件顺序：

``` TypeScript
import {} from 'koishi-plugin-eula'

export const using = ['eula', ...]
```
最后，在您的插件中通过 `ctx.eula` 来获得 eula 状态：

``` TypeScript
function apply(ctx: Context, config: Config){
    ctx.command()...
        .action(({session}) => {
        if(ctx.eula.verify(session.user.id)){
            //more code...
        }
    })
    ...
}
```

经过如上方式便可在您的插件中单独使用 eula，或者基于 eula 的认证能力扩展出更多的玩法。

## Eula 服务

通过 `ctx.eula` 来访问

- #### `eula.verify(userId: number): boolean`

    传入 `user.id` 来获得该用户是否同意过 eula

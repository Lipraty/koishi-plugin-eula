import { Argv, Context, Schema, Service, Session } from 'koishi'
import { } from '@koishijs/plugin-help'

declare module 'koishi' {
  interface Context {
    eula: Eula
  }
}

class Eula extends Service {
  public readonly filter = false
  public readonly usage = Eula.usage

  constructor(ctx: Context, private config: Eula.Config) {
    super(ctx, 'eula')
    ctx.i18n.define('zh', require('./locales/zh'))

    ctx.before('attach-user', (session, fields) => {
      fields.add('authority')
    })

    ctx.before('command/execute', (_) => this.eula(_))

    ctx.command('eula', '最终用户许可协议', { authority: 0 })
      .userFields(['authority'])
      .action((_) => this.eula(_, true))
  }

  private async eula(argv: Argv, useCmd: boolean = false) {
    const session: Session<'authority'> = argv.session as Session<'authority'>
    if (session.user.authority === 1) {
      let accept: string
      if (this.config.accept.length > 1) {
        accept = this.config.accept[Math.round(Math.random() * this.config.accept.length)]
      } else {
        accept = this.config.accept[0] ?? session.text('eula.defaultAccept')
      }
      console.log(accept)
      await session.send(`
        <>
          <message id="{0}">${session.text('eula.eulaMessage.title', [this.config.alias])}</message>
          <message forward>
            <message id="{0}">${this.config.eula}</message>
            <message id="{0}">${session.text('eula.eulaMessage.confirm', [accept])}</message>
          </message>
        </>
      `)
      const prompt = await session.prompt(this.config.waitTime * 1000)
      if (prompt) {
        if (prompt === accept) {
          session.user.authority = 2
          return session.text('eula.acceptedMessage', [this.config.alias])
        }
        return session.text('eula.rejectMessage', [this.config.alias])
      } else return session.text('eula.timeout')
    }
  }

  /**
   * 验证该用户的 eula 认可情况
   * @param userId 用户 id，即 `session.user.id`
   */
  verify(userId: number){

  }
}

namespace Eula {
  export const usage = `
## 注意事项

> 建议使用前在 <a href="/database/user">dataview</a> 中修改自己权限等级为 2 及以上

本插件只用于体现 Koishi 部署者意志，即：“部署者仅对同意了《最终用户协议》的最终用户提供服务”。

对于部署者行为及所产生的任何纠纷， Koishi 及 koishi-plugin-eula 概不负责。

如果有更多文本内容想要修改，可以在<a href="/locales">本地化</a>中修改 zh 内容
`

  export interface Config {
    alias: string
    waitTime: number
    eula: string
    accept: string[]
  }

  export const Config: Schema<Config> = Schema.object({
    alias: Schema.string().default('EULA').description('《最终用户许可协议》别名，或其他自拟协议名称'),
    waitTime: Schema.number().min(30).max(300).step(1).default(60).description('等待回复时长，单位为 秒'),
    eula: Schema.string().role('textarea').description('协议内容'),
    accept: Schema.array(String).default(['同意']).description('认可协议关键字，如果有多个，则随机某一个作为认可关键字')
  })
}

export default Eula

import { Argv, Context, Schema, Session } from 'koishi'
import { } from '@koishijs/plugin-help'

export const name = 'eula'

export const filter = false

export const usage = `
## 注意事项

> 建议使用前在 <a href="/database/user">dataview</a> 中修改自己权限等级为 2 及以上

本插件只用于体现 Koishi 部署者意志，即：“部署者仅对同意了《最终用户协议》的最终用户提供服务”。

对于部署者行为及所产生的任何纠纷， Koishi 及 koishi-plugin-eula 概不负责。

如果有更多文本内容想要修改，可以在 本地化 中修改 zh 内容
`

export interface Config {
  alias: string
  waitTime: number
  eula: string
  accept: string[]
}

export const Config: Schema<Config> = Schema.object({
  alias: Schema.string().default('EULA').required().description('《最终用户许可协议》别名，或其他自拟协议名称'),
  waitTime: Schema.number().min(30).max(300).step(1).default(60).description('等待回复时长，单位为 秒'),
  eula: Schema.string().role('textarea').required().description('协议内容'),
  accept: Schema.array(String).default(['同意']).description('认可协议关键字，如果有多个，则随机某一个作为认可关键字')
})

export function apply(ctx: Context, cfg: Config) {
  ctx.i18n.define('zh', require('./locales/zh'))

  ctx.before('attach-user', (session, fields) => {
    fields.add('authority')
  })

  ctx.before('command/execute', eula)

  ctx.command('eula', { authority: 0 })
    .userFields(['authority'])
    .action((_) => eula(_, true))

  async function eula(_: Argv, cmd: boolean = false) {
    const session: Session<'authority'> = _.session as Session<'authority'>
    if (session.user.authority === 1) {
      let accept: string
      if (cfg.accept.length > 1) {
        accept = cfg.accept[Math.round(Math.random() * cfg.accept.length)]
      } else {
        accept = cfg.accept[0] ?? session.text('eula.defaultAccept')
      }
      session.send(session.text('eula.eulaMessage', [session.userId, cfg.alias, cfg.eula, accept]))
      const prompt = await session.prompt(cfg.waitTime * 1000)
      if (prompt) {
        if (prompt === accept) {
          session.user.authority = 2
          return session.text('eula.acceptedMessage', [cfg.alias])
        }
        return session.text('eula.rejectMessage', [cfg.alias])
      } else return session.text('eula.timeout')
    }
  }
}

import { Argv, Computed, Context, Schema, Service, Session } from 'koishi'
import { } from '@koishijs/plugin-help'
import { } from '@koishijs/plugin-rate-limit'

declare module 'koishi' {
  interface User {
    eula: boolean
  }

  interface Events {
    'eula/before'(argv: Argv): void
    'eula/update'(session: Session, eula: boolean): void
  }
}

class Eula extends Service {
  public readonly filter = false
  public readonly usage = Eula.usage

  constructor(ctx: Context, private config: Eula.Config) {
    super(ctx, 'eula', true)
    ctx.i18n.define('zh', require('./locales/zh'))

    ctx.model.extend('user', {
      eula: { type: 'boolean', initial: false }
    })

    ctx.before('attach-user', (session, fields) => {
      fields.add('eula')
    })

    ctx.before('command/execute', (_) => {
      const session = _.session as Session<'eula'>
      const authority = session.resolve(session.argv.command.config.authority)
      ctx.emit('eula/before', _)
      if (!session.user.eula && authority >= 1) this.eula(_)
    })

    ctx.command('eula', '最终用户许可协议', { authority: 0, })
      .action(this.eula)

    ctx.private().command('eulafix', 'eula Fixtool')
      .option('revise', '-r move old data', { authority: 5 })
      .option('master', '-M cheke my master', { authority: 4 })
      .userFields(['eula'])
      .action(async ({ session, options }) => {
        if (options.revise) {
          const userData = (await ctx.database.get('user', { authority: 2 }, ['id', 'authority', 'eula'])).map(userVal => {
            userVal['authority'] = 1
            userVal['eula'] = false
            return userVal
          })
          await ctx.database.upsert('user', userData, 'id')
          session.send(`Revised ${userData.length} old eula datas.`)
        }
        if (options.master) session.user.eula = true
      })
  }

  private async eula(argv: Argv) {
    const session = argv.session as Session<'eula'>
    let accept: string
    if (this.config.accept.length > 1) accept = this.config.accept[Math.round(Math.random() * this.config.accept.length)]
    else accept = this.config.accept[0] ?? session.text('eula.defaultAccept')
    await session.send(`
              <>
                <message id="{0}">${session.text('eula.eulaMessage.title', [this.config.alias])}</message>
                <message ${this.config.forwardMessgae ? 'forward' : ''}>
                  <message id="{0}">${this.config.eula}</message>
                  <message id="{0}">${session.text('eula.eulaMessage.confirm', [accept])}</message>
                </message>
              </>
            `)
    const prompt = await session.prompt(this.config.waitTime * 1000)
    if (prompt) {
      const accredita = prompt === accept
      session.user.eula = !accredita
      this.ctx.emit('eula/update', session, accredita)
      return session.text(`${accredita ? 'eula.acceptedMessage' : 'eula.rejectMessage'}`, [this.config.alias])
    } else return session.text('eula.timeout')
  }

  /**
   * 
   * @param userId 用户 id，即 session.user.id
   * @returns false: 该用户未同意 eula，true: 该用户已同意 eula
   */
  public async vertify(userId: number): Promise<boolean> {
    return (await this.ctx.database.get('user', { id: userId }, ['eula']))[0].eula
  }
}

namespace Eula {
  export const usage = `
## 注意事项

> 建议使用前在 <a href="/database/user">数据库</a> 中修改自己权限等级为 4 级及以上，并私聊机器人发送 \`eulafix --master\`。

本插件只用于体现 Koishi 部署者意志，即：“部署者仅对同意了《最终用户协议》的最终用户提供服务”。

对于部署者行为及所产生的任何纠纷， Koishi 及 koishi-plugin-eula 概不负责。

如果有更多文本内容想要修改，可以在<a href="/locales">本地化</a>中修改内容

## 0.x 升级注意

由于存在破坏性更新，请在使用前私聊机器人并发送 \`eulafix --revise\` 来将修改过的 2 级权限修正回 1 级（请确保自身权限为 5 级）
`

  export interface Config {
    alias: string
    waitTime: number
    eula: string
    forwardMessgae: boolean
    accept: string[]
  }

  export const Config: Schema<Config> = Schema.object({
    alias: Schema.string().default('EULA').description('《最终用户许可协议》别名，或其他自拟协议名称'),
    waitTime: Schema.number().min(30).max(300).step(1).default(60).description('等待回复时长，单位为 秒'),
    eula: Schema.string().role('textarea').description('协议内容'),
    forwardMessgae: Schema.boolean().default(true).description('合并发送的协议以及认可段（目前仅在 QQ 生效）'),
    accept: Schema.array(String).default(['同意']).description('认可协议关键字，如果有多个，则随机某一个作为认可关键字')
  })
}

export default Eula

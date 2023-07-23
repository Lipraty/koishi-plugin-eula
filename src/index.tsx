import { Argv, Context, Random, Schema, Service, Session, Logger, h } from 'koishi'
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
  private log: Logger

  constructor(ctx: Context, private configs: Eula.Config) {
    super(ctx, 'eula', true)
    ctx.i18n.define('zh', require('./locales/zh'))
    ctx.i18n.define('en', require('./locales/en'))
    this.log = ctx.logger('eula')

    ctx.model.extend('user', {
      eula: { type: 'boolean', initial: false }
    })

    ctx.before('attach-user', (session, fields) => {
      fields.add('eula')
      fields.add('authority')
    })

    ctx.before('command/execute', async (_) => {
      const session = _.session as Session<'eula' | 'authority'>
      const authority = session.resolve(session.argv.command.config.authority)
      ctx.emit('eula/before', _)
      if (!session.user.eula
        && authority > 0
        && session.user.authority <= configs.replyAuthority
        && _.command.name !== 'eula')
        if (configs.enable
          || (!configs.model && !configs.commands.includes(_.command.name))
          || (configs.model && configs.commands.includes(_.command.name)))
          return await this.eula(_)
    })

    ctx.command('eula', '最终用户许可协议', { authority: 0, })
      .action((_) => this.eula(_))
  }

  private async eula(argv: Argv) {
    const session = argv.session as Session<'eula'>
    const accept: string = Random.pick(this.configs.accept) ?? session.text('eula.defaultAccept')
    await session.send(
      <>
        <message id="{0}">
          <i18n path="eula.eulaMessage.title">{[this.configs.alias]}</i18n>
        </message>
        <message forward={this.configs.forwardMessgae}>
          <message id="{0}">
            <i18n path="eula.eulaMessage.text"></i18n>
          </message>
          <message id="{0}"><i18n path="eula.eulaMessage.confirm">{[accept]}</i18n></message>
        </message>
      </>
    )
    const prompt = await session.prompt(this.configs.waitTime * 1000)
    this.log.info(`[platfrom: ${session.platform}]user ${session.userId} reply to (${prompt}) eula`)
    if (prompt) {
      const promptEle = h.parse(prompt)
      if(promptEle[0].type === 'at' && promptEle[0].attrs!.id === session.bot.selfId)
        promptEle.shift() // remove `at` element
      const accredit = (promptEle[0].attrs.content as string).replace(/^\//g, '').trim() === accept
      session.user.eula = accredit
      this.ctx.emit('eula/update', session, accredit)
      return session.text(`${accredit ? 'eula.acceptedMessage' : 'eula.rejectMessage'}`, [this.configs.alias])
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

本插件只用于体现 Koishi 部署者意志，即：“部署者仅对同意了《最终用户协议》的最终用户提供服务”。

对于部署者行为及所产生的任何纠纷， Koishi 及 koishi-plugin-eula 概不负责。

协议内容文本可以在 <a href="/locales/eula/eulaMessage">本地化 - eula.eulaMessage</a> 中修改，因此你可以根据不同语言给予不同的协议文本。
`

  export interface Config {
    waitTime: number
    forwardMessgae: boolean
    replyAuthority: number
    alias: string
    accept: string[]
    enable: boolean
    model?: boolean
    commands?: string[]
  }

  export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
      waitTime: Schema.number().min(30).max(300).step(1).default(60).description('等待回复时长（秒）'),
      replyAuthority: Schema.number().min(1).max(5).default(1).description('协议生效最高等级'),
      forwardMessgae: Schema.boolean().default(true).description('合并发送的协议以及认可段（目前仅在 QQ 生效）')
    }).description('基本设置'),
    Schema.object({
      alias: Schema.string().default('EULA').description('《最终用户许可协议》别名，或其他自拟协议名称'),
      accept: Schema.array(String).description('认可协议关键字，如果有多个，则随机某一个作为认可关键字')
    }).description('协议设置'),
    Schema.intersect([
      Schema.object({
        enable: Schema.boolean().default(true).description('限制所有的命令')
      }),
      Schema.union([
        Schema.object({
          enable: Schema.const(false).required(),
          model: Schema.union([
            Schema.const(true).description('白名单'),
            Schema.const(false).description('黑名单'),
          ]).description('限制命令的模式'),
          commands: Schema.array(String).description('指令列表')
        }),
        Schema.object({})
      ])
    ]).description('指令限制')
  ]) as Schema<Config>
}

export default Eula

import { InjectRepository } from "@nestjs/typeorm";
import { Message } from "discord.js";
import { CommandLine, CommandLineClass } from "src/bot/base/command.base";
import { TABLE } from "src/bot/constants/table";
import { Channel } from "src/bot/models/channel.entity";
import { Msg } from "src/bot/models/msg.entity";
import { TX8 } from "src/bot/models/tx8.entity";
import { User } from "src/bot/models/user.entity";
import { KomubotrestService } from "src/bot/utils/komubotrest/komubotrest.service";
import { UtilsService } from "src/bot/utils/utils.service";
import { Repository } from "typeorm";

@CommandLine({
  name: "tx8",
  description: "YEP lucky draw",
  cat: "komu",
})
export class Tx8Command implements CommandLineClass {
  constructor(
    private komubotrestService: KomubotrestService,
    @InjectRepository(TX8)
    private readonly tx8Repository: Repository<TX8>,
    @InjectRepository(Msg)
    private readonly msgRepository: Repository<Msg>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>
  ) {}
  async execute(message: Message, args, client, authorId) {
    try {
      const userId = message.author.id;

      if (args.length == 0) {
        return message
          .reply({
            content: "```please add your lucky draw number (100 - 999)```",
          })
          .catch((err) => {
            this.komubotrestService.sendErrorToDevTest(client, authorId, err);
          });
      }

      if (args.length == 1 && args[0] != "draw") {
        const tx8Number = args[0];

        if (
          isNaN(tx8Number) ||
          tx8Number >>> 0 !== parseFloat(tx8Number) ||
          tx8Number < 100 ||
          tx8Number > 999
        ) {
          message
            .reply({
              content: "Please enter a number between 100 and 999",
            })
            .catch((err) => {
              this.komubotrestService.sendErrorToDevTest(client, authorId, err);
            });
          return;
        }

        const userInsert = await this.userRepository.findOne({
          where: {
            userId: userId,
          },
        });
        const channelInsert = await this.channelRepository.findOne({
          where: {
            id: message.channelId,
          },
        });
        let msgData;
        msgData = await this.msgRepository.findOne({
          where: {
            id: message.id,
          },
        });
        if (!msgData) {
          const msgInsert = await this.msgRepository.insert({
            channel: channelInsert,
            guildId: message.guildId,
            deleted: message.deletable,
            id: message.id,
            createdTimestamp: message.createdTimestamp,
            type: message.type as any,
            system: message.system,
            content: message.content,
            author: userInsert,
            pinned: message.pinned,
            tts: message.tts,
            nonce: message.nonce as string,
            editedTimestamp: message.editedTimestamp,
            webhookId: message.webhookId,
            applicationId: message.applicationId,
            flags: message.flags as any as number,
          });
          msgData = await this.msgRepository.findOne({
            where: {
              id: message.id,
            },
          });
        }

        await this.tx8Repository.insert({
          message: msgData,
          user: userInsert,
          tx8number: tx8Number,
          status: "pending",
          createdTimestamp: message.createdTimestamp,
        });
        message
          .reply({
            content: "`✅` Lucky number saved.",
          })
          .catch((err) => {
            this.komubotrestService.sendErrorToDevTest(client, authorId, err);
          });
        return;
      }

      // if (
      //   userId != "694732284116598797" &&
      //   userId != "922148445626716182" &&
      //   args[0] == "draw"
      // ) {
      //   message
      //     .reply({
      //       content: "```You are not allowed to use this command.```",
      //     })
      //     .catch((err) => {
      //       this.komubotrestService.sendErrorToDevTest(client, authorId, err);
      //     });
      //   return;
      // }

      if (args[0] == "draw") {
        const now = new Date();
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const starttime = startOfDay.getTime() + 8 * 3600000;
        const endtime = starttime + 12 * 3600000;

        const data = await this.tx8Repository
          .createQueryBuilder("tx8")
          .innerJoinAndSelect("tx8.user", "user")
          .where(`"status" = :status`, { status: "pending" })
          .andWhere(`"createdTimestamp" >= :gtecreatedTimestamp`, {
            gtecreatedTimestamp: starttime,
          })
          .andWhere(`"createdTimestamp" <= :ltecreatedTimestamp`, {
            ltecreatedTimestamp: endtime,
          })
          .andWhere(`"tx8number" > :gttx8number`, {
            gttx8number: 99,
          })
          .andWhere(`"tx8number" < :lttx8number`, {
            lttx8number: 1000,
          })
          // .groupBy("tx8.id")
          .addGroupBy("user.userId")
          // .addGroupBy("tx8.tx8number")
          // .addGroupBy("tx8.createdTimestamp")
          .orderBy("tx8.createdTimestamp", "ASC")
          .select("*")
          .addSelect("LAST(user)", "lastId")
          .execute();

        if (data.length == 0) {
          message
            .reply({
              content: "```No lucky number found```",
            })
            .catch((err) => {
              this.komubotrestService.sendErrorToDevTest(client, authorId, err);
            });
          return;
        }
        const rndNumber = Math.floor(Math.random() * data.length);
        const tx8Number = data[rndNumber].tx8number;

        const user = await this.userRepository
          .find({ where: { userId: data[rndNumber].userId } })
          .catch(console.error);
        await this.tx8Repository
          .createQueryBuilder("tx8")
          .update(TX8)
          .where(`"author" = :author`, { author: data[rndNumber].userId })
          .set({
            status: "done",
          })
          .execute();
        message
          .reply({
            content: `\`🎉\` Lucky number is \`${tx8Number}\` by \`${data[rndNumber].email}\``,
          })
          .catch((err) => {
            this.komubotrestService.sendErrorToDevTest(client, authorId, err);
          });
      }
    } catch (err) {
      console.log(err);
      message
        .reply({
          content: "```Error```",
        })
        .catch((err) => {
          this.komubotrestService.sendErrorToDevTest(client, authorId, err);
        });
    }
  }
}

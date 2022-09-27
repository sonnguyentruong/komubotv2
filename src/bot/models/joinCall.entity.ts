import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { TABLE } from "../constants/table";

@Entity(TABLE.JOIN_CALL)
export class JoinCall {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  channelId: string;

  @Column({ nullable: false })
  userId: string;

  @Column({ nullable: false })
  title: string;

  @Column({ nullable: false })
  status: string;

  @Column({ type: "decimal" })
  start_time: number;

  @Column({ type: "decimal" })
  end_time: number;
}

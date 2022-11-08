import {
  DataType,
  Column,
  Model,
  Table,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
} from "sequelize-typescript"

import { Launches } from "@database/models/Launches"
import { Site } from "@database/models/Site"
import { User } from "@database/models/User"

@Table({ tableName: "redirections", paranoid: true })
export class Redirections extends Model {
  @Column({
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    type: DataType.BIGINT,
  })
  id!: number

  @ForeignKey(() => Launches)
  @Column
  @BelongsTo(() => Launches, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  })
  launchId!: number

  @Column({
    allowNull: false,
    type: DataType.ENUM("A", "CNAME"),
  })
  type!: string

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  target!: string

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  source!: string

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}

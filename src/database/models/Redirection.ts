import {
  DataType,
  Column,
  Model,
  Table,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  DeletedAt,
} from "sequelize-typescript"

import { Launch } from "@root/database/models/Launch"

@Table({ tableName: "redirections", paranoid: true })
export class Redirection extends Model {
  @Column({
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    type: DataType.BIGINT,
  })
  id!: number

  @ForeignKey(() => Launch)
  @Column
  launchId!: number

  @BelongsTo(() => Launch, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  })
  launch!: Launch

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

  @DeletedAt
  deletedAt!: Date
}

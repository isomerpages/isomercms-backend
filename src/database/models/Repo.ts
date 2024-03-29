import {
  DataType,
  Column,
  Model,
  Table,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript"

import { Site } from "@database/models/Site"

@Table({ tableName: "repos", paranoid: true })
export class Repo extends Model {
  @Column({
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    type: DataType.BIGINT,
  })
  id!: number

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  name!: string

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  url!: string

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date

  @DeletedAt
  deletedAt?: Date

  @ForeignKey(() => Site)
  siteId!: number

  @BelongsTo(() => Site)
  site!: Site
}

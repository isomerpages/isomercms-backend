import {
  DataType,
  Column,
  Model,
  Table,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  BelongsToMany,
  HasOne,
  BelongsTo,
  ForeignKey,
} from "sequelize-typescript"

import { Site } from "@database/models/Site"
import { SiteMember } from "@database/models/SiteMember"
import { User } from "@database/models/User"

@Table({ tableName: "notifications" })
export class Notification extends Model {
  @Column({
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    type: DataType.BIGINT,
  })
  id!: number

  @ForeignKey(() => SiteMember)
  siteMemberId!: number

  @BelongsTo(() => SiteMember)
  siteMember!: SiteMember

  @ForeignKey(() => Site)
  siteId!: number

  @BelongsTo(() => Site)
  site!: Site

  @ForeignKey(() => User)
  userId!: number

  @BelongsTo(() => User)
  user!: Site

  @Column({
    allowNull: true,
    type: DataType.TEXT,
  })
  message!: string

  @Column({
    allowNull: true,
    type: DataType.TEXT,
  })
  link!: string

  @Column({
    allowNull: true,
    type: DataType.TEXT,
  })
  sourceUsername!: string

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  type!: string

  @Column({
    allowNull: true,
    type: DataType.DATE,
  })
  firstReadTime!: Date | null

  @Column({
    allowNull: false,
    type: DataType.BIGINT,
  })
  priority!: number

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}

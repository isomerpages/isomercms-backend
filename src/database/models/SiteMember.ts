import {
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
  UpdatedAt,
} from "sequelize-typescript"

import {
  CollaboratorRoles,
  CollaboratorRolesWithoutIsomerAdmin,
} from "@constants/index"

import { Notification } from "@database/models/Notification"
import { Site } from "@database/models/Site"
import { User } from "@database/models/User"

@Table({ tableName: "site_members" })
export class SiteMember extends Model {
  @Column({
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    type: DataType.BIGINT,
  })
  id!: number

  @ForeignKey(() => User)
  @Column
  userId!: number

  @ForeignKey(() => Site)
  @Column
  siteId!: string

  @Column({
    allowNull: false,
    type: DataType.ENUM("ADMIN", "CONTRIBUTOR"),
  })
  role!: CollaboratorRolesWithoutIsomerAdmin

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date

  @BelongsTo(() => Site)
  site!: Site

  @BelongsTo(() => User)
  user!: User

  @HasMany(() => Notification)
  notifications?: Notification[]
}

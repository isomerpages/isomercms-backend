import {
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  Table,
  UpdatedAt,
} from "sequelize-typescript"

import { Site } from "@database/models/Site"
import { User } from "@database/models/User"

@Table({ tableName: "site_members" })
export class SiteMember extends Model {
  @ForeignKey(() => User)
  @Column
  userId!: number

  @ForeignKey(() => Site)
  @Column
  siteId!: string

  @Column({
    allowNull: false,
    type: DataType.ENUM("ADMIN", "USER"),
  })
  role!: string

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}

import {
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  Table,
  UpdatedAt,
} from "sequelize-typescript"

import { User } from "@database/models/User"

@Table({ tableName: "isomer_admins" })
export class IsomerAdmin extends Model {
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

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date
}

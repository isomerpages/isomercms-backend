import {
  DataType,
  Column,
  Model,
  Table,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  DeletedAt,
} from "sequelize-typescript"

import { Site } from "@database/models/Site"
import { User } from "@database/models/User"

@Table({ tableName: "launches", paranoid: true })
export class Launches extends Model {
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
  @Column({
    unique: true,
  })
  siteId!: number

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  primaryDomainSource!: string

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  primaryDomainTarget!: string

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  domainValidationSource!: string

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  domainValidationTarget!: string

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date

  @DeletedAt
  deletedAt!: Date
}

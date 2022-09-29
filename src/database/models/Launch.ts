import {
  DataType,
  Column,
  Model,
  Table,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  HasMany,
} from "sequelize-typescript"

import { Site } from "@database/models/Site"
import { User } from "@database/models/User"
import { Redirection } from "@root/database/models/Redirection"

@Table({ tableName: "launches", paranoid: true })
export class Launch extends Model {
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

  @BelongsTo(() => User, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  })
  user!: User

  @ForeignKey(() => Site)
  @Column
  siteId!: number

  @BelongsTo(() => Site, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  })
  site!: Site

  @HasMany(() => Redirection)
  redirections?: Redirection[]

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
}

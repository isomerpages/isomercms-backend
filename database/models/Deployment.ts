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

import { Site } from "./Site"

@Table({ tableName: "deployments", paranoid: true })
export class Deployment extends Model {
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
  productionUrl!: string

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  stagingUrl!: string

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

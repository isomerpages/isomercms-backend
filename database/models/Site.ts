import {
  DataType,
  Column,
  Model,
  Table,
  CreatedAt,
  UpdatedAt,
  BelongsToMany,
} from "sequelize-typescript"

import { SiteMember } from "./SiteMember"
import { User } from "./User"

@Table({ tableName: "sites" })
export class Site extends Model {
  @Column({
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    type: DataType.BIGINT,
  })
  id!: number

  @Column({
    unique: true,
    allowNull: false,
    type: DataType.TEXT,
  })
  repositoryName!: string

  @Column({
    type: DataType.TEXT,
  })
  createdBy!: string | null

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date

  @Column({
    type: DataType.TEXT,
  })
  agency!: string | null

  @Column({
    type: DataType.TEXT,
  })
  siteName!: string | null

  @Column({
    type: DataType.TEXT,
  })
  contact!: string | null

  @Column({
    type: DataType.TEXT,
  })
  repositoryUrl!: string | null

  @Column({
    type: DataType.TEXT,
  })
  hostingId!: string | null

  @Column({
    type: DataType.TEXT,
  })
  stagingUrl!: string | null

  @Column({
    type: DataType.TEXT,
  })
  productionUrl!: string | null

  @Column({
    type: DataType.TEXT,
  })
  liveDomain!: string | null

  @Column({
    type: DataType.JSONB,
  })
  redirectFrom: unknown | null

  @Column({
    type: DataType.TEXT,
  })
  uptimeId!: string | null

  @Column({
    type: DataType.TEXT,
  })
  uptimeUrl!: string | null

  @Column({
    type: DataType.DATE,
  })
  launchedAt!: Date | null

  @Column({
    type: DataType.TEXT,
  })
  launchedBy!: string | null

  @BelongsToMany(() => User, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
    through: () => SiteMember,
  })
  users!: User[]
}

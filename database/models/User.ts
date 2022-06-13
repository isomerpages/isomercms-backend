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
} from "sequelize-typescript"

import { Site } from "./Site"
import { SiteMember } from "./SiteMember"

@Table({ tableName: "users", paranoid: true })
export class User extends Model {
  @Column({
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
    type: DataType.BIGINT,
  })
  id!: number

  @Column({
    allowNull: true,
    unique: true,
    type: DataType.TEXT,
  })
  email?: string | null

  @Column({
    allowNull: false,
    unique: true,
    type: DataType.TEXT,
    validate: {
      notEmpty: true,
    },
  })
  githubId!: string

  @Column({
    allowNull: true,
    type: DataType.STRING(255),
  })
  contactNumber?: string | null

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  lastLoggedIn!: Date

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date

  @DeletedAt
  deletedAt?: Date

  @BelongsToMany(() => User, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
    through: () => SiteMember,
  })
  sites!: Site[]

  @HasOne(() => Site)
  siteCreated?: Site
}

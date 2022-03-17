import {
  DataType,
  Column,
  Model,
  Table,
  CreatedAt,
  UpdatedAt,
  BelongsToMany,
} from "sequelize-typescript"

import { Site } from "./Site"
import { SiteMember } from "./SiteMember"

@Table({ tableName: "users" })
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
    validate: {
      isEmail: true,
    },
  })
  email!: string

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
  contactNumber!: string

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  lastLoggedIn!: Date

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date

  @BelongsToMany(() => User, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
    through: () => SiteMember,
  })
  sites!: Site[]
}

import {
  DataType,
  Column,
  Model,
  Table,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  BelongsToMany,
  HasMany,
} from "sequelize-typescript"

import { Notification } from "@database/models/Notification"
import { Site } from "@database/models/Site"
import { SiteMember } from "@database/models/SiteMember"

import { ReviewRequest } from "./ReviewRequest"

@Table({ tableName: "users", paranoid: true })
// eslint-disable-next-line import/prefer-default-export
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
    allowNull: true,
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

  @BelongsToMany(() => Site, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
    through: () => SiteMember,
    as: "site_members",
  })
  sites!: Array<Site & { SiteMember: SiteMember }>

  @HasMany(() => Site, {
    as: "sites_created",
  })
  sitesCreated?: Site[]

  @HasMany(() => ReviewRequest)
  reviewRequests?: ReviewRequest[]
}

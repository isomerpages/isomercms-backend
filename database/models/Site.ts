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
  BelongsTo,
  ForeignKey,
} from "sequelize-typescript"

import { SiteStatus, JobStatus } from "../../constants"

import { Deployment } from "./Deployment"
import { Repo } from "./Repo"
import { SiteMember } from "./SiteMember"
import { User } from "./User"

@Table({ tableName: "sites", paranoid: true })
export class Site extends Model {
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
  name!: string

  @Column({
    allowNull: false,
    type: DataType.TEXT,
  })
  apiTokenName!: string

  @Column({
    allowNull: false,
    type: DataType.ENUM(...Object.values(SiteStatus)),
    defaultValue: SiteStatus.Init,
  })
  siteStatus!: SiteStatus

  @Column({
    allowNull: false,
    type: DataType.ENUM(...Object.values(JobStatus)),
    defaultValue: JobStatus.Ready,
  })
  jobStatus!: JobStatus

  @CreatedAt
  createdAt!: Date

  @UpdatedAt
  updatedAt!: Date

  @DeletedAt
  deletedAt!: Date

  @BelongsToMany(() => User, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
    through: () => SiteMember,
  })
  users!: User[]

  @HasOne(() => Repo)
  repo?: Repo

  @HasOne(() => Deployment)
  deployment?: Deployment

  @ForeignKey(() => User)
  creatorId!: number

  @BelongsTo(() => User)
  creator!: User
}

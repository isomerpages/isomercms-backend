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

import { SiteStatus, JobStatus } from "@constants/index"

import { Deployment } from "@database/models/Deployment"
import { Launch } from "@database/models/Launches"
import { Repo } from "@database/models/Repo"
import { SiteMember } from "@database/models/SiteMember"
import { User } from "@database/models/User"

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
    defaultValue: SiteStatus.Empty,
  })
  siteStatus!: SiteStatus

  @Column({
    allowNull: false,
    type: DataType.ENUM(...Object.values(JobStatus)),
    defaultValue: JobStatus.Running,
  })
  jobStatus!: JobStatus

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
  users!: User[]

  @HasOne(() => Repo)
  repo?: Repo

  @HasOne(() => Deployment)
  deployment?: Deployment

  @ForeignKey(() => User)
  creatorId!: number

  @BelongsTo(() => User)
  creator!: User

  @HasOne(() => Launch)
  launch?: Launch
}
